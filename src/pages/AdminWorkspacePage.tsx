import React, { useState, useEffect } from 'react';
import {
  Key,
  Users,
  Building,
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ExternalLink,
  RefreshCw,
  Plus,
  Check,
  Globe,
  Inbox,
  Clock,
  AlertCircle,
  X,
  Shield,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Organisation,
  UserProfile,
  UserRole,
  OrganisationAccessRequest,
} from '../types';
import { getRoleDisplayLabel, getRoleBadgeStyle } from '../utils/roleUtils';
import {
  KNOWLEDGE_BASE_REGISTRY,
  KnowledgeBaseEntry,
} from '../services/knowledgeBase';
import { FormIngestionWorkspace } from '../components/admin/FormIngestionWorkspace';
import {
  fetchOrganisations,
  createOrganisation,
  fetchAllAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
} from '../services/organisationAccessService';

// Default mock profiles for offline evaluation
const DEFAULT_DEMO_USERS: UserProfile[] = [
  {
    id: 'demo-applicant-user',
    full_name: 'Demo Applicant',
    role: 'applicant',
    created_at: '2026-01-10T10:00:00.000Z',
    updated_at: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'demo-officer-user',
    full_name: 'Demo Officer',
    role: 'officer',
    created_at: '2026-01-12T12:00:00.000Z',
    updated_at: '2026-01-12T12:00:00.000Z',
  },
  {
    id: 'demo-administrator-user',
    full_name: 'Demo Administrator',
    role: 'administrator',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
];

export const AdminWorkspacePage: React.FC = () => {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'users' | 'organisations' | 'requests' | 'rules' | 'ingestion' | 'security'
  >('users');

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Organisations state
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Access Requests state
  const [accessRequests, setAccessRequests] = useState<OrganisationAccessRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Review confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'approve' | 'reject';
    request: OrganisationAccessRequest;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);

  // Request details inspection modal
  const [detailsModalRequest, setDetailsModalRequest] = useState<OrganisationAccessRequest | null>(null);

  // Selected KB entry for deep inspect
  const [selectedKb, setSelectedKb] = useState<KnowledgeBaseEntry>(KNOWLEDGE_BASE_REGISTRY[0]);

  // Load profiles
  const loadUsers = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setUsers(DEFAULT_DEMO_USERS);
      return;
    }
    setIsLoadingUsers(true);
    setActionErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setActionErrorMsg(error.message);
        setUsers(DEFAULT_DEMO_USERS);
      } else if (data && data.length > 0) {
        setUsers(
          data.map((r) => ({
            id: r.id,
            full_name: r.full_name,
            role: (r.role as UserRole) || 'applicant',
            created_at: r.created_at,
            updated_at: r.updated_at,
          }))
        );
      } else {
        setUsers(DEFAULT_DEMO_USERS);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error fetching user profiles.');
      setUsers(DEFAULT_DEMO_USERS);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load organisations
  const loadOrganisations = async () => {
    setIsLoadingOrgs(true);
    try {
      const { data, error } = await fetchOrganisations();
      if (!error && data) {
        setOrganisations(data);
      }
    } catch (err) {
      console.warn('[TypeNull] Error loading organisations:', err);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  // Load access requests
  const loadAccessRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const { data, error } = await fetchAllAccessRequests();
      if (!error && data) {
        setAccessRequests(data);
      }
    } catch (err) {
      console.warn('[TypeNull] Error loading access requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadOrganisations();
    loadAccessRequests();
  }, []);

  // Modal accessibility
  useEffect(() => {
    if (confirmModal || detailsModalRequest) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setConfirmModal(null);
          setDetailsModalRequest(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [confirmModal, detailsModalRequest]);

  // Update user role securely using trusted server RPC
  const handleAssignRole = async (targetUserId: string, newRole: UserRole) => {
    setUpdatingUserId(targetUserId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );
      setActionSuccessMsg(`Role successfully updated to "${getRoleDisplayLabel(newRole)}".`);
      setUpdatingUserId(null);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      return;
    }

    try {
      const { error } = await supabase.rpc('assign_user_role', {
        target_user_id: targetUserId,
        target_role: newRole,
      });

      if (error) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', targetUserId);

        if (updateErr) {
          throw new Error(updateErr.message);
        }
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );

      setActionSuccessMsg(`Role successfully updated to "${getRoleDisplayLabel(newRole)}".`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setActionErrorMsg(`Failed to update role: ${err.message || String(err)}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Create new evaluating organisation
  const handleCreateOrganisation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsCreatingOrg(true);
    setActionErrorMsg(null);

    try {
      const { data, error } = await createOrganisation(newOrgName, newOrgCode, 'regulatory_body');

      if (error || !data) {
        throw new Error(error?.message || 'Failed to register organisation.');
      }

      setOrganisations((prev) => [data, ...prev.filter((o) => o.id !== data.id)]);
      setNewOrgName('');
      setNewOrgCode('');
      setActionSuccessMsg(`Organisation "${data.name}" registered successfully.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      setActionErrorMsg(`Failed to register organisation: ${err.message}`);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // Execute review decision (Approve or Reject)
  const handleExecuteDecision = async () => {
    if (!confirmModal || !user) return;
    const { type, request } = confirmModal;

    setIsProcessingDecision(true);
    setActionErrorMsg(null);

    try {
      let result;
      if (type === 'approve') {
        result = await approveAccessRequest(user.id, request.id, reviewNote);
      } else {
        result = await rejectAccessRequest(user.id, request.id, reviewNote);
      }

      if (result.error) {
        throw result.error;
      }

      setActionSuccessMsg(
        `Access request from "${request.user_name || request.user_email}" was ${
          type === 'approve' ? 'approved' : 'rejected'
        } successfully.`
      );
      setConfirmModal(null);
      setReviewNote('');
      await Promise.all([loadAccessRequests(), loadUsers(), loadOrganisations()]);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      setActionErrorMsg(`Review decision error: ${err.message || String(err)}`);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const pendingRequestsCount = accessRequests.filter((r) => r.status === 'pending').length;

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      getRoleDisplayLabel(u.role).toLowerCase().includes(q)
    );
  });

  const filteredRequests = accessRequests.filter((r) => {
    if (requestFilter === 'all') return true;
    return r.status === requestFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Administration Console"
        description="Privileged governance, institutional role provisioning, organisation registry, and statutory rule configuration."
        badge={<StatusBadge status="verified" />}
        breadcrumbs={[
          { label: 'Portal' },
          { label: 'Administration Console' },
        ]}
      />

      {/* Admin Clearance Banner */}
      <div className="p-5 rounded-2xl border border-indigo-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                TypeNull Platform Governance Center
              </h3>
              <span className="text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full">
                Clearance: {getRoleDisplayLabel(profile?.role || 'administrator')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin controls manage platform roles and review institutional organisation access requests. Sensitive applicant documents remain protected under database RLS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Logged as:</span>
          <span className="font-mono text-slate-700 font-semibold">{user?.email}</span>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-sm font-semibold overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts &amp; Roles</span>
          <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded-full">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('organisations')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'organisations'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Organisations ({organisations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Organisation Access Requests</span>
          {pendingRequestsCount > 0 ? (
            <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-2 py-0.5 rounded-full font-bold">
              {pendingRequestsCount} Pending
            </span>
          ) : (
            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded-full">
              {accessRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'rules'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Knowledge Base &amp; Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ingestion')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'ingestion'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Form Ingestion</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security &amp; Audit</span>
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, role, or user ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              isLoading={isLoadingUsers}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Users
            </Button>
          </div>

          {/* Desktop Users Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User Account</th>
                    <th className="py-3 px-4">Display Name</th>
                    <th className="py-3 px-4">Platform Role</th>
                    <th className="py-3 px-4">Organisation Membership</th>
                    <th className="py-3 px-4 text-right">Assign Clearance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isCurrentUser = u.id === user?.id;
                    const isUpdating = updatingUserId === u.id;
                    const badgeStyle = getRoleBadgeStyle(u.role);
                    const userPendingReq = accessRequests.find(
                      (r) => r.user_id === u.id && r.status === 'pending'
                    );

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          <span className="block font-semibold truncate max-w-[180px]">{u.id}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-indigo-700 font-sans font-semibold">
                              (Your Account)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {u.full_name || 'Unspecified'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                          >
                            {getRoleDisplayLabel(u.role)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {userPendingReq ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('requests');
                                setRequestFilter('pending');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors"
                            >
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending: {userPendingReq.organisation_code || 'Organisation'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {u.role === 'officer' ? 'Evaluating Officer' : u.role === 'administrator' ? 'Platform Administrator' : 'Individual User'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            disabled={isUpdating}
                            value={u.role}
                            onChange={(e) => handleAssignRole(u.id, e.target.value as UserRole)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
                          >
                            <option value="applicant">User</option>
                            <option value="officer">Organisation</option>
                            <option value="administrator">Admin</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        No user profiles found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORGANISATIONS */}
      {activeTab === 'organisations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create Organisation Form */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Register Organisation
                </h4>
                <p className="text-xs text-slate-500">
                  Add an evaluating organisation or regulatory authority to the platform.
                </p>
              </div>

              <form onSubmit={handleCreateOrganisation} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Organisation Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="e.g. Ministry of Corporate Affairs - ROC"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Organisation Code / Identifier <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newOrgCode}
                    onChange={(e) => setNewOrgCode(e.target.value)}
                    placeholder="e.g. MCA-ROC (Auto-generated if blank)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used as the unique institutional slug for dossier routing and batch screening.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={isCreatingOrg}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Organisation
                  </Button>
                </div>
              </form>
            </div>

            {/* Organisations List */}
            <div className="md:col-span-2 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Registered Organisations ({organisations.length})</span>
                <Button variant="outline" size="sm" onClick={loadOrganisations} isLoading={isLoadingOrgs}>
                  Refresh
                </Button>
              </div>

              <div className="space-y-3">
                {organisations.map((org) => (
                  <div
                    key={org.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{org.name}</span>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {org.code}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Category: {org.category || 'regulatory_body'} &bull; Registered:{' '}
                        {new Date(org.created_at).toLocaleDateString()}
                      </p>
                      {org.description && (
                        <p className="text-slate-600 text-[11px] line-clamp-1">{org.description}</p>
                      )}
                    </div>

                    <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                ))}

                {organisations.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                    No organisations registered yet. Use the form on the left to add one.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORGANISATION ACCESS REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-500 mr-1">Status Filter:</span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setRequestFilter(filter)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                    requestFilter === filter
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadAccessRequests}
              isLoading={isLoadingRequests}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Requests
            </Button>
          </div>

          {/* Access Requests Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Requesting User</th>
                    <th className="py-3 px-4">Target Organisation</th>
                    <th className="py-3 px-4">Submitted Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Explanation / Review</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const isSelf = req.user_id === user?.id;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {req.user_name || req.user_email || 'User'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{req.user_id}</span>
                          {isSelf && (
                            <span className="text-[10px] text-indigo-700 font-semibold block">
                              (Your Request)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">{req.organisation_name}</span>
                          <span className="font-mono text-[10px] text-slate-500">{req.organisation_code}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(req.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              req.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : req.status === 'rejected'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {req.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {req.status === 'rejected' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                            {req.status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                          {req.explanation ? (
                            <p className="truncate text-[11px]" title={req.explanation}>
                              <span className="font-medium text-slate-700">Reason:</span> {req.explanation}
                            </p>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No justification provided</span>
                          )}
                          {req.review_note && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5 truncate" title={req.review_note}>
                              <span className="font-medium text-slate-700 not-italic">Note:</span> {req.review_note}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {req.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => {
                                    setConfirmModal({ type: 'approve', request: req });
                                    setReviewNote('');
                                  }}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                    isSelf
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                  title={isSelf ? 'Cannot approve own request' : 'Approve request'}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => {
                                    setConfirmModal({ type: 'reject', request: req });
                                    setReviewNote('');
                                  }}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                                    isSelf
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  }`}
                                  title={isSelf ? 'Cannot review own request' : 'Reject request'}
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDetailsModalRequest(req)}
                                className="px-2.5 py-1 rounded text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                        No organisation access requests found matching the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KNOWLEDGE BASE & RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Supported Categories ({KNOWLEDGE_BASE_REGISTRY.length})
              </span>

              <div className="space-y-2">
                {KNOWLEDGE_BASE_REGISTRY.map((kb) => (
                  <div
                    key={kb.id}
                    onClick={() => setSelectedKb(kb)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs ${
                      selectedKb.id === kb.id
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900">{kb.displayName}</span>
                      <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        v{kb.version}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{kb.jurisdiction}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 space-y-5">
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-5 text-xs">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{selectedKb.displayName}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Statutory Authority: {selectedKb.citation.authority}
                    </p>
                  </div>

                  <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {selectedKb.citation.verificationStatus}
                  </span>
                </div>

                {/* Citation Details */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-900 text-xs block">Official Statutory Reference:</span>
                  <p className="text-slate-700 leading-relaxed text-xs">
                    {selectedKb.citation.statute} &mdash; {selectedKb.citation.section}
                  </p>
                  {selectedKb.citation.sourceUrl && (
                    <a
                      href={selectedKb.citation.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <span>Statutory Source URL</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Mandatory Documents Checklist */}
                <div className="space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                    Mandatory Supporting Documents ({selectedKb.mandatoryDocuments.length})
                  </span>
                  <div className="space-y-2">
                    {selectedKb.mandatoryDocuments.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-start justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{doc.name}</span>
                          <p className="text-slate-500 text-[11px] mt-0.5">{doc.description}</p>
                        </div>
                        <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded flex-shrink-0">
                          {doc.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mandatory Fields & Syntax Rules */}
                <div className="space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                    Required Fields &amp; Regulatory Syntax Rules ({selectedKb.mandatoryFields.length})
                  </span>
                  <div className="space-y-2">
                    {selectedKb.mandatoryFields.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{f.label}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            Example: {f.example}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px]">{f.description}</p>
                        {f.regexPattern && (
                          <div className="pt-1">
                            <span className="font-mono text-[10px] bg-slate-50 text-indigo-700 px-2 py-0.5 rounded border border-slate-200">
                              Pattern: /{f.regexPattern}/
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cross-Document Checks */}
                <div className="space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                    Cross-Document Coherence Rules ({selectedKb.crossDocumentChecks.length})
                  </span>
                  <div className="space-y-2">
                    {selectedKb.crossDocumentChecks.map((check, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800">{check.name}</span>
                          <p className="text-[11px] text-slate-500">{check.description}</p>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full ${
                            check.severity === 'blocking'
                              ? 'bg-rose-100 text-rose-800'
                              : check.severity === 'major'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {check.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INGESTION */}
      {activeTab === 'ingestion' && (
        <FormIngestionWorkspace />
      )}

      {/* TAB 6: SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  PostgreSQL Row-Level Security &amp; RBAC Architecture
                </h4>
                <p className="text-xs text-slate-500">
                  Enforces strict tenant isolation across applicant dossiers and evaluating organisations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-bold text-slate-900 block">User Access Requests Policy</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Users may only submit requests for their own account with <code className="font-mono bg-white px-1 py-0.5 rounded border">auth.uid() = user_id</code>. A database partial index prevents duplicate pending requests for the same organisation.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-bold text-slate-900 block">Non-Self-Review Defense</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Administrators cannot review or approve their own organisation access requests. Database triggers and RLS policies reject attempts where <code className="font-mono bg-white px-1 py-0.5 rounded border">auth.uid() = user_id</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-bold text-slate-900 block">Tenancy Scoping</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Approving access to Organisation A grants access strictly to Organisation A&apos;s workspace and screening batches. Cross-organisation evaluation is blocked by PostgreSQL policies on <code className="font-mono bg-white px-1 py-0.5 rounded border">organisation_members</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-bold text-slate-900 block">Client-Side Role Isolation</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Display labels (User, Organisation, Admin) are visual mappings only. The real security boundary is enforced strictly by backend database constraints and Supabase RLS.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Confirmation Modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="confirm-modal-title" className="text-sm font-bold text-slate-900">
                Confirm Access Request {confirmModal.type === 'approve' ? 'Approval' : 'Rejection'}
              </h3>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-semibold text-slate-900">
                  {confirmModal.request.user_name || confirmModal.request.user_email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Organisation:</span>
                <span className="font-semibold text-slate-900">
                  {confirmModal.request.organisation_name} ({confirmModal.request.organisation_code})
                </span>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              {confirmModal.type === 'approve' ? (
                <>
                  Approving this request will grant the user membership in{' '}
                  <strong className="text-slate-900">{confirmModal.request.organisation_name}</strong> and enable them to participate in screening batches for this organisation.
                </>
              ) : (
                <>
                  Rejecting this request will decline access to{' '}
                  <strong className="text-slate-900">{confirmModal.request.organisation_name}</strong>. The user&apos;s existing platform permissions will remain unchanged.
                </>
              )}
            </p>

            <div>
              <label htmlFor="modalReviewNote" className="block font-semibold text-slate-700 mb-1">
                Review Note <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="modalReviewNote"
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Reason or instructions for this decision..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmModal.type === 'approve' ? 'primary' : 'danger'}
                size="sm"
                isLoading={isProcessingDecision}
                onClick={handleExecuteDecision}
              >
                {confirmModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Details Inspection Modal */}
      {detailsModalRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="details-modal-title" className="text-sm font-bold text-slate-900">
                Access Request Details
              </h3>
              <button
                type="button"
                onClick={() => setDetailsModalRequest(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Applicant</span>
                  <span className="font-semibold text-slate-900">
                    {detailsModalRequest.user_name || detailsModalRequest.user_email || 'User'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Organisation</span>
                  <span className="font-semibold text-slate-900">
                    {detailsModalRequest.organisation_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
                  <span className="font-semibold capitalize text-slate-900">
                    {detailsModalRequest.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Submitted Date</span>
                  <span className="font-mono text-slate-700">
                    {new Date(detailsModalRequest.submitted_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {detailsModalRequest.explanation && (
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Submitted Explanation:
                  </span>
                  <p className="text-slate-600 leading-relaxed">{detailsModalRequest.explanation}</p>
                </div>
              )}

              {detailsModalRequest.review_note && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Reviewer Note:
                  </span>
                  <p className="text-slate-600 italic leading-relaxed">{detailsModalRequest.review_note}</p>
                  {detailsModalRequest.reviewed_at && (
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                      Reviewed on {new Date(detailsModalRequest.reviewed_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDetailsModalRequest(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
