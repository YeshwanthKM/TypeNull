import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Check,
  X,
  MessageSquare,
  Lock,
  History,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile, InstitutionVerificationStatus, InstitutionVerificationAudit } from '../../types';
import { Button } from '../ui/Button';
import {
  fetchAllInstitutionRegistrations,
  fetchInstitutionVerificationAudits,
  reviewInstitutionRegistration,
} from '../../services/institutionVerificationService';

export const InstitutionVerificationPanel: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.is_admin);

  const [institutions, setInstitutions] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InstitutionVerificationStatus>('all');

  // Selected institution for inspection & action modal
  const [selectedInst, setSelectedInst] = useState<UserProfile | null>(null);
  const [audits, setAudits] = useState<InstitutionVerificationAudit[]>([]);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);

  // Action Dialog State
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_info' | null>(null);
  const [reasonMessage, setReasonMessage] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadInstitutions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchAllInstitutionRegistrations();
    setIsLoading(false);
    if (fetchErr) {
      setError(fetchErr.message || 'Failed to retrieve institution registrations.');
    } else {
      setInstitutions(data);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  // Load audit history when an institution is selected
  const handleSelectInstitution = async (inst: UserProfile) => {
    setSelectedInst(inst);
    setActionType(null);
    setReasonMessage('');
    setActionError(null);
    setActionSuccess(null);
    setIsLoadingAudits(true);
    const { data } = await fetchInstitutionVerificationAudits(inst.id);
    setIsLoadingAudits(false);
    setAudits(data);
  };

  const filteredInstitutions = useMemo(() => {
    return institutions.filter((inst) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (inst.verification_status || 'pending_verification') === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (inst.institution_name || '').toLowerCase().includes(q) ||
        (inst.aicte_permanent_id || '').toLowerCase().includes(q) ||
        (inst.state || '').toLowerCase().includes(q) ||
        (inst.full_name || '').toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [institutions, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      total: institutions.length,
      pending: institutions.filter((i) => (i.verification_status || 'pending_verification') === 'pending_verification').length,
      needsInfo: institutions.filter((i) => i.verification_status === 'additional_info_required').length,
      verified: institutions.filter((i) => i.verification_status === 'verified').length,
      rejected: institutions.filter((i) => i.verification_status === 'rejected').length,
    };
  }, [institutions]);

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !actionType) return;

    if (!isAdmin) {
      setActionError('Administrative clearance required to perform this action.');
      return;
    }

    if (actionType === 'reject' && !reasonMessage.trim()) {
      setActionError('A rejection reason is mandatory.');
      return;
    }

    if (actionType === 'request_info' && !reasonMessage.trim()) {
      setActionError('A clarification message is required.');
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);

    const { success, error: reviewErr } = await reviewInstitutionRegistration({
      institutionId: selectedInst.id,
      action: actionType,
      reasonMessage: reasonMessage.trim() || (actionType === 'approve' ? 'Institutional credentials approved.' : ''),
    });

    setIsSubmittingAction(false);

    if (reviewErr || !success) {
      setActionError(reviewErr?.message || 'Review execution failed.');
    } else {
      setActionSuccess(`Institution ${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'requested for information'} successfully.`);
      await loadInstitutions();
      const { data: updatedAudits } = await fetchInstitutionVerificationAudits(selectedInst.id);
      setAudits(updatedAudits);
      setTimeout(() => {
        setActionType(null);
        setReasonMessage('');
        setActionSuccess(null);
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Administrative Clearance Notice */}
      {!isAdmin ? (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-950 text-xs flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-900 block">AICTE Scrutiny Officer — View-Only Clearance</span>
            <p className="text-amber-800 leading-relaxed">
              You are signed in as an AICTE Scrutiny Officer. You have permission to inspect institution registration dossiers and audit trails. Modifying institution verification status requires Administrative clearance (<code className="font-mono bg-amber-100 px-1 py-0.2 rounded font-semibold">is_admin: true</code>).
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/70 text-teal-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-700 flex-shrink-0" />
            <div>
              <span className="font-bold text-teal-900 block">AICTE Officer — Administrative Verification Clearance</span>
              <p className="text-teal-800 leading-relaxed text-[11px]">
                Authorized to verify institutional identities, request clarifications, and approve registrations for Extension of Approval (EoA) processing.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-200/80 text-teal-900 border border-teal-300 uppercase">
            Admin Clearance Active
          </span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total</span>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{counts.total}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Pending</span>
          <p className="text-2xl font-bold text-amber-900 mt-0.5">{counts.pending}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/60">
          <span className="text-[11px] font-semibold text-orange-800 uppercase tracking-wider block">Needs Info</span>
          <p className="text-2xl font-bold text-orange-900 mt-0.5">{counts.needsInfo}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Verified</span>
          <p className="text-2xl font-bold text-emerald-900 mt-0.5">{counts.verified}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">Rejected</span>
          <p className="text-2xl font-bold text-rose-900 mt-0.5">{counts.rejected}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by institution name, AICTE Permanent ID, state, or nodal officer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'pending_verification', label: 'Pending' },
              { key: 'additional_info_required', label: 'Needs Info' },
              { key: 'verified', label: 'Verified' },
              { key: 'rejected', label: 'Rejected' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === tab.key
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={loadInstitutions}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Institutions Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-700" />
            <p>Loading institution registration records...</p>
          </div>
        ) : filteredInstitutions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No institution registrations match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-3">AICTE Permanent ID</th>
                  <th className="py-3 px-3">Type &amp; State</th>
                  <th className="py-3 px-3">Nodal Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInstitutions.map((inst) => {
                  const currentStatus = inst.verification_status || 'pending_verification';
                  return (
                    <tr
                      key={inst.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => handleSelectInstitution(inst)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {inst.institution_name || inst.full_name || 'Unnamed Institution'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {inst.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {inst.aicte_permanent_id ? (
                          <span className="font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {inst.aicte_permanent_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{inst.institution_type || 'Engineering'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{inst.state || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{inst.full_name || 'N/A'}</div>
                        <div className="text-[11px] text-slate-500">
                          {inst.contact_person_designation || 'Registrar'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            currentStatus === 'verified'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : currentStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : currentStatus === 'additional_info_required'
                              ? 'bg-orange-50 text-orange-800 border border-orange-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {currentStatus === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {currentStatus === 'rejected' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {currentStatus === 'additional_info_required' && <AlertTriangle className="w-3 h-3 text-orange-600" />}
                          {currentStatus === 'pending_verification' && <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{currentStatus.replace(/_/g, ' ')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectInstitution(inst);
                          }}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-teal-700" />}
                        >
                          Review Dossier
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Review Modal */}
      {selectedInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-700" />
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedInst.institution_name || 'Institution Dossier'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  AICTE Permanent ID: <strong className="font-mono text-teal-800">{selectedInst.aicte_permanent_id || 'Not Specified'}</strong> &bull; State: {selectedInst.state || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInst(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verification Status Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Verification Status:</span>
                <span className="font-bold uppercase tracking-wider text-slate-900 font-mono">
                  {(selectedInst.verification_status || 'pending_verification').replace(/_/g, ' ')}
                </span>
              </div>
              {selectedInst.verified_at && (
                <span className="text-[11px] text-slate-500">
                  Verified At: {new Date(selectedInst.verified_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Institutional Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Institution Type</span>
                <p className="font-medium text-slate-800 mt-0.5">{selectedInst.institution_type || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Campus Address</span>
                <p className="font-medium text-slate-800 mt-0.5">{selectedInst.address || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Authorized Representative</span>
                <p className="font-medium text-slate-800 mt-0.5">{selectedInst.full_name || 'N/A'} ({selectedInst.contact_person_designation || 'Registrar'})</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Official Contact</span>
                <p className="font-medium text-slate-800 mt-0.5">{selectedInst.contact_phone || 'N/A'}</p>
              </div>
            </div>

            {selectedInst.verification_reason && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-mono">
                <span className="font-sans font-bold text-[10px] uppercase text-amber-800 block mb-0.5">Recorded Reason / Message:</span>
                {selectedInst.verification_reason}
              </div>
            )}

            {/* Audit History Log */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <History className="w-4 h-4 text-slate-500" />
                <span>Verification Audit Trail</span>
              </div>
              {isLoadingAudits ? (
                <p className="text-xs text-slate-400">Loading audit history...</p>
              ) : audits.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No previous audit actions recorded.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
                  {audits.map((a) => (
                    <div key={a.id} className="p-2.5 bg-white space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold uppercase tracking-wider text-slate-800 font-mono">
                          Action: {a.action}
                        </span>
                        <span className="text-slate-400">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                      {a.reason_or_message && (
                        <p className="text-slate-600 font-mono text-[11px]">{a.reason_or_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Trigger Buttons */}
            {actionType === null ? (
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInst(null)}
                >
                  Close
                </Button>
                {isAdmin ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActionType('request_info')}
                      leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Request Info
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActionType('reject')}
                      leftIcon={<X className="w-3.5 h-3.5" />}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setActionType('approve')}
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                      Approve Verification
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Administrative Clearance Required to Modify Status</span>
                  </div>
                )}
              </div>
            ) : (
              /* Review Form Modal Subview */
              <form onSubmit={handleExecuteReview} className="space-y-4 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {actionType === 'approve'
                      ? 'Confirm Institution Verification Approval'
                      : actionType === 'reject'
                      ? 'Mandatory Reason for Institution Rejection'
                      : 'Message Requesting Additional Information'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setActionType(null);
                      setActionError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                  >
                    Cancel Action
                  </button>
                </div>

                {actionError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {actionSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="reasonMessage" className="block text-xs font-semibold text-slate-700 mb-1">
                    {actionType === 'approve'
                      ? 'Approval Notes (Optional)'
                      : actionType === 'reject'
                      ? 'Rejection Rationale (Mandatory)'
                      : 'Information Required Details (Mandatory)'}
                  </label>
                  <textarea
                    id="reasonMessage"
                    rows={3}
                    required={actionType !== 'approve'}
                    value={reasonMessage}
                    onChange={(e) => setReasonMessage(e.target.value)}
                    placeholder={
                      actionType === 'approve'
                        ? 'Institutional Permanent ID verified against central directory...'
                        : actionType === 'reject'
                        ? 'Provide specific non-compliance reason or fraudulent document citation...'
                        : 'Specify exactly which proofs or clarifications must be supplied...'
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActionType(null);
                      setActionError(null);
                    }}
                    disabled={isSubmittingAction}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmittingAction}
                    className={
                      actionType === 'approve'
                        ? 'bg-emerald-700 hover:bg-emerald-800'
                        : actionType === 'reject'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }
                  >
                    Confirm {actionType === 'approve' ? 'Approval' : actionType === 'reject' ? 'Rejection' : 'Request'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
