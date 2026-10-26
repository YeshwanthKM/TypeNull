import * as fs from 'node:fs';
import * as path from 'node:path';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';
import { CANDIDATE_GOVERNMENT_SERVICES } from '../src/services/ingestion/ingestionService';
import { DEFAULT_DEMO_ORGANISATIONS } from '../src/services/organisationAccessService';

async function main() {
  console.log('=== TypeNull SIH 2026 Database Pre-Cleanup State Backup ===\n');

  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `pre_cleanup_backup_${timestamp}.json`);

  const backupPayload: Record<string, any> = {
    metadata: {
      timestamp: new Date().toISOString(),
      checkpointTag: 'sih2026-pre-data-cleanup-20261026',
      environment: isSupabaseConfigured ? 'supabase_cloud' : 'local_runtime_offline',
      purpose: 'Safety backup before purging obsolete prototype records and archiving legacy service catalogues',
    },
    tables: {},
  };

  if (isSupabaseConfigured && supabase) {
    console.log('Live Supabase connection detected. Exporting database tables...');
    const tables = [
      'profiles',
      'applications',
      'application_documents',
      'document_extractions',
      'extracted_fields',
      'organisations',
      'organisation_members',
      'organisation_access_requests',
      'validation_runs',
      'screening_batches',
      'screening_batch_items',
      'government_services',
      'service_application_types',
      'institution_verification_audits',
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.warn(`  ! Could not export table ${table}: ${error.message}`);
          backupPayload.tables[table] = { error: error.message, count: 0, rows: [] };
        } else {
          console.log(`  ✓ Exported ${table}: ${data.length} records`);
          backupPayload.tables[table] = { count: data.length, rows: data };
        }
      } catch (err: any) {
        console.warn(`  ! Exception exporting ${table}: ${err.message}`);
        backupPayload.tables[table] = { error: err.message, count: 0, rows: [] };
      }
    }
  } else {
    console.log('Offline/Local environment detected. Backing up runtime fallback catalogues and state...');
    backupPayload.tables['candidate_government_services'] = {
      count: CANDIDATE_GOVERNMENT_SERVICES.length,
      rows: CANDIDATE_GOVERNMENT_SERVICES,
    };
    backupPayload.tables['default_demo_organisations'] = {
      count: DEFAULT_DEMO_ORGANISATIONS.length,
      rows: DEFAULT_DEMO_ORGANISATIONS,
    };
    console.log(`  ✓ Exported candidate_government_services: ${CANDIDATE_GOVERNMENT_SERVICES.length} entries`);
    console.log(`  ✓ Exported default_demo_organisations: ${DEFAULT_DEMO_ORGANISATIONS.length} entries`);
  }

  // Write backup to disk
  fs.writeFileSync(backupFilePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
  console.log(`\nBackup successfully written to: ${backupFilePath}`);

  // Verification step: verify backup file exists, is non-empty, and can be read back and parsed
  const fileStats = fs.statSync(backupFilePath);
  if (fileStats.size === 0) {
    throw new Error('Backup verification failed: File size is 0 bytes.');
  }

  const readBackContent = fs.readFileSync(backupFilePath, 'utf-8');
  const parsedData = JSON.parse(readBackContent);
  if (!parsedData.metadata || !parsedData.tables) {
    throw new Error('Backup verification failed: Malformed JSON structure.');
  }

  console.log(`✓ Verification successful: ${fileStats.size} bytes read back and verified.`);
  console.log('Backup is confirmed intact and readable.\n');
}

main().catch((err) => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
