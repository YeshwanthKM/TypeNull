import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ApplicationDocument, DocumentCategory, DocumentUploadOptions } from '../types';

/**
 * TypeNull Secure Document Storage & Metadata Service
 *
 * Bucket: 'application-documents' (Private)
 * Path Structure: {userId}/{applicationId}/{uniqueFileId}.{ext}
 * Enforces Row-Level Security (RLS) and storage object policies.
 */

export const STORAGE_BUCKET = 'application-documents';
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};

export interface FileValidationError {
  code: 'TYPE_NOT_ALLOWED' | 'SIZE_EXCEEDED' | 'HEIC_UNSUPPORTED' | 'EMPTY_FILE';
  message: string;
}

/**
 * Validate file extension and MIME type before transmission
 */
export function validateDocumentFile(file: File): { isValid: boolean; error?: FileValidationError } {
  if (!file || file.size === 0) {
    return {
      isValid: false,
      error: {
        code: 'EMPTY_FILE',
        message: 'The selected file is empty. Please choose a valid document.',
      },
    };
  }

  // Reject HEIC / HEIF with informative explanation
  const lowerName = file.name.toLowerCase();
  if (
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  ) {
    return {
      isValid: false,
      error: {
        code: 'HEIC_UNSUPPORTED',
        message:
          'Apple HEIC/HEIF images cannot be reliably rendered across web browsers. Please convert this photo to JPG or PNG before uploading.',
      },
    };
  }

  // Check file size (10 MB limit)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: {
        code: 'SIZE_EXCEEDED',
        message: `File size (${sizeMb} MB) exceeds the 10 MB maximum limit. Please compress or optimize the file.`,
      },
    };
  }

  // Check MIME type & extension
  const ext = lowerName.split('.').pop() || '';
  const validExtensions = ALLOWED_MIME_TYPES[file.type];
  const hasValidExt = ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
  const hasValidMime = Boolean(validExtensions);

  if (!hasValidExt || !hasValidMime) {
    return {
      isValid: false,
      error: {
        code: 'TYPE_NOT_ALLOWED',
        message:
          'Unsupported file format. TypeNull accepts PDF documents, JPG, and PNG images only.',
      },
    };
  }

  return { isValid: true };
}

/**
 * Format bytes to readable string (e.g. 2.4 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Upload a document to private Supabase Storage and record metadata in PostgreSQL
 */
export async function uploadApplicationDocument({
  applicationId,
  userId,
  file,
  documentType,
}: DocumentUploadOptions): Promise<{ data: ApplicationDocument | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: new Error('Supabase is not configured. Real document uploads require active credentials.'),
    };
  }

  const validation = validateDocumentFile(file);
  if (!validation.isValid && validation.error) {
    return { data: null, error: new Error(validation.error.message) };
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const uniqueId = crypto.randomUUID();
  const storagePath = `${userId}/${applicationId}/${uniqueId}.${fileExt}`;

  try {
    // 1. Upload to Supabase Storage bucket
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return {
        data: null,
        error: new Error(
          `Storage upload failed: ${uploadError.message}. Ensure the 'application-documents' storage bucket exists in Supabase.`
        ),
      };
    }

    // 2. Insert metadata record in application_documents table
    const { data: docData, error: dbError } = await supabase
      .from('application_documents')
      .insert({
        application_id: applicationId,
        user_id: userId,
        original_filename: file.name,
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        file_size_bytes: file.size,
        document_type: documentType,
        processing_status: 'uploaded',
      })
      .select()
      .single();

    // 3. Rollback storage object if database metadata insert fails
    if (dbError) {
      console.warn(
        `[TypeNull] Metadata insert failed. Cleaning up orphaned storage object: ${storagePath}`
      );
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return {
        data: null,
        error: new Error(`Document metadata recording failed: ${dbError.message}`),
      };
    }

    return { data: docData as ApplicationDocument, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch all documents associated with an application (bounded by RLS)
 */
export async function fetchApplicationDocuments(
  applicationId: string
): Promise<{ data: ApplicationDocument[]; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: new Error('Supabase is not configured.') };
  }

  try {
    const { data, error } = await supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as ApplicationDocument[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Create a short-lived signed URL for viewing or downloading a private document
 *
 * Expiration defaults to 15 minutes (900 seconds). Never persist signed URLs in DB.
 */
export async function createDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds = 900,
  downloadFilename?: string
): Promise<{ signedUrl: string | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase is not configured.') } as any;
  }

  try {
    const options: { download?: string | boolean } = {};
    if (downloadFilename) {
      options.download = downloadFilename;
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds, options);

    if (error || !data) {
      return { signedUrl: null, error: new Error(error?.message || 'Failed to generate signed URL.') };
    }

    return { signedUrl: data.signedUrl, error: null };
  } catch (err) {
    return { signedUrl: null, error: err as Error };
  }
}

/**
 * Delete a document from database metadata and storage bucket
 */
export async function deleteApplicationDocument(
  doc: ApplicationDocument
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  try {
    // 1. Delete from database
    const { error: dbError } = await supabase
      .from('application_documents')
      .delete()
      .eq('id', doc.id);

    if (dbError) {
      return { error: new Error(`Failed to remove document record: ${dbError.message}`) };
    }

    // 2. Delete from storage bucket
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.storage_path]);

    if (storageError) {
      console.warn(`[TypeNull] Storage object removal warning: ${storageError.message}`);
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Update document category in metadata
 */
export async function updateDocumentCategory(
  docId: string,
  category: DocumentCategory
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  try {
    const { error } = await supabase
      .from('application_documents')
      .update({
        document_type: category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}
