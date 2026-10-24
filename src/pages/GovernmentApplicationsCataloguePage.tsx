import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Search,
  Filter,
  Building2,
  FileText,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  Layers,
  Info,
  Landmark,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { GovernmentService, ServiceApplicationType, ApplicationDocumentRequirement } from '../types';
import { getPublishedGovernmentServices } from '../services/ingestion/ingestionService';

interface ApplicationCardItem {
  service: GovernmentService;
  variant: ServiceApplicationType;
  intendedUsers: string;
  typicalSituation: string;
}

export const GovernmentApplicationsCataloguePage: React.FC = () => {
  const navigate = useNavigate();

  const [services, setServices] = useState<GovernmentService[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal Detail State
  const [activeDetailItem, setActiveDetailItem] = useState<ApplicationCardItem | null>(null);

  const loadPublishedApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublishedGovernmentServices();
      setServices(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve published government applications catalogue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPublishedApplications();
  }, []);

  // Map services into individual application cards (each variant represents a runnable application)
  const applicationItems: ApplicationCardItem[] = useMemo(() => {
    const items: ApplicationCardItem[] = [];

    for (const service of services) {
      for (const variant of service.applicationTypes) {
        // Humanize intended users
        let intendedUsers = 'General applicants & enterprises';
        if (variant.applicantCategory === 'corporate_promoter') {
          intendedUsers = 'Corporate Promoters, Founders & Company Directors';
        } else if (variant.applicantCategory === 'taxable_business') {
          intendedUsers = 'Commercial Businesses, Traders & Service Providers';
        } else if (variant.applicantCategory === 'individual_director') {
          intendedUsers = 'Individual Director Applicants';
        } else if (variant.applicantCategory === 'citizen_applicant' || variant.applicantCategory === 'general') {
          intendedUsers = 'Individual Citizens of India';
        } else if (variant.applicantCategory) {
          intendedUsers = variant.applicantCategory.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        }

        // Typical situation
        let typicalSituation = service.description || 'Statutory filing under official government regulations.';
        if (variant.variantCode === 'MCA-SPICE-INC32') {
          typicalSituation =
            'Incorporating a new Private Limited, OPC, or Public Company in India with integrated PAN, TAN, EPFO, and ESIC registrations.';
        } else if (variant.variantCode === 'CBIC-GST-REG01') {
          typicalSituation =
            'Applying for mandatory or voluntary GST registration under CGST Act Section 22 upon crossing aggregate turnover thresholds or initiating inter-state supply.';
        } else if (variant.variantCode === 'MEA-PASS-FORM1') {
          typicalSituation =
            'Applying for fresh issuance or renewal of an ordinary Indian passport for international travel under the Passports Act, 1967.';
        }

        items.push({
          service,
          variant,
          intendedUsers,
          typicalSituation,
        });
      }
    }

    return items;
  }, [services]);

  // Extract unique categories for filtering
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const s of services) {
      if (s.category) cats.add(s.category);
    }
    return Array.from(cats);
  }, [services]);

  // Filtered applications based on search query and category
  const filteredItems = useMemo(() => {
    return applicationItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.service.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchName = item.variant.applicationName.toLowerCase().includes(q);
      const matchService = item.service.serviceName.toLowerCase().includes(q);
      const matchDept = item.service.department.toLowerCase().includes(q);
      const matchVariant = item.variant.variantCode.toLowerCase().includes(q);
      const matchDesc = item.typicalSituation.toLowerCase().includes(q) || (item.service.description || '').toLowerCase().includes(q);
      const matchUsers = item.intendedUsers.toLowerCase().includes(q);

      return matchName || matchService || matchDept || matchVariant || matchDesc || matchUsers;
    });
  }, [applicationItems, searchQuery, selectedCategory]);

  const handleStartValidation = (item: ApplicationCardItem) => {
    setActiveDetailItem(null);
    navigate(`/applications/new?serviceId=${encodeURIComponent(item.service.id)}&variantId=${encodeURIComponent(item.variant.id)}`);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Explore Government Applications"
        description="Browse published Indian government services, understand mandatory document requirements, and explore situational compliance rules before starting your pre-validation dossier."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Explore Applications' },
        ]}
        action={
          <Button
            variant="outline"
            onClick={() => navigate('/applications/new')}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Custom Application
          </Button>
        }
      />

      {/* Search & Category Filter Toolbar */}
      <section aria-label="Catalogue search and filters" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by application name, department, or statutory keyword (e.g., SPICe+, GST, Passport, MCA)..."
              className="w-full pl-10 pr-9 py-2 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono flex-shrink-0">
            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold">
              {filteredItems.length} {filteredItems.length === 1 ? 'Application' : 'Applications'} Available
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            All Categories
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                selectedCategory === cat
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-red-950">Error Loading Applications</p>
            <p className="text-red-800">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPublishedApplications}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Catalogue Cards Grid */}
      {isLoading ? (
        <LoadingState message="Retrieving published government applications catalogue from verified registry..." rows={4} />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xs">
          <EmptyState
            icon={Compass}
            title={searchQuery ? 'No Matching Applications Found' : 'No Published Applications Available'}
            description={
              searchQuery
                ? `No published government applications matched "${searchQuery}". Try adjusting your keywords or clearing the category filter.`
                : 'There are currently no published government applications available in the registry. Check back shortly as new statutory applications are reviewed.'
            }
            action={
              searchQuery ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Reset Search &amp; Filters
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const { service, variant, intendedUsers, typicalSituation } = item;

            // Requirements statistics
            const reqs = variant.requirements || [];
            const mandatoryCount = reqs.filter((r) => r.classification === 'mandatory').length;
            const conditionalCount = reqs.filter((r) => r.classification === 'conditional').length;
            const alternativeCount = reqs.filter((r) => r.classification === 'alternative').length;
            const questionsCount = (variant.conditionalQuestions || []).length;

            return (
              <div
                key={`${service.id}-${variant.id}`}
                className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                {/* Authority & Category Bar */}
                <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-2 bg-slate-50/70">
                  <div className="flex items-center gap-2 text-slate-700 min-w-0">
                    <Landmark className="w-4 h-4 text-teal-700 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 truncate" title={service.department}>
                      {service.department}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold flex-shrink-0">
                    {variant.variantCode}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col space-y-4">
                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug hover:text-teal-800 transition-colors">
                      {variant.applicationName}
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {typicalSituation}
                    </p>
                  </div>

                  {/* Intended Audience */}
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Target Applicant
                    </span>
                    <p className="font-medium text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{intendedUsers}</span>
                    </p>
                  </div>

                  {/* Requirements Preview Badges */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Document Checklist Preview
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {mandatoryCount} Mandatory
                      </span>
                      {conditionalCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                          <HelpCircle className="w-3 h-3 text-amber-600" />
                          {conditionalCount} Conditional
                        </span>
                      )}
                      {alternativeCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                          <Layers className="w-3 h-3 text-blue-600" />
                          {alternativeCount} Alternative
                        </span>
                      )}
                      {questionsCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium font-mono">
                          {questionsCount} Questions
                        </span>
                      )}
                    </div>

                    {/* Brief snippet of mandatory document names */}
                    {reqs.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-2 truncate">
                        Includes: {reqs.slice(0, 3).map((r) => r.documentName).join(', ')}
                        {reqs.length > 3 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto justify-center"
                    onClick={() => setActiveDetailItem(item)}
                    leftIcon={<Info className="w-3.5 h-3.5" />}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto justify-center"
                    onClick={() => handleStartValidation(item)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Start Validation
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Application Detail Modal / Drawer */}
      {activeDetailItem && (
        <ApplicationDetailModal
          item={activeDetailItem}
          onClose={() => setActiveDetailItem(null)}
          onStartValidation={() => handleStartValidation(activeDetailItem)}
        />
      )}
    </div>
  );
};

interface ApplicationDetailModalProps {
  item: ApplicationCardItem;
  onClose: () => void;
  onStartValidation: () => void;
}

const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  item,
  onClose,
  onStartValidation,
}) => {
  const { service, variant, intendedUsers, typicalSituation } = item;

  const mandatoryReqs = (variant.requirements || []).filter((r) => r.classification === 'mandatory');
  const conditionalReqs = (variant.requirements || []).filter((r) => r.classification === 'conditional');
  const alternativeReqs = (variant.requirements || []).filter((r) => r.classification === 'alternative');
  const optionalReqs = (variant.requirements || []).filter((r) => r.classification === 'optional');
  const questions = variant.conditionalQuestions || [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-detail-title"
    >
      <div className="relative bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 md:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                {variant.variantCode}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Version {variant.requirementsVersion || '2024.1'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Published &amp; Verified
              </span>
            </div>
            <h2 id="app-detail-title" className="text-xl font-bold text-slate-900">
              {variant.applicationName}
            </h2>
            <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-teal-700" />
              <span>{service.department}</span>
              <span className="text-slate-300">&bull;</span>
              <span>{service.jurisdiction}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-600 rounded-lg p-1.5"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Statutory Purpose & Typical Situation */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-700" />
              Purpose &amp; Intended Applicability
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {typicalSituation}
            </p>
            <div className="pt-2 border-t border-slate-200 text-xs flex flex-wrap gap-y-2 justify-between items-center text-slate-600">
              <div>
                <span className="font-semibold text-slate-800">Target Applicant: </span>
                {intendedUsers}
              </div>
              {service.officialUrl && (
                <a
                  href={service.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium hover:underline text-xs"
                >
                  Official Government Portal
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Statutory Review & Provenance Note */}
          {variant.adminNotes && (
            <div className="text-xs text-slate-600 bg-teal-50/50 p-3 rounded-lg border border-teal-100 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-teal-950">Statutory Governance: </span>
                <span>{variant.adminNotes}</span>
                {variant.verifiedBy && (
                  <span className="block text-[11px] text-teal-800 mt-0.5 font-mono">
                    Verified By: {variant.verifiedBy}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Mandatory Documents Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Mandatory Required Documents ({mandatoryReqs.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Statutory Requirements</span>
            </div>

            {mandatoryReqs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No mandatory documents specified.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {mandatoryReqs.map((req, idx) => (
                  <DocumentRequirementRow key={req.id || idx} req={req} type="mandatory" />
                ))}
              </div>
            )}
          </div>

          {/* Alternative Document Groups */}
          {alternativeReqs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Accepted Alternative Documents ({alternativeReqs.length})
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">Any One Accepted</span>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {alternativeReqs.map((req, idx) => (
                  <DocumentRequirementRow key={req.id || idx} req={req} type="alternative" />
                ))}
              </div>
            </div>
          )}

          {/* Conditional Documents Section */}
          {conditionalReqs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  Situational Conditional Requirements ({conditionalReqs.length})
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">Triggered by Specific Answers</span>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {conditionalReqs.map((req, idx) => (
                  <DocumentRequirementRow key={req.id || idx} req={req} type="conditional" />
                ))}
              </div>
            </div>
          )}

          {/* Optional Documents */}
          {optionalReqs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Optional Supporting Documents ({optionalReqs.length})
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {optionalReqs.map((req, idx) => (
                  <DocumentRequirementRow key={req.id || idx} req={req} type="optional" />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Questionnaire Preview */}
          {questions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-teal-700" />
                Pre-Validation Questionnaire ({questions.length} Questions)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When you initiate validation, the system will prompt you with the following situational questions to automatically customize your required document list:
              </p>
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-900">
                      {idx + 1}. {q.questionText}
                    </p>
                    {q.helpText && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Note: {q.helpText}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" className="w-full sm:w-auto justify-center" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            className="w-full sm:w-auto justify-center"
            onClick={onStartValidation}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Start Pre-Validation
          </Button>
        </div>
      </div>
    </div>
  );
};

const DocumentRequirementRow: React.FC<{
  req: ApplicationDocumentRequirement;
  type: 'mandatory' | 'conditional' | 'alternative' | 'optional';
}> = ({ req, type }) => {
  return (
    <div className="p-3.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-900">{req.documentName}</span>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
            type === 'mandatory'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : type === 'conditional'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : type === 'alternative'
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {type}
        </span>
      </div>

      {req.sourceEvidenceSnippet && (
        <p className="text-[11px] text-slate-600 italic leading-normal">
          &ldquo;{req.sourceEvidenceSnippet}&rdquo;
        </p>
      )}

      {type === 'alternative' && req.acceptedAlternatives && req.acceptedAlternatives.length > 0 && (
        <p className="text-[11px] text-blue-700 font-medium">
          Accepted alternatives: {req.acceptedAlternatives.join(' / ')}
        </p>
      )}

      {type === 'conditional' && req.conditionExpression && (
        <p className="text-[11px] text-amber-800 font-mono">
          Activated when: {req.conditionExpression}
        </p>
      )}

      {req.requiredFields && req.requiredFields.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-600">Verified fields:</span>
          <div className="flex flex-wrap gap-1">
            {req.requiredFields.map((f) => (
              <code key={f} className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-mono">
                {f}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
