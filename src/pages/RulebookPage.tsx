import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Scale,
  Building2,
  Users,
  BadgePercent,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  RegulatorySource,
  AicteRegulatoryRule,
  RegulatoryTopic,
  RuleVerificationStatus,
  ComplianceChecklistItem,
} from '../types/rulebook';
import {
  fetchRegulatorySources,
  fetchRegulatoryRules,
  searchRegulatoryRules,
  getInitialComplianceChecklist,
} from '../services/rulebook/rulebookService';

export const RulebookPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'rules';
  const targetRuleId = searchParams.get('ruleId');

  const [activeTab, setActiveTab] = useState<'rules' | 'library' | 'checklist'>(
    activeTabParam === 'library' || activeTabParam === 'checklist' ? activeTabParam : 'rules'
  );

  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [rules, setRules] = useState<AicteRegulatoryRule[]>([]);
  const [checklist, setChecklist] = useState<ComplianceChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<RegulatoryTopic | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<RuleVerificationStatus | 'all'>('all');

  // Expanded Rule Cards
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadRulebookData() {
      setIsLoading(true);
      const [loadedSources, loadedRules] = await Promise.all([
        fetchRegulatorySources(),
        fetchRegulatoryRules(),
      ]);
      setSources(loadedSources);
      setRules(loadedRules);
      setChecklist(getInitialComplianceChecklist());
      setIsLoading(false);

      if (targetRuleId) {
        setExpandedRuleIds(new Set([targetRuleId]));
      }
    }
    loadRulebookData();
  }, [targetRuleId]);

  const filteredRules = useMemo(() => {
    return searchRegulatoryRules(rules, searchQuery, selectedTopic, selectedStatus);
  }, [rules, searchQuery, selectedTopic, selectedStatus]);

  const toggleExpandRule = (id: string) => {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getTopicIcon = (topic: RegulatoryTopic) => {
    switch (topic) {
      case 'approval_process':
        return <Scale className="w-4 h-4 text-primary-600" />;
      case 'infrastructure':
        return <Building2 className="w-4 h-4 text-emerald-600" />;
      case 'faculty_cadre':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'financial_legal':
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      case 'accreditation':
        return <BadgePercent className="w-4 h-4 text-purple-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: RuleVerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified Statutory
          </span>
        );
      case 'conditional':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Conditional Scope
          </span>
        );
      case 'unverified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Info className="w-3 h-3 text-slate-500" />
            Unverified
          </span>
        );
      case 'superseded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Superseded
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-800 border border-primary-200">
                  <Scale className="w-3.5 h-3.5 text-primary-700" />
                  Official AICTE Standards • Multi-Year Cycle (2024–2027)
                </span>
                <span className="text-xs text-slate-600">Last Verified: October 2026</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                AICTE Regulatory Rulebook & Compliance Guide
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-600 max-w-3xl leading-relaxed">
                Clear, traceable statutory guidance for institutional administrators. Every requirement
                is linked directly to official chapters of the AICTE Approval Process Handbook (APH)
                with plain-language translations and actionable checklists.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/applications/new"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-semibold text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <span>Prepare EoA Application</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Statutory Prototype Disclaimer */}
          <div className="mt-6 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Regulatory Disclaimer:</span> TypeNull
              provides pre-validation, document authentication, and compliance readiness assistance
              based on published AICTE guidelines. TypeNull is an independent institutional evaluation
              prototype and is not an official AICTE portal. Submissions here do not replace official
              AICTE portal filings.
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-slate-200 flex items-center gap-8">
            <button
              onClick={() => {
                setActiveTab('rules');
                setSearchParams({ tab: 'rules' });
              }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'rules'
                  ? 'border-primary-700 text-primary-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Regulatory Rules Explorer ({rules.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('library');
                setSearchParams({ tab: 'library' });
              }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'library'
                  ? 'border-primary-700 text-primary-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Official Documents Library ({sources.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('checklist');
                setSearchParams({ tab: 'checklist' });
              }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'checklist'
                  ? 'border-primary-700 text-primary-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Institutional Compliance Checklist</span>
            </button>
          </div>
        </div>

        {/* TAB 1: RULES EXPLORER */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rules by keyword (e.g., affidavit, faculty ratio, built-up area, UDIN)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value as any)}
                  aria-label="Filter rules by topic"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
                >
                  <option value="all">All Topics</option>
                  <option value="approval_process">Approval Process & EoA</option>
                  <option value="infrastructure">Infrastructure & Land</option>
                  <option value="faculty_cadre">Faculty Cadre & Ratio</option>
                  <option value="financial_legal">Financial & Legal Norms</option>
                  <option value="accreditation">Accreditation Benefits</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  aria-label="Filter rules by verification status"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="verified">Verified Statutory</option>
                  <option value="conditional">Conditional Scope</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
            </div>

            {/* Rules Listing */}
            {isLoading ? (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-3 text-sm text-slate-600">Loading verified AICTE regulatory rules...</p>
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="mt-3 text-base font-semibold text-slate-900">No regulatory rules matched</h3>
                <p className="mt-1 text-sm text-slate-600">Try adjusting your search keywords or topic filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRules.map((rule) => {
                  const isExpanded = expandedRuleIds.has(rule.id);
                  return (
                    <div
                      key={rule.id}
                      id={rule.id}
                      className={`bg-white rounded-xl border transition-all duration-200 shadow-sm overflow-hidden ${
                        targetRuleId === rule.id
                          ? 'border-primary-500 ring-2 ring-primary-100'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Rule Card Header */}
                      <div
                        onClick={() => toggleExpandRule(rule.id)}
                        className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                              {rule.ruleCode}
                            </span>
                            <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                              {getTopicIcon(rule.topic)}
                              {rule.chapterOrAppendix} • {rule.clauseOrSection}
                            </span>
                            {getStatusBadge(rule.verificationStatus)}
                          </div>
                          <h3 className="text-base font-bold text-slate-900">{rule.title}</h3>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {rule.plainLanguageExplanation}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={isExpanded ? 'Collapse rule details' : 'Expand rule details'}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-5 md:p-6 space-y-6">
                          {/* Plain Language Explanation */}
                          <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <h4 className="text-xs font-bold text-primary-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-primary-700" />
                              What this means in plain language
                            </h4>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {rule.plainLanguageExplanation}
                            </p>
                          </div>

                          {/* Official Text Excerpt */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                              Official Statutory Rule Language ({rule.chapterOrAppendix})
                            </h4>
                            <div className="p-3.5 rounded-lg bg-slate-100/80 border border-slate-200 text-xs font-serif text-slate-800 italic leading-relaxed">
                              "{rule.officialTextExcerpt}"
                            </div>
                          </div>

                          {/* Two-Column Action & Evidence Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-slate-200">
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Action Required by Institution
                              </h4>
                              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                                {rule.institutionalAction}
                              </p>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-slate-200">
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-primary-600" />
                                Documentary Evidence & Formats
                              </h4>
                              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                                {rule.complianceEvidence}
                              </p>
                              {rule.dependenciesOrExceptions && (
                                <p className="mt-2 text-xs text-amber-700 font-medium">
                                  Note: {rule.dependenciesOrExceptions}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Footer */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-200">
                            <span>Applicability: {rule.institutionApplicability}</span>
                            <Link
                              to={`/applications/new?ruleId=${rule.id}`}
                              className="inline-flex items-center gap-1 text-primary-700 font-semibold hover:text-primary-800"
                            >
                              <span>Apply rule in EoA Application</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OFFICIAL DOCUMENTS LIBRARY */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-200">
                        {src.shortTitle}
                      </span>
                      <span className="text-xs font-bold text-slate-600 uppercase">
                        {src.academicYearRange}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{src.title}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Authority: {src.issuingAuthority}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">{src.summary}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      Effective: {src.effectiveDate}
                    </span>
                    <a
                      href={src.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800"
                    >
                      <span>View Official Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: COMPLIANCE CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Institutional Statutory Readiness Checklist
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Track your institute's compliance readiness across the core pillars of the 2024–2027
                AICTE Approval Process Handbook before generating your Extension of Approval dossier.
              </p>
            </div>

            <div className="space-y-4">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {item.officialCitation}
                      </span>
                      {getStatusBadge(item.verificationStatus)}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.plainLanguageExplanation}
                    </p>
                    <div className="text-xs text-slate-700 font-medium">
                      Required Action: {item.actionRequired}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/rulebook?tab=rules&ruleId=${item.ruleId}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      Rule Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
