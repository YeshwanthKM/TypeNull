/**
 * Safe Bulk Archive & Folder Intake Utility
 *
 * Implements strict path-traversal sanitization, MIME-type verification,
 * file size caps, and per-applicant folder grouping.
 */

export interface BulkApplicantDossier {
  applicantIdentifier: string;
  files: File[];
  totalSizeBytes: number;
}

export interface BulkIntakeResult {
  dossiers: BulkApplicantDossier[];
  warnings: string[];
  totalFiles: number;
  totalBytes: number;
}

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_TOTAL_BATCH_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_TOTAL_FILES = 150;

/**
 * Strips path traversal sequences (../, .\, absolute roots) and returns a clean, safe path
 */
export function sanitizePath(rawPath: string): string {
  return rawPath
    .replace(/\\/g, '/') // normalize slashes
    .replace(/\.\.+[/\\]?/g, '') // remove parent directory traversals
    .replace(/^[/\\]+/, '') // strip leading root slashes
    .trim();
}

/**
 * Validates file extension
 */
export function isAllowedFileType(filename: string): boolean {
  const lower = filename.toLowerCase();
  for (const ext of ALLOWED_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Processes files dropped or selected from a multi-file or folder input
 */
export function processFolderUpload(fileList: FileList | File[]): BulkIntakeResult {
  const files = Array.from(fileList);
  const warnings: string[] = [];
  const dossierMap = new Map<string, File[]>();
  let totalBytes = 0;

  if (files.length > MAX_TOTAL_FILES) {
    warnings.push(
      `Batch contains ${files.length} files. Exceeded maximum batch limit of ${MAX_TOTAL_FILES}. Excess files were excluded.`
    );
  }

  const filesToProcess = files.slice(0, MAX_TOTAL_FILES);

  for (const file of filesToProcess) {
    const relativePath = sanitizePath(
      (file as any).webkitRelativePath || file.name
    );

    // Check size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      warnings.push(
        `File "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 15MB limit. Skipped.`
      );
      continue;
    }

    if (totalBytes + file.size > MAX_TOTAL_BATCH_BYTES) {
      warnings.push(
        `Cumulative batch size exceeds 100MB ceiling. File "${file.name}" was not ingested.`
      );
      continue;
    }

    // Check extension
    if (!isAllowedFileType(file.name)) {
      warnings.push(
        `File "${file.name}" has an unsupported format. Only PDF, PNG, and JPG documents are accepted.`
      );
      continue;
    }

    totalBytes += file.size;

    // Identify applicant folder
    const pathParts = relativePath.split('/').filter(Boolean);
    let applicantId = 'applicant_default';

    if (pathParts.length > 1) {
      // e.g. "batch_folder/applicant_01/doc.pdf" -> applicant_01
      // or "applicant_01/doc.pdf" -> applicant_01
      applicantId = pathParts[pathParts.length - 2];
    } else {
      // Single file dropped without folder: derive identifier from filename prefix
      const base = file.name.split('.')[0];
      applicantId = base.split('_')[0] || 'applicant_intake';
    }

    // Sanitize applicant identifier (alphanumeric, dashes, underscores)
    const cleanApplicantId = applicantId
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim() || 'applicant_intake';

    const existing = dossierMap.get(cleanApplicantId) || [];
    existing.push(file);
    dossierMap.set(cleanApplicantId, existing);
  }

  const dossiers: BulkApplicantDossier[] = Array.from(dossierMap.entries()).map(
    ([applicantIdentifier, dossierFiles]) => ({
      applicantIdentifier,
      files: dossierFiles,
      totalSizeBytes: dossierFiles.reduce((acc, f) => acc + f.size, 0),
    })
  );

  return {
    dossiers,
    warnings,
    totalFiles: filesToProcess.length,
    totalBytes,
  };
}

/**
 * Minimal Safe In-Browser PKZIP Unpacker
 * Reads standard ZIP files using DataView and browser DecompressionStream.
 */
export async function unpackZipArchive(zipFile: File): Promise<BulkIntakeResult> {
  const warnings: string[] = [];
  const buffer = await zipFile.arrayBuffer();
  const view = new DataView(buffer);
  const textDecoder = new TextDecoder('utf-8');

  // Verify PK0304 signature
  if (view.byteLength < 4 || view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('Invalid or corrupted ZIP archive. PKZIP header signature not found.');
  }

  const extractedFiles: File[] = [];
  let offset = 0;

  while (offset + 30 <= view.byteLength) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) {
      // Reached Central Directory or end of local entries
      break;
    }

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const filenameLen = view.getUint16(offset + 26, true);
    const extraFieldLen = view.getUint16(offset + 28, true);

    const nameOffset = offset + 30;
    const rawFilename = textDecoder.decode(
      new Uint8Array(buffer, nameOffset, filenameLen)
    );
    const safeFilename = sanitizePath(rawFilename);

    const dataOffset = nameOffset + filenameLen + extraFieldLen;
    offset = dataOffset + compressedSize;

    // Skip directories
    if (safeFilename.endsWith('/') || safeFilename === '') {
      continue;
    }

    // Safety checks
    if (!isAllowedFileType(safeFilename)) {
      warnings.push(`ZIP entry "${safeFilename}" skipped: unsupported format.`);
      continue;
    }

    if (uncompressedSize > MAX_FILE_SIZE_BYTES) {
      warnings.push(`ZIP entry "${safeFilename}" skipped: exceeds 15MB limit.`);
      continue;
    }

    const compressedBytes = new Uint8Array(buffer, dataOffset, compressedSize);
    let decompressedBytes: Uint8Array;

    if (compressionMethod === 0) {
      // Stored (no compression)
      decompressedBytes = compressedBytes;
    } else if (compressionMethod === 8) {
      // Deflate compression: use browser DecompressionStream
      try {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedBytes);
        writer.close();

        const response = new Response(ds.readable);
        const ab = await response.arrayBuffer();
        decompressedBytes = new Uint8Array(ab);
      } catch (err) {
        warnings.push(`Failed to decompress ZIP entry "${safeFilename}".`);
        continue;
      }
    } else {
      warnings.push(
        `ZIP entry "${safeFilename}" uses unsupported compression method ${compressionMethod}.`
      );
      continue;
    }

    // Determine MIME type
    const lowerName = safeFilename.toLowerCase();
    let mimeType = 'application/pdf';
    if (lowerName.endsWith('.png')) mimeType = 'image/png';
    else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mimeType = 'image/jpeg';

    const file = new File([decompressedBytes as unknown as BlobPart], safeFilename.split('/').pop() || safeFilename, {
      type: mimeType,
    });
    // Attach webkitRelativePath for grouping
    Object.defineProperty(file, 'webkitRelativePath', {
      value: safeFilename,
      writable: false,
    });

    extractedFiles.push(file);

    if (extractedFiles.length >= MAX_TOTAL_FILES) {
      warnings.push(`ZIP archive exceeds maximum file count limit (${MAX_TOTAL_FILES}).`);
      break;
    }
  }

  const result = processFolderUpload(extractedFiles);
  result.warnings.unshift(...warnings);
  return result;
}
