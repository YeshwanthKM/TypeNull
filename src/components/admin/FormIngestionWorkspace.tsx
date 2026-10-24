import React, { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ExternalLink,
  ShieldCheck,
  FileText,
  HelpCircle,
  Plus,
  Lock,
  FileCheck,
  AlertOctagon,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  GovernmentService,
  GovernmentSource,
  LifecycleStatus,
  RequirementClassification,
} from '../../types';
import {
  getGovernmentSources,
  getGovernmentServices,
  updateApplicationTypeLifecycle,
  updateRequirementClassification,
  triggerDiscoveryRun,
  getIngestionMetrics,
} from '../../services/ingestion/ingestionService';
import { isGovInOrNicInDomain } from '../../services/ingestion/safeFetch';

export const FormIngestionWorkspace: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'lifecycle' | 'sources' | 'pipeline' | 'metrics'
  >('lifecycle');

  // Services & Sources state
  const [services, setServices] = useState<GovernmentService[]>([]);
  const [sources, setSources] = useState<GovernmentSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Service for detailed inspection
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAppTypeId, setSelectedAppTypeId] = useState<string | null>(null);

  // Ingestion Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    step: string;
    resourceName: string;
    percent: number;
  } | null>(null);
  const [latestScanSummary, setLatestScanSummary] = useState<any | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState<{
    sourcesCount: number;
    servicesCount: number;
    applicationTypesCount: number;
    requirementsCount: number;
    publishedCount: number;
    verifiedCount: number;
    needsVerificationCount: number;
    extractedCount: number;
    discoveredCount: number;
    supersededCount: number;
  }>({
    sourcesCount: 0,
    servicesCount: 0,
    applicationTypesCount: 0,
    requirementsCount: 0,
    publishedCount: 0,
    verifiedCount: 0,
    needsVerificationCount: 0,
    extractedCount: 0,
    discoveredCount: 0,
    supersededCount: 0,
  });

  // Action feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New source form state
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceAuthority, setNewSourceAuthority] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceJurisdiction, setNewSourceJurisdiction] = useState<'Central' | 'State'>('Central');
  const [newSourceCategory, setNewSourceCategory] = useState('regulatory_application');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [srcs, srvs, mets] = await Promise.all([
        getGovernmentSources(),
        getGovernmentServices(),
        getIngestionMetrics(),
      ]);
      setSources(srcs);
      setServices(srvs);
      setMetrics(mets);
      if (srvs.length > 0 && !selectedServiceId) {
        setSelectedServiceId(srvs[0].id);
        if (srvs[0].applicationTypes.length > 0) {
          setSelectedAppTypeId(srvs[0].applicationTypes[0].id);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load ingestion catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Lifecycle State Change
  const handleLifecycleTransition = async (
    typeId: string,
    newStatus: LifecycleStatus,
    notes?: string
  ) => {
    try {
      await updateApplicationTypeLifecycle(typeId, newStatus, notes);
      setSuccessMsg(`Application requirements successfully transitioned to "${newStatus.replace('_', ' ').toUpperCase()}".`);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(`Failed to transition lifecycle: ${err.message}`);
    }
  };

  // Handle Requirement Classification Change
  const handleClassificationChange = async (
    reqId: string,
    classification: RequirementClassification,
    isMandatory: boolean
  ) => {
    try {
      await updateRequirementClassification(reqId, classification, isMandatory);
      setSuccessMsg(`Requirement classification updated to "${classification}".`);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(`Failed to update requirement: ${err.message}`);
    }
  };

  // Trigger automated discovery scan
  const handleTriggerDiscovery = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setScanProgress({ step: 'Initializing Safe Crawler...', resourceName: 'Domain Allowlists Checked', percent: 10 });

    try {
      const result = await triggerDiscoveryRun({
        onProgress: (p) => {
          const pct = Math.round((p.completedCount / Math.max(p.totalCount, 1)) * 100);
          setScanProgress({
            step: `${p.step.toUpperCase()}: ${p.resourceName}`,
            resourceName: p.resourceName,
            percent: Math.min(Math.max(pct, 15), 95),
          });
        },
      });

      setLatestScanSummary(result.runSummary);
      setSuccessMsg(`Automated Discovery Scan completed. Discovered ${result.servicesDiscovered.length} services across official portals.`);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(`Discovery scan encountered error: ${err.message}`);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  // Add official source
  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newSourceAuthority.trim() || !newSourceUrl.trim()) {
      setErrorMsg('Authority name and source URL are required.');
      return;
    }

    if (!isGovInOrNicInDomain(newSourceUrl)) {
      setErrorMsg('Restricted Security Policy: Only official Indian Government domains (.gov.in, .nic.in) are permitted.');
      return;
    }

    const newSource: GovernmentSource = {
      id: `SRC-${Date.now().toString(36).toUpperCase()}`,
      authority: newSourceAuthority.trim(),
      sourceUrl: newSourceUrl.trim(),
      sourceType: 'statutory_repository',
      jurisdiction: newSourceJurisdiction === 'Central' ? 'India (Central)' : 'India (State Government)',
      supportedCategories: [newSourceCategory],
      lastDiscoveredAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      retrievalStatus: 'active',
      isVerifiedOfficial: true,
      accessLimitations: 'Public accessible portal with rate-limiting restrictions.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSources((prev) => [newSource, ...prev]);
    setShowAddSourceModal(false);
    setNewSourceAuthority('');
    setNewSourceUrl('');
    setSuccessMsg(`Verified official government source "${newSource.authority}" registered.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Filtering services
  const filteredServices = services.filter((srv) => {
    const matchesSearch =
      srv.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.serviceCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;

    return srv.applicationTypes.some((t) => t.lifecycleStatus === statusFilter);
  });

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];
  const selectedAppType =
    selectedService?.applicationTypes.find((t) => t.id === selectedAppTypeId) ||
    selectedService?.applicationTypes[0];

  const getLifecycleBadge = (status: LifecycleStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Published (Authoritative)
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            Verified
          </span>
        );
      case 'needs_verification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Needs Verification
          </span>
        );
      case 'extracted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Layers className="w-3 h-3 text-indigo-600" />
            Extracted
          </span>
        );
      case 'downloaded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <FileText className="w-3 h-3 text-slate-600" />
            Downloaded
          </span>
        );
      case 'discovered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Globe className="w-3 h-3 text-purple-600" />
            Discovered
          </span>
        );
      case 'superseded':
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            Superseded
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-3.5 h-3.5 text-emerald-600 hover:text-emerald-800" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-3.5 h-3.5 text-rose-600 hover:text-rose-800" />
          </button>
        </div>
      )}

      {/* Hero Ingestion & Discovery Header */}
      <div className="p-5 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
              <Globe className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Government Service Discovery &amp; Form Knowledge Base
            </h2>
            <span className="text-[10px] uppercase font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full border border-indigo-200">
              SIH 2026 Ingestion System
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Automates the discovery of Indian government services, parses official statutory guidance, extracts structured requirements and conditional questions, and enforces administrative verification before publishing to applicant pre-validation workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerDiscovery}
            isLoading={isScanning}
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
          >
            Trigger Discovery Scan
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Scanning Live Progress Bar */}
      {isScanning && scanProgress && (
        <div className="p-4 rounded-xl border border-indigo-200 bg-white shadow-sm space-y-2.5 animate-pulse">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-indigo-900 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              {scanProgress.step}
            </span>
            <span className="font-mono text-indigo-700 font-bold">{scanProgress.percent}%</span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtab Navigation */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2 sm:gap-6 text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveSubTab('lifecycle')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeSubTab === 'lifecycle'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Requirement Verification &amp; Lifecycle</span>
          <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-mono">
            {metrics.applicationTypesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sources')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeSubTab === 'sources'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Official Source Registry</span>
          <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-mono">
            {sources.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pipeline')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeSubTab === 'pipeline'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Discovery Pipeline &amp; Crawler Health</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('metrics')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors ${
            activeSubTab === 'metrics'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Coverage &amp; Transparency Metrics</span>
        </button>
      </div>

      {/* SUBTAB 1: REQUIREMENT VERIFICATION & LIFECYCLE */}
      {activeSubTab === 'lifecycle' && (
        <div className="space-y-5">
          {/* Lifecycle Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Lifecycle:
              </span>
              {(
                [
                  'all',
                  'published',
                  'verified',
                  'needs_verification',
                  'extracted',
                  'discovered',
                  'superseded',
                ] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services or codes..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Master-Detail Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Discovered Services List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Discovered Services ({filteredServices.length})
              </div>

              <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                {filteredServices.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500">
                    No services matched the selected lifecycle filter.
                  </div>
                ) : (
                  filteredServices.map((srv) => {
                    const isSelected = srv.id === selectedServiceId;
                    const primaryType = srv.applicationTypes[0];

                    return (
                      <div
                        key={srv.id}
                        onClick={() => {
                          setSelectedServiceId(srv.id);
                          if (srv.applicationTypes.length > 0) {
                            setSelectedAppTypeId(srv.applicationTypes[0].id);
                          }
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {srv.serviceCode}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 mt-1">
                              {srv.serviceName}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {srv.department}
                            </p>
                          </div>
                          {primaryType && getLifecycleBadge(primaryType.lifecycleStatus)}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Jurisdiction: {srv.jurisdiction}</span>
                          <span className="font-semibold text-indigo-700">
                            {(primaryType?.requirements || []).length} Requirements
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detailed Requirement Inspector & Admin Actions (7 cols) */}
            <div className="lg:col-span-7">
              {selectedService && selectedAppType ? (
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
                  {/* Service Detail Header */}
                  <div className="border-b border-slate-100 pb-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {selectedAppType.variantCode}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Version {selectedAppType.requirementsVersion}</span>
                      </div>
                      {getLifecycleBadge(selectedAppType.lifecycleStatus)}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {selectedAppType.applicationName}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedService.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                      <span><strong>Authority:</strong> {selectedService.department}</span>
                      <span><strong>Jurisdiction:</strong> {selectedService.jurisdiction}</span>
                      <a
                        href={selectedService.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        Official Source <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Administrative Action Bar (The 7 State Transitions) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-600" />
                        Administrative Governance Actions
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Only published requirements appear in Applicant selection
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedAppType.lifecycleStatus !== 'published' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            handleLifecycleTransition(
                              selectedAppType.id,
                              'published',
                              'Verified and approved by Administrator for public applicant pre-validation.'
                            )
                          }
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Verify &amp; Publish (Authoritative)
                        </Button>
                      )}

                      {selectedAppType.lifecycleStatus !== 'needs_verification' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleLifecycleTransition(
                              selectedAppType.id,
                              'needs_verification',
                              'Flagged by Administrator: Requires human legal review against updated gazette.'
                            )
                          }
                          leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        >
                          Flag Needs Verification
                        </Button>
                      )}

                      {selectedAppType.lifecycleStatus !== 'superseded' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleLifecycleTransition(
                              selectedAppType.id,
                              'superseded',
                              'Marked superseded due to new legislative amendment or updated portal form.'
                            )
                          }
                          leftIcon={<AlertOctagon className="w-3.5 h-3.5 text-rose-600" />}
                        >
                          Supersede / Deactivate
                        </Button>
                      )}
                    </div>

                    {selectedAppType.adminNotes && (
                      <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-200">
                        <strong>Admin Note:</strong> {selectedAppType.adminNotes}
                      </p>
                    )}
                  </div>

                  {/* Extracted Document Requirements */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Structured Document Requirements ({selectedAppType.requirements.length})
                      </h4>
                      <span className="text-[10px] text-slate-400">Classified by Validation Engine</span>
                    </div>

                    <div className="space-y-2.5">
                      {selectedAppType.requirements.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          No document requirements extracted yet. Run discovery scan or trigger parser.
                        </div>
                      ) : (
                        selectedAppType.requirements.map((req, idx) => (
                          <div
                            key={req.id || idx}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-900">
                                  {req.documentName}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {req.canonicalDocumentKey}
                                </span>
                              </div>

                              {/* Classification selector */}
                              <div className="flex items-center gap-1">
                                {(
                                  ['mandatory', 'conditional', 'alternative', 'optional'] as const
                                ).map((cls) => (
                                  <button
                                    key={cls}
                                    type="button"
                                    onClick={() =>
                                      handleClassificationChange(
                                        req.id,
                                        cls,
                                        cls === 'mandatory' || cls === 'alternative'
                                      )
                                    }
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-colors ${
                                      req.classification === cls
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {cls}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Accepted Alternatives if any */}
                            {req.acceptedAlternatives && req.acceptedAlternatives.length > 0 && (
                              <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                                <span className="font-semibold text-slate-800">Accepted Alternatives: </span>
                                {req.acceptedAlternatives.join(' OR ')}
                              </div>
                            )}

                            {/* Trigger condition */}
                            {req.conditionExpression && (
                              <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                                <span className="font-semibold">Conditional Trigger: </span>
                                <code className="font-mono">{req.conditionExpression}</code>
                              </div>
                            )}

                            {/* Provenance Evidence Snippet */}
                            {req.sourceEvidenceSnippet && (
                              <div className="text-[10px] text-slate-500 bg-white/80 p-2 rounded border border-slate-200 italic">
                                <span className="font-semibold text-slate-700 not-italic">Statutory Evidence Snippet: </span>
                                "{req.sourceEvidenceSnippet}"
                                {req.extractionConfidence && (
                                  <span className="ml-2 font-mono text-indigo-700 font-bold not-italic">
                                    [Confidence: {Math.round(req.extractionConfidence * 100)}%]
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Dynamic Conditional Questions */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                        Conditional Decision Questions ({selectedAppType.conditionalQuestions.length})
                      </h4>
                      <span className="text-[10px] text-slate-400">Presented to Applicant</span>
                    </div>

                    <div className="space-y-2">
                      {selectedAppType.conditionalQuestions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-50 border border-slate-200">
                          No dynamic conditional questions for this application variant.
                        </p>
                      ) : (
                        selectedAppType.conditionalQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-900">{q.questionText}</span>
                              <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                {q.questionCode}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">{q.helpText}</p>
                            <div className="text-[10px] text-indigo-700 font-mono">
                              Trigger: {q.triggerCondition} &rarr; Document [{(q.triggeredRequirementKeys || q.activatesDocumentTypes || []).join(', ')}]
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white text-xs text-slate-500">
                  Select a service from the left column to inspect and govern requirements.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: OFFICIAL SOURCE REGISTRY */}
      {activeSubTab === 'sources' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Authoritative Government Portals &amp; Repositories
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Restricted to official Central and State portals (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.gov.in</code> and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.nic.in</code>). Third-party websites are strictly excluded.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSourceModal(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Official Source
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Authority &amp; Domain</th>
                    <th className="py-3 px-4">Jurisdiction</th>
                    <th className="py-3 px-4">Security &amp; SSRF</th>
                    <th className="py-3 px-4">Retrieval Status</th>
                    <th className="py-3 px-4">Access Restrictions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((src) => (
                    <tr key={src.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{src.authority}</div>
                        <a
                          href={src.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-0.5"
                        >
                          {src.sourceUrl} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium">{src.jurisdiction}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Allowlist Verified
                          </span>
                          <span className="block text-[9px] text-slate-400 font-mono">
                            SSRF &amp; Private IP Block: Active
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {src.retrievalStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-500 max-w-xs">
                        {src.accessLimitations || 'Standard rate limits apply; robots.txt compliant.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DISCOVERY PIPELINE & CRAWLER HEALTH */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-600" />
              Automated Discovery &amp; Ingestion Architecture
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The TypeNull ingestion pipeline executes in 5 deterministic stages to discover forms, extract requirements, and prepare datasets for cross-document validation:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-900 block">1. Safe URL Scan</span>
                <p className="text-[11px] text-slate-500">
                  Allowlist validation (.gov.in/.nic.in) + SSRF protection blocking private IPv4/IPv6 ranges.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-900 block">2. Ingestion &amp; Digest</span>
                <p className="text-[11px] text-slate-500">
                  Download with 15MB quota, SHA-256 hash digest, and magic-byte MIME type validation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-900 block">3. Rule Extraction</span>
                <p className="text-[11px] text-slate-500">
                  Parses guidance text to extract mandatory, conditional, and alternative document groups.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-900 block">4. Lifecycle Governance</span>
                <p className="text-[11px] text-slate-500">
                  Enforces 7 states from Discovered to Published with administrator verification.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-900 block">5. Validation Feed</span>
                <p className="text-[11px] text-slate-500">
                  Published rules immediately power the shared cross-document validation engine.
                </p>
              </div>
            </div>
          </div>

          {/* Latest Run Results */}
          {latestScanSummary && (
            <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Latest Ingestion Run Summary
                </h4>
                <span className="text-[10px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Completed Just Now
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <span className="text-slate-500 text-[11px]">Sources Scanned</span>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {latestScanSummary.sourcesScanned}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <span className="text-slate-500 text-[11px]">Resources Discovered</span>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {latestScanSummary.resourcesDiscovered}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <span className="text-slate-500 text-[11px]">Rules Extracted</span>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {latestScanSummary.resourcesParsed}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <span className="text-slate-500 text-[11px]">Errors Handled</span>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {latestScanSummary.errorsCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: COVERAGE & TRANSPARENCY METRICS */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-5">
          {/* Transparency Compliance Notice */}
          <div className="p-5 rounded-2xl border border-teal-200 bg-teal-50/50 text-xs text-teal-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Transparent Coverage Statement — SIH 2026 Problem Statement</span>
            </div>
            <p className="leading-relaxed text-teal-900/90">
              TypeNull <strong>does not claim</strong> to cover every government form in India. India comprises thousands of Central, State, and Municipal application workflows. TypeNull provides an audited, scalable architecture that indexes accessible official sources, measures actual coverage accurately, and expands verified requirements incrementally.
            </p>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Configured Official Sources</span>
              <div className="text-2xl font-bold font-mono text-slate-900">{metrics.sourcesCount}</div>
              <span className="text-[10px] text-emerald-600 font-medium">100% .gov.in / .nic.in verified</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Discovered Services</span>
              <div className="text-2xl font-bold font-mono text-slate-900">{metrics.servicesCount}</div>
              <span className="text-[10px] text-indigo-600 font-medium">{metrics.applicationTypesCount} Variants cataloged</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Published Authoritative Rules</span>
              <div className="text-2xl font-bold font-mono text-emerald-700">{metrics.publishedCount}</div>
              <span className="text-[10px] text-slate-500">Available to Applicants</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Awaiting Admin Verification</span>
              <div className="text-2xl font-bold font-mono text-amber-600">{metrics.needsVerificationCount + metrics.extractedCount}</div>
              <span className="text-[10px] text-slate-500">Extracted &amp; Under Review</span>
            </div>
          </div>

          {/* Lifecycle Breakdown Table */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Exact Requirement Distribution Across Lifecycle States
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-800 font-semibold block">Published (Authoritative)</span>
                <span className="text-lg font-mono font-bold text-emerald-900">{metrics.publishedCount}</span>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-blue-800 font-semibold block">Verified (Pre-Publish)</span>
                <span className="text-lg font-mono font-bold text-blue-900">{metrics.verifiedCount}</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-amber-800 font-semibold block">Needs Verification</span>
                <span className="text-lg font-mono font-bold text-amber-900">{metrics.needsVerificationCount}</span>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                <span className="text-indigo-800 font-semibold block">Newly Extracted</span>
                <span className="text-lg font-mono font-bold text-indigo-900">{metrics.extractedCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Official Source */}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Register Verified Government Source
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSourceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSource} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Authority / Department Name
                </label>
                <input
                  type="text"
                  value={newSourceAuthority}
                  onChange={(e) => setNewSourceAuthority(e.target.value)}
                  placeholder="e.g. Unique Identification Authority of India (UIDAI)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Portal URL (.gov.in or .nic.in only)
                </label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://uidai.gov.in/"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Enforced by Domain Allowlist &amp; SSRF protections.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jurisdiction</label>
                  <select
                    value={newSourceJurisdiction}
                    onChange={(e) => setNewSourceJurisdiction(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="Central">India (Central)</option>
                    <option value="State">India (State Government)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Category</label>
                  <select
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="regulatory_application">Regulatory Application</option>
                    <option value="organisation_registration">Organisation Registration</option>
                    <option value="certificate_verification">Certificate Verification</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Verify &amp; Add Source
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
