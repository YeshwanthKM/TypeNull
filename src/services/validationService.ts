import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ScreeningBatch,
  ValidationFinding,
  ValidationRun,
} from '../types';

/**
 * Persists a validation run to Supabase PostgreSQL or returns gracefully if not configured
 */
export async function saveValidationRun(
  userId: string,
  run: ValidationRun
): Promise<{ data: ValidationRun | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    // Return the run as is for offline/in-memory use
    return { data: run, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('validation_runs')
      .insert({
        application_id: run.applicationId,
        user_id: userId,
        category: run.category,
        outcome: run.outcome,
        counts: run.counts,
        findings: run.findings,
      })
      .select()
      .single();

    if (error) {
      console.warn('[TypeNull] Validation run persist warning:', error.message);
      return { data: run, error: null };
    }

    return {
      data: {
        ...run,
        id: data.id,
        validatedAt: data.created_at,
      },
      error: null,
    };
  } catch (err: any) {
    console.warn('[TypeNull] Validation run insert exception:', err);
    return { data: run, error: null };
  }
}

/**
 * Fetches historical validation runs for an application
 */
export async function fetchValidationRuns(
  applicationId: string
): Promise<{ data: ValidationRun[]; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('validation_runs')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const runs: ValidationRun[] = (data || []).map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      category: row.category,
      outcome: row.outcome,
      counts: row.counts,
      findings: row.findings as ValidationFinding[],
      validatedAt: row.created_at,
    }));

    return { data: runs, error: null };
  } catch (err: any) {
    return { data: [], error: err as Error };
  }
}

// In-memory fallback cache for offline evaluation and testing
const IN_MEMORY_SCREENING_BATCHES: ScreeningBatch[] = [];

/**
 * Persist an organisation bulk screening batch and its applicant items
 */
export async function saveScreeningBatch(
  userId: string,
  batch: ScreeningBatch
): Promise<{ data: ScreeningBatch | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const existingIdx = IN_MEMORY_SCREENING_BATCHES.findIndex((b) => b.id === batch.id);
    if (existingIdx >= 0) {
      IN_MEMORY_SCREENING_BATCHES[existingIdx] = {
        ...batch,
        updatedAt: new Date().toISOString(),
      };
    } else {
      IN_MEMORY_SCREENING_BATCHES.unshift({
        ...batch,
        createdAt: batch.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return { data: batch, error: null };
  }

  try {
    const { data: batchRow, error: batchErr } = await supabase
      .from('screening_batches')
      .insert({
        organisation_id: batch.organisationId || null,
        user_id: userId,
        title: batch.title,
        target_category: batch.targetCategory,
        service_code: batch.serviceCode || null,
        variant_code: batch.variantCode || null,
        total_applications: batch.totalApplications,
        outcome_counts: batch.outcomeCounts,
        status: batch.status || 'completed',
      })
      .select()
      .single();

    if (batchErr || !batchRow) {
      console.warn('[TypeNull] Screening batch save notice:', batchErr?.message);
      return { data: batch, error: null };
    }

    // Save batch items
    if (batch.items.length > 0) {
      const itemsToInsert = batch.items.map((item) => ({
        batch_id: batchRow.id,
        applicant_identifier: item.applicantIdentifier,
        target_category: item.targetCategory,
        service_code: item.serviceCode || batch.serviceCode || null,
        variant_code: item.variantCode || batch.variantCode || null,
        status: item.status || 'completed',
        outcome: item.outcome,
        document_count: item.documentCount,
        counts: item.counts,
        findings: item.findings,
        extracted_fields: item.extractedFields,
        error_message: item.errorMessage || null,
      }));

      await supabase.from('screening_batch_items').insert(itemsToInsert);
    }

    return {
      data: {
        ...batch,
        id: batchRow.id,
        createdAt: batchRow.created_at,
        updatedAt: batchRow.updated_at || batchRow.created_at,
      },
      error: null,
    };
  } catch (err: any) {
    console.warn('[TypeNull] Screening batch exception:', err);
    return { data: batch, error: null };
  }
}

/**
 * Fetch saved screening batches for an organisation or user
 */
export async function fetchScreeningBatches(
  organisationId?: string
): Promise<{ data: ScreeningBatch[]; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    let list = [...IN_MEMORY_SCREENING_BATCHES];
    if (organisationId) {
      list = list.filter((b) => !b.organisationId || b.organisationId === organisationId);
    }
    return { data: list, error: null };
  }

  try {
    let query = supabase
      .from('screening_batches')
      .select('*, screening_batch_items(*)')
      .order('created_at', { ascending: false });

    if (organisationId) {
      query = query.eq('organisation_id', organisationId);
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const batches: ScreeningBatch[] = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      organisationId: row.organisation_id,
      targetCategory: row.target_category,
      serviceCode: row.service_code || undefined,
      variantCode: row.variant_code || undefined,
      totalApplications: row.total_applications,
      outcomeCounts: row.outcome_counts,
      status: row.status || 'completed',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: (row.screening_batch_items || []).map((itemRow: any) => ({
        id: itemRow.id,
        batchId: itemRow.batch_id,
        applicantIdentifier: itemRow.applicant_identifier,
        targetCategory: itemRow.target_category,
        serviceCode: itemRow.service_code,
        variantCode: itemRow.variant_code,
        status: itemRow.status || 'completed',
        outcome: itemRow.outcome,
        documentCount: itemRow.document_count,
        counts: itemRow.counts,
        findings: itemRow.findings,
        extractedFields: itemRow.extracted_fields,
        errorMessage: itemRow.error_message || undefined,
        sourceFiles: [],
        processedAt: itemRow.created_at,
      })),
    }));

    return { data: batches, error: null };
  } catch (err: any) {
    return { data: [], error: err as Error };
  }
}

/**
 * Export Screening Batch Results to CSV string
 */
export function generateScreeningCsvReport(batch: ScreeningBatch): string {
  const headers = [
    'Applicant Identifier',
    'Category',
    'Service Code',
    'Variant Code',
    'Status',
    'Screening Outcome',
    'Document Count',
    'Passed Checks',
    'Minor Issues',
    'Major Issues',
    'Unable To Assess',
    'Top Findings & Citations',
  ];

  const rows = batch.items.map((item) => {
    const topFindings = (item.findings || [])
      .filter((f) => f.status === 'failed' || f.status === 'unable_to_check')
      .slice(0, 3)
      .map((f) => `[${f.ruleId}] ${f.title}`)
      .join(' | ');

    return [
      `"${item.applicantIdentifier.replace(/"/g, '""')}"`,
      `"${item.targetCategory}"`,
      `"${item.serviceCode || batch.serviceCode || 'N/A'}"`,
      `"${item.variantCode || batch.variantCode || 'N/A'}"`,
      `"${item.status || 'completed'}"`,
      `"${item.outcome}"`,
      item.documentCount,
      item.counts?.passed ?? 0,
      item.counts?.minorIssues ?? 0,
      item.counts?.majorIssues ?? 0,
      item.counts?.unableToAssess ?? 0,
      `"${(topFindings || 'All automated statutory checks passed').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
