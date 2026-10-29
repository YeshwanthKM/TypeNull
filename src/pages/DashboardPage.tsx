import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle2, ShieldAlert, ArrowRight, RefreshCw, Clock, Building, Compass, Scale } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserApplications } from '../services/applications';
import { DbApplication } from '../types';
import { InstitutionVerificationBanner } from '../components/institution/InstitutionVerificationBanner';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isConfigured } = useAuth();

  const [applications, setApplications] = useState<DbApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchErr } = await fetchUserApplications(user.id);

    setIsLoading(false);

    if (fetchErr) {
      setError(fetchErr.message || 'Failed to retrieve applications.');
    } else {
      setApplications(data);
    }
  }, [user, isConfigured]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const totalCount = applications.length;
  const draftCount = applications.filter((a) => a.status === 'draft').length;
  const inReviewCount = applications.filter(
    (a) => a.status === 'under_review' || a.status === 'submitted'
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Institution Dashboard — Extension of Approval"
        description="Prepare institutional Extension of Approval (EoA) applications, review verified AICTE Approval Process Handbook (APH) rules, and monitor compliance readiness."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => navigate('/rulebook')}
              leftIcon={<Scale className="w-4 h-4 text-primary-700" />}
            >
              AICTE Rulebook
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/applications/new')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Prepare EoA Application
            </Button>
          </div>
        }
      />

      {/* Institution Registration Verification Status */}
      <InstitutionVerificationBanner />

      {/* Dedicated AICTE Rulebook Showcase Banner */}
      <div className="p-5 rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50/90 via-slate-50 to-teal-50/50 text-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-100 text-primary-800">
              <Scale className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              AICTE Regulatory Rulebook & Standards Library
            </h2>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-900 border border-primary-200">
              APH 2024–2027 Cycle
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Access plain-language explanations of statutory rules, multi-year EoA provisions, faculty cadre ratios, and non-judicial stamp affidavits. Understand what is mandatory versus conditional before preparing your submission.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rulebook?tab=checklist')}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Checklist
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/rulebook')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Rulebook
          </Button>
        </div>
      </div>

      {/* Supabase Unconfigured Banner */}
      {!isConfigured && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              Supabase Project Connection Pending
            </p>
            <p className="leading-relaxed text-amber-800">
              Live applications are fetched from your Supabase PostgreSQL database. Configure <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code> in your environment file to sync real records.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-red-950">Error Loading Applications</p>
            <p className="text-red-800">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadApplications}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Application Metrics Derived From Real Database Records */}
      <section aria-labelledby="summary-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="summary-heading" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Your Applications Summary
          </h2>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {isConfigured ? `${totalCount} Persisted Records` : 'Awaiting Supabase'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Your Active Applications</span>
              <FileText className="w-4 h-4 text-teal-700" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{totalCount}</p>
            <p className="text-xs text-slate-500 mt-2">
              Total dossiers created under your authenticated account.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Draft Dossiers</span>
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{draftCount}</p>
            <p className="text-xs text-slate-500 mt-2">
              Applications staged for document uploads.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Under Review</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{inReviewCount}</p>
            <p className="text-xs text-slate-500 mt-2">
              Dossiers undergoing verification checks.
            </p>
          </div>
        </div>
      </section>

      {/* Applications List or Empty State */}
      <section aria-labelledby="applications-list-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="applications-list-heading" className="text-base font-bold text-slate-900">
            Recent Applications
          </h2>
          {applications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadApplications}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          )}
        </div>

        {isLoading ? (
          <LoadingState message="Querying your applications from Supabase PostgreSQL..." rows={3} />
        ) : applications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <EmptyState
              icon={FileText}
              title="No Applications Found"
              description="You have not created any validation applications yet. Create an application dossier to initiate cross-document consistency checks and regulatory compliance workflows."
              action={
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/applications/explore')}
                    leftIcon={<Compass className="w-4 h-4 text-teal-700" />}
                  >
                    AICTE EoA Requirements
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/applications/new')}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Create Your First Application
                  </Button>
                </div>
              }
              note="Records are secured via Supabase Row-Level Security (RLS) so each user only sees their own applications."
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Mobile View: Stacked Cards */}
            <div className="block md:hidden divide-y divide-slate-100">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 hover:bg-slate-50 transition-colors space-y-2.5 cursor-pointer"
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-slate-900 text-sm">{app.title}</h3>
                      <div className="text-slate-500 text-xs flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{app.organisation_name}</span>
                      </div>
                    </div>
                    <StatusBadge status={app.status} size="sm" />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-1">
                    <span className="capitalize bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                      {app.category.replace(/_/g, ' ')}
                    </span>
                    <span>{app.jurisdiction}</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(app.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <Link
                      to={`/applications/${app.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-semibold py-1 px-2 rounded hover:bg-teal-50 transition-colors"
                    >
                      View Dossier
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 min-w-[200px]">
                      Application Title &amp; Entity
                    </th>
                    <th scope="col" className="px-6 py-3.5 whitespace-nowrap">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3.5 whitespace-nowrap">
                      Jurisdiction
                    </th>
                    <th scope="col" className="px-6 py-3.5 whitespace-nowrap">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5 whitespace-nowrap">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="font-semibold text-slate-900">{app.title}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{app.organisation_name}</span>
                          {app.registration_number && (
                            <span className="font-mono text-slate-400 whitespace-nowrap">
                              &bull; {app.registration_number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <span className="capitalize">{app.category.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {app.jurisdiction}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>
                            {new Date(app.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          to={`/applications/${app.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-end gap-1 text-teal-700 hover:text-teal-900 font-semibold hover:underline whitespace-nowrap"
                        >
                          View Dossier
                          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
