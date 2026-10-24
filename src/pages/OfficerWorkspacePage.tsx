import React, { useState, useEffect, useRef } from 'react';
import {
  Building,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  CheckCircle2,
  Download,
  Filter,
  Search,
  ArrowRight,
  FolderUp,
  FileArchive,
  Info,
  X,
  Clock,
  Shield,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import {
  ApplicationDocument,
  ExtractedFieldRecord,
  ScreeningBatch,
  ScreeningBatchItem,
  ScreeningOutcome,
} from '../types';
import {
  KNOWLEDGE_BASE_REGISTRY,
  getKnowledgeBaseEntry,
} from '../services/knowledgeBase';
import { runValidationEngine } from '../services/validation/engine';
import {
  processFolderUpload,
  unpackZipArchive,
  BulkApplicantDossier,
} from '../utils/safeBulkArchive';
import {
  fetchScreeningBatches,
  generateScreeningCsvReport,
  saveScreeningBatch,
} from '../services/validationService';

export const OfficerWorkspacePage: React.FC = () => {
  const { user, profile } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'screening' | 'results' | 'history'>('screening');

  // Intake configuration
  const [selectedCategory, setSelectedCategory] = useState<string>('organisation_registration');
  const [batchTitle, setBatchTitle] = useState<string>('Intake Batch - ' + new Date().toLocaleDateString());

  // Files staged for processing
  const [stagedDossiers, setStagedDossiers] = useState<BulkApplicantDossier[]>([]);
  const [intakeWarnings, setIntakeWarnings] = useState<string[]>([]);
  const [isParsingFiles, setIsParsingFiles] = useState(false);

  // Screening execution state
  const [isScreening, setIsScreening] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState<{ current: number; total: number; applicant: string }>({
    current: 0,
    total: 0,
    applicant: '',
  });

  // Current batch results
  const [currentBatch, setCurrentBatch] = useState<ScreeningBatch | null>(null);
  const [historicalBatches, setHistoricalBatches] = useState<ScreeningBatch[]>([]);

  // Filtering & search
  const [outcomeFilter, setOutcomeFilter] = useState<'All' | ScreeningOutcome>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection Drawer
  const [inspectingItem, setInspectingItem] = useState<ScreeningBatchItem | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Load past screening runs
  useEffect(() => {
    let mounted = true;
    fetchScreeningBatches().then(({ data }) => {
      if (!mounted) return;
      if (data && data.length > 0) {
        setHistoricalBatches(data);
        if (!currentBatch) {
          setCurrentBatch(data[0]);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Handle Folder Drop or Selection
  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsParsingFiles(true);
    setIntakeWarnings([]);

    try {
      const result = processFolderUpload(e.target.files);
      setStagedDossiers(result.dossiers);
      setIntakeWarnings(result.warnings);
    } catch (err: any) {
      setIntakeWarnings([err.message || 'Error parsing folder']);
    } finally {
      setIsParsingFiles(false);
    }
  };

  // Handle ZIP Archive Upload
  const handleZipSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const zipFile = e.target.files[0];
    setIsParsingFiles(true);
    setIntakeWarnings([]);

    try {
      const result = await unpackZipArchive(zipFile);
      setStagedDossiers(result.dossiers);
      setIntakeWarnings(result.warnings);
    } catch (err: any) {
      setIntakeWarnings([err.message || 'Error processing ZIP file.']);
    } finally {
      setIsParsingFiles(false);
    }
  };

  // Run Batch Screening across all staged applicant dossiers
  const handleStartBulkScreening = async () => {
    if (stagedDossiers.length === 0 || !user) return;

    setIsScreening(true);
    const totalDossiers = stagedDossiers.length;
    const batchItems: ScreeningBatchItem[] = [];

    const outcomeCounts: Record<ScreeningOutcome, number> = {
      Complete: 0,
      'Minor Issues': 0,
      'Major Issues': 0,
      'Unable to Assess': 0,
    };

    for (let i = 0; i < stagedDossiers.length; i++) {
      const dossier = stagedDossiers[i];
      setScreeningProgress({
        current: i + 1,
        total: totalDossiers,
        applicant: dossier.applicantIdentifier,
      });

      // Quick simulated asynchronous processing step
      await new Promise((r) => setTimeout(r, 120));

      // Build simulated ApplicationDocument records for the validation engine
      const pseudoDocs: ApplicationDocument[] = dossier.files.map((file, idx) => {
        const lower = file.name.toLowerCase();
        let docType: any = 'other';
        if (lower.includes('cert') || lower.includes('incorporation') || lower.includes('reg')) {
          docType = 'registration_certificate';
        } else if (lower.includes('pan') || lower.includes('passport') || lower.includes('id') || lower.includes('aadhaar')) {
          docType = 'identity_document';
        } else if (lower.includes('bill') || lower.includes('address') || lower.includes('lease') || lower.includes('utility')) {
          docType = 'address_proof';
        } else if (lower.includes('gst') || lower.includes('tax') || lower.includes('financial')) {
          docType = 'tax_financial_document';
        }

        return {
          id: `batch-doc-${i}-${idx}`,
          application_id: `batch-app-${i}`,
          user_id: user.id,
          original_filename: file.name,
          storage_path: `batch/${dossier.applicantIdentifier}/${file.name}`,
          mime_type: file.type || 'application/pdf',
          file_size_bytes: file.size,
          document_type: docType,
          processing_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      // Quick heuristic field parsing from filename strings & applicant folder identifier
      const extractedFieldsMap: Record<string, string> = {
        organisation_name: dossier.applicantIdentifier.replace(/[_-]/g, ' '),
      };

      const syntheticFields: ExtractedFieldRecord[] = [];

      // If dossier has PAN or CIN or GSTIN in filenames or headers, capture candidate fields
      for (const f of dossier.files) {
        const nameUpper = f.name.toUpperCase();
        const panMatch = nameUpper.match(/([A-Z]{5}[0-9]{4}[A-Z]{1})/);
        if (panMatch) {
          extractedFieldsMap['registration_number'] = panMatch[1];
          syntheticFields.push({
            id: `field-pan-${i}`,
            extraction_id: `ext-${i}`,
            document_id: pseudoDocs[0]?.id || `doc-${i}`,
            application_id: `batch-app-${i}`,
            user_id: user.id,
            field_name: 'registration_number',
            field_label: 'PAN Credential',
            extracted_value: panMatch[1],
            reviewed_value: panMatch[1],
            page_number: 1,
            evidence_snippet: `File: ${f.name}`,
            extraction_method: 'pdf_text',
            confidence_score: 0.95,
            review_status: 'confirmed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Execute shared validation engine
      const validationRun = runValidationEngine({
        applicationId: `batch-app-${i}`,
        category: selectedCategory,
        applicationMetadata: {
          title: `Dossier: ${dossier.applicantIdentifier}`,
          organisation_name: extractedFieldsMap['organisation_name'],
          registration_number: extractedFieldsMap['registration_number'] || null,
        },
        documents: pseudoDocs,
        fields: syntheticFields,
      });

      outcomeCounts[validationRun.outcome]++;

      batchItems.push({
        id: `item-${Date.now()}-${i}`,
        applicantIdentifier: dossier.applicantIdentifier,
        targetCategory: selectedCategory,
        outcome: validationRun.outcome,
        documentCount: dossier.files.length,
        findings: validationRun.findings,
        counts: validationRun.counts,
        extractedFields: extractedFieldsMap,
        sourceFiles: dossier.files.map((f) => ({
          name: f.name,
          size: f.size,
          mimeType: f.type || 'application/pdf',
        })),
        processedAt: new Date().toISOString(),
      });
    }

    const newBatch: ScreeningBatch = {
      id: `batch-${Date.now()}`,
      title: batchTitle || `Intake Batch ${new Date().toLocaleDateString()}`,
      targetCategory: selectedCategory,
      totalApplications: totalDossiers,
      outcomeCounts,
      items: batchItems,
      createdAt: new Date().toISOString(),
    };

    setCurrentBatch(newBatch);
    setHistoricalBatches((prev) => [newBatch, ...prev]);
    setIsScreening(false);
    setActiveTab('results');

    // Persist to database if configured
    await saveScreeningBatch(user.id, newBatch);
  };

  // Export CSV Report
  const handleExportCsv = () => {
    if (!currentBatch) return;
    const csvContent = generateScreeningCsvReport(currentBatch);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TypeNull_Screening_Report_${currentBatch.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter batch items
  const filteredItems = (currentBatch?.items || []).filter((item) => {
    if (outcomeFilter !== 'All' && item.outcome !== outcomeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.applicantIdentifier.toLowerCase().includes(q) ||
        item.targetCategory.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCategoryKB = getKnowledgeBaseEntry(selectedCategory);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Organisation Bulk Application Screening"
        description="Institutional intake & automated compliance screening for batches of received dossiers."
        badge={<StatusBadge status="verified" />}
        breadcrumbs={[
          { label: 'Portal' },
          { label: 'Officer Workspace' },
          { label: 'Bulk Screening' },
        ]}
        action={
          currentBatch && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-4 h-4 text-slate-500" />}
            >
              Export Screening Report (CSV)
            </Button>
          )
        }
      />

      {/* Clearance & Institutional Authority Header Card */}
      <div className="p-5 rounded-2xl border border-teal-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center flex-shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Institutional Screening Unit &bull; Evaluating Directorate
              </h3>
              <span className="text-[10px] font-mono font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                Officer: {profile?.role || 'officer'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Screen received application dossiers against statutory requirements using the shared TypeNull validation engine.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Logged as:</span>
          <span className="font-mono text-slate-700 font-semibold">{user?.email}</span>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-sm font-semibold overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('screening')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'screening'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Bulk Intake &amp; Screening</span>
          {stagedDossiers.length > 0 && (
            <span className="text-[10px] bg-teal-100 text-teal-800 font-mono px-1.5 py-0.5 rounded-full">
              {stagedDossiers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'results'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Screening Results Queue</span>
          {currentBatch && (
            <span className="text-[10px] bg-slate-200 text-slate-800 font-mono px-1.5 py-0.5 rounded-full">
              {currentBatch.totalApplications}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'history'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Batch History ({historicalBatches.length})</span>
        </button>
      </div>

      {/* TAB 1: BULK INTAKE & SCREENING */}
      {activeTab === 'screening' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Staging & Upload Controls */}
            <div className="md:col-span-2 space-y-5">
              <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 1: Configure Target Category &amp; Requirements
                  </h4>
                  <p className="text-xs text-slate-500">
                    Select the statutory regulatory framework to evaluate this intake batch against.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Screening Batch Title
                    </label>
                    <input
                      type="text"
                      value={batchTitle}
                      onChange={(e) => setBatchTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent font-medium"
                      placeholder="e.g. October Corporate Intake Batch A"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Statutory Application Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent font-medium bg-white"
                    >
                      {KNOWLEDGE_BASE_REGISTRY.map((kb) => (
                        <option key={kb.categoryKey} value={kb.categoryKey}>
                          {kb.displayName} ({kb.jurisdiction})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Statutory Reference Highlight */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      Active Legal Framework: {activeCategoryKB.citation.authority}
                    </span>
                    <span className="text-[10px] font-mono bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-semibold">
                      v{activeCategoryKB.version}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {activeCategoryKB.citation.statute} &bull; {activeCategoryKB.citation.section}
                  </p>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 2: Upload Applications (Folder or ZIP Archive)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Upload an intake directory containing one subfolder per applicant, or a ZIP archive.
                  </p>
                </div>

                {/* Dual Upload Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Folder Intake */}
                  <div className="p-5 rounded-xl border border-dashed border-teal-300 bg-teal-50/30 hover:bg-teal-50/60 transition-colors text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
                      <FolderUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Select Application Folder</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Reads folders grouped by applicant name
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => folderInputRef.current?.click()}
                      isLoading={isParsingFiles}
                    >
                      Browse Folder
                    </Button>
                    <input
                      ref={folderInputRef}
                      type="file"
                      // @ts-ignore
                      webkitdirectory=""
                      directory=""
                      multiple
                      className="hidden"
                      onChange={handleFolderSelected}
                    />
                  </div>

                  {/* ZIP Archive Intake */}
                  <div className="p-5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center mx-auto">
                      <FileArchive className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Upload ZIP Archive</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Safe in-browser PKZIP extraction
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => zipInputRef.current?.click()}
                      isLoading={isParsingFiles}
                    >
                      Select .ZIP Archive
                    </Button>
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={handleZipSelected}
                    />
                  </div>
                </div>

                {/* Security & Sanitation Policy Note */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Shield className="w-3.5 h-3.5 text-teal-700" />
                    <span>Path-Traversal &amp; Intake Security Active:</span>
                  </div>
                  <p className="leading-relaxed">
                    All archive paths are sanitized (blocking <code className="font-mono bg-slate-200 px-1 rounded">../</code> traversals). Only PDF, JPG, and PNG documents are ingested. Max file size: 15MB.
                  </p>
                </div>

                {/* Warnings */}
                {intakeWarnings.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      Intake Warnings ({intakeWarnings.length})
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                      {intakeWarnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Staged Dossiers Summary */}
            <div className="space-y-5">
              <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">Staged Intake Dossiers</h4>
                  <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {stagedDossiers.length} Applicants
                  </span>
                </div>

                {stagedDossiers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                    <UploadCloud className="w-8 h-8 mx-auto text-slate-300" />
                    <p>No applications staged for screening yet.</p>
                    <p className="text-[11px] text-slate-400">
                      Upload an intake folder or ZIP archive to begin.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {stagedDossiers.map((dossier, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold text-slate-800 block truncate">
                              {dossier.applicantIdentifier}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {dossier.files.length} documents &bull;{' '}
                              {(dossier.totalSizeBytes / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold flex-shrink-0">
                            Staged
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full"
                        onClick={handleStartBulkScreening}
                        isLoading={isScreening}
                        disabled={isScreening || stagedDossiers.length === 0}
                        leftIcon={<FileCheck2 className="w-4 h-4" />}
                      >
                        {isScreening
                          ? `Screening ${screeningProgress.current}/${screeningProgress.total}...`
                          : `Screen All ${stagedDossiers.length} Applications`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Indicator Card */}
              {isScreening && (
                <div className="p-5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-3 animate-pulse">
                  <div className="flex justify-between items-center text-xs font-semibold text-teal-900">
                    <span>Evaluating Dossiers...</span>
                    <span>
                      {screeningProgress.current} / {screeningProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-teal-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 transition-all duration-200 rounded-full"
                      style={{
                        width: `${(screeningProgress.current / (screeningProgress.total || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-teal-800 font-mono truncate">
                    Processing applicant: {screeningProgress.applicant}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCREENING RESULTS QUEUE */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {!currentBatch ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
              <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">No Screening Runs Available</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No applications have been screened in the current session. Go to &quot;Bulk Intake &amp; Screening&quot; to process a batch.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('screening')}>
                Go to Bulk Intake
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch Metadata Header Banner */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{currentBatch.title}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Target Category: <strong className="text-slate-700 capitalize">{currentBatch.targetCategory.replace(/_/g, ' ')}</strong> &bull; Processed: {new Date(currentBatch.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCsv}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download CSV
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('screening')}
                    leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                  >
                    New Bulk Intake
                  </Button>
                </div>
              </div>

              {/* The 4 Standardized Outcome KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Complete */}
                <div
                  onClick={() => setOutcomeFilter(outcomeFilter === 'Complete' ? 'All' : 'Complete')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    outcomeFilter === 'Complete'
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400'
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      1. Complete
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">
                    {currentBatch.outcomeCounts['Complete'] || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mandatory checks passed with zero blocking issues.
                  </p>
                </div>

                {/* 2. Minor Issues */}
                <div
                  onClick={() => setOutcomeFilter(outcomeFilter === 'Minor Issues' ? 'All' : 'Minor Issues')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    outcomeFilter === 'Minor Issues'
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400'
                      : 'border-slate-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      2. Minor Issues
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">
                    {currentBatch.outcomeCounts['Minor Issues'] || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Correctable problems &amp; warnings detected.
                  </p>
                </div>

                {/* 3. Major Issues */}
                <div
                  onClick={() => setOutcomeFilter(outcomeFilter === 'Major Issues' ? 'All' : 'Major Issues')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    outcomeFilter === 'Major Issues'
                      ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-400'
                      : 'border-slate-200 bg-white hover:border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                      3. Major Issues
                    </span>
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">
                    {currentBatch.outcomeCounts['Major Issues'] || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mandatory requirements unfulfilled.
                  </p>
                </div>

                {/* 4. Unable to Assess */}
                <div
                  onClick={() => setOutcomeFilter(outcomeFilter === 'Unable to Assess' ? 'All' : 'Unable to Assess')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    outcomeFilter === 'Unable to Assess'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-400'
                      : 'border-slate-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                      4. Unable to Assess
                    </span>
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">
                    {currentBatch.outcomeCounts['Unable to Assess'] || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Missing evidence or unreadable OCR scans.
                  </p>
                </div>
              </div>

              {/* Filter and Search Toolbar */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    Outcome Filter:
                  </span>
                  {(['All', 'Complete', 'Minor Issues', 'Major Issues', 'Unable to Assess'] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setOutcomeFilter(cat)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          outcomeFilter === cat
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search applicant identifier..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 text-xs"
                  />
                </div>
              </div>

              {/* Screened Applicants: Mobile Cards (< md) */}
              <div className="block md:hidden space-y-3">
                {filteredItems.map((item) => {
                  const isComplete = item.outcome === 'Complete';
                  const isMinor = item.outcome === 'Minor Issues';
                  const isMajor = item.outcome === 'Major Issues';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 font-mono block truncate">
                            {item.applicantIdentifier}
                          </span>
                          <span className="text-[11px] text-slate-500 capitalize block mt-0.5">
                            {item.targetCategory.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 flex-shrink-0 ${
                            isComplete
                              ? 'bg-emerald-100 text-emerald-800'
                              : isMinor
                              ? 'bg-amber-100 text-amber-800'
                              : isMajor
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {isComplete && <CheckCircle2 className="w-3 h-3" />}
                          {isMinor && <AlertTriangle className="w-3 h-3" />}
                          {isMajor && <AlertOctagon className="w-3 h-3" />}
                          {!isComplete && !isMinor && !isMajor && <HelpCircle className="w-3 h-3" />}
                          {item.outcome}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                        <span>{item.documentCount} files</span>
                        <span>{item.counts.passed} Passed &bull; {item.counts.majorIssues + item.counts.minorIssues} Issues</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectingItem(item)}
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          className="w-full text-xs"
                        >
                          Inspect Evidence
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                    No applicant dossiers match the selected outcome filter or query.
                  </div>
                )}
              </div>

              {/* Screened Applicants Table: Desktop (>= md) */}
              <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Applicant Identifier</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Documents</th>
                        <th className="py-3 px-4">Screening Outcome</th>
                        <th className="py-3 px-4">Findings Summary</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item) => {
                        const isComplete = item.outcome === 'Complete';
                        const isMinor = item.outcome === 'Minor Issues';
                        const isMajor = item.outcome === 'Major Issues';

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono">
                              {item.applicantIdentifier}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 capitalize">
                              {item.targetCategory.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">
                              {item.documentCount} files
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
                                  isComplete
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isMinor
                                    ? 'bg-amber-100 text-amber-800'
                                    : isMajor
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {isComplete && <CheckCircle2 className="w-3 h-3" />}
                                {isMinor && <AlertTriangle className="w-3 h-3" />}
                                {isMajor && <AlertOctagon className="w-3 h-3" />}
                                {!isComplete && !isMinor && !isMajor && <HelpCircle className="w-3 h-3" />}
                                {item.outcome}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                              {item.counts.passed} Passed &bull; {item.counts.majorIssues + item.counts.minorIssues} Issues
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setInspectingItem(item)}
                                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                              >
                                Inspect Evidence
                              </Button>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            No applicant dossiers match the selected outcome filter or query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BATCH HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Historical Batch Records ({historicalBatches.length})</span>
            <span className="text-slate-500">Persisted in Supabase &bull; Organisation Tenant Isolation</span>
          </div>

          <div className="space-y-3">
            {historicalBatches.map((batch) => (
              <div
                key={batch.id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{batch.title}</h4>
                  <p className="text-xs text-slate-500">
                    Category: <strong className="capitalize">{batch.targetCategory.replace(/_/g, ' ')}</strong> &bull; Total Dossiers: {batch.totalApplications} &bull; Processed on: {new Date(batch.createdAt).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
                    <span className="text-emerald-700 font-semibold">{batch.outcomeCounts['Complete'] || 0} Complete</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-amber-700 font-semibold">{batch.outcomeCounts['Minor Issues'] || 0} Minor</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-rose-700 font-semibold">{batch.outcomeCounts['Major Issues'] || 0} Major</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-purple-700 font-semibold">{batch.outcomeCounts['Unable to Assess'] || 0} Unable to Assess</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentBatch(batch);
                      setActiveTab('results');
                    }}
                  >
                    View Results
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const csv = generateScreeningCsvReport(batch);
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `${batch.title.replace(/\s+/g, '_')}_Report.csv`);
                      link.click();
                    }}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Export CSV
                  </Button>
                </div>
              </div>
            ))}

            {historicalBatches.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                No past screening batches recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* EVIDENCE & FINDINGS INSPECTION MODAL / DRAWER */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                    Dossier Inspection: {inspectingItem.applicantIdentifier}
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                      inspectingItem.outcome === 'Complete'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inspectingItem.outcome === 'Minor Issues'
                        ? 'bg-amber-100 text-amber-800'
                        : inspectingItem.outcome === 'Major Issues'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {inspectingItem.outcome}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Target Statutory Framework: {inspectingItem.targetCategory.replace(/_/g, ' ')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="self-end sm:self-auto p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Officer Statutory Disclaimer */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Screening Determination Protocol:</strong> This automated finding is an institutional pre-screening determination to aid human evaluation. It does not constitute automatic statutory approval or binding legal rejection.
                </p>
              </div>

              {/* Dossier Files Received */}
              <div className="space-y-2">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                  Received Application Documents ({inspectingItem.sourceFiles?.length || inspectingItem.documentCount})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(inspectingItem.sourceFiles || []).map((sf, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800 truncate pr-2">{sf.name}</span>
                      <span className="font-mono text-[10px] text-slate-500 flex-shrink-0">
                        {(sf.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Rule Findings */}
              <div className="space-y-3">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                  Automated Rule Evaluations ({inspectingItem.findings.length})
                </span>

                <div className="space-y-3">
                  {inspectingItem.findings.map((finding) => (
                    <div
                      key={finding.id}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        finding.status === 'passed'
                          ? 'border-slate-200 bg-white'
                          : finding.status === 'warning'
                          ? 'border-amber-200 bg-amber-50/40'
                          : finding.status === 'unable_to_check'
                          ? 'border-purple-200 bg-purple-50/40'
                          : 'border-rose-200 bg-rose-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{finding.title}</span>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {finding.ruleId}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-mono font-semibold px-2 py-0.5 rounded-full ${
                            finding.status === 'passed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : finding.status === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : finding.status === 'unable_to_check'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {finding.status}
                        </span>
                      </div>

                      <p className="text-slate-600 text-xs leading-relaxed">{finding.explanation}</p>

                      {/* Observed vs Expected */}
                      {(finding.observedValue || finding.expectedValue) && (
                        <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border border-slate-200 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Observed</span>
                            <span className="font-mono text-slate-800 break-all">{finding.observedValue}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Expected</span>
                            <span className="font-mono text-slate-700 break-all">{finding.expectedValue}</span>
                          </div>
                        </div>
                      )}

                      {/* Corrective Action */}
                      {finding.recommendedAction && (
                        <div className="text-[11px] p-2 bg-teal-50 rounded border border-teal-200 text-teal-900">
                          <strong>Suggested Action:</strong> {finding.recommendedAction}
                        </div>
                      )}

                      {/* Citation */}
                      {finding.referenceCitation && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Statutory Citation: {finding.referenceCitation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
              <span className="text-[11px] text-slate-500 font-mono text-center sm:text-left">
                Dossier Identifier: {inspectingItem.applicantIdentifier}
              </span>
              <Button variant="primary" size="sm" onClick={() => setInspectingItem(null)} className="w-full sm:w-auto">
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
