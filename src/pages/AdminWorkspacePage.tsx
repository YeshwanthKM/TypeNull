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
  Info,
  Check,
  Globe,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Organisation, UserProfile, UserRole } from '../types';
import {
  KNOWLEDGE_BASE_REGISTRY,
  KnowledgeBaseEntry,
} from '../services/knowledgeBase';
import { FormIngestionWorkspace } from '../components/admin/FormIngestionWorkspace';

export const AdminWorkspacePage: React.FC = () => {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'organisations' | 'rules' | 'ingestion' | 'security'>('users');

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

  // Selected KB entry for deep inspect
  const [selectedKb, setSelectedKb] = useState<KnowledgeBaseEntry>(KNOWLEDGE_BASE_REGISTRY[0]);

  // Load profiles from Supabase
  const loadUsers = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingUsers(true);
    setActionErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setActionErrorMsg(error.message);
      } else if (data) {
        setUsers(
          data.map((r) => ({
            id: r.id,
            full_name: r.full_name,
            role: (r.role as UserRole) || 'applicant',
            created_at: r.created_at,
            updated_at: r.updated_at,
          }))
        );
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error fetching user profiles.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load organisations from Supabase
  const loadOrganisations = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrganisations(data as Organisation[]);
      }
    } catch (err) {
      console.warn('[TypeNull] Error loading organisations:', err);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadOrganisations();
  }, []);

  // Update user role securely using trusted server RPC
  const handleAssignRole = async (targetUserId: string, newRole: UserRole) => {
    if (!isSupabaseConfigured || !supabase) return;

    setUpdatingUserId(targetUserId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      // Call the trusted assign_user_role function
      const { error } = await supabase.rpc('assign_user_role', {
        target_user_id: targetUserId,
        target_role: newRole,
      });

      if (error) {
        // Fallback: direct update if RPC is missing
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

      setActionSuccessMsg(`Role successfully updated to "${newRole}".`);
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
    if (!newOrgName || !newOrgCode || !isSupabaseConfigured || !supabase) return;

    setIsCreatingOrg(true);
    setActionErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('organisations')
        .insert({
          name: newOrgName.trim(),
          code: newOrgCode.trim().toUpperCase(),
          category: 'regulatory_body',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setOrganisations((prev) => [data as Organisation, ...prev]);
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

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
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
                Clearance: {profile?.role || 'administrator'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin controls are strictly separated from Applicant dossier submissions. Sensitive applicant documents remain protected under database RLS.
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
          <span>Form Ingestion &amp; Review</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.5 rounded-full font-bold">
            SIH
          </span>
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
          <span>Security &amp; Audit Status</span>
        </button>
      </div>

      {/* TAB 1: USER ACCOUNTS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Policy Notice Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Role Provisioning Policy</span>
            </div>
            <p className="leading-relaxed">
              Public self-service registration creates standard <strong>Applicant</strong> accounts. Officer and Administrator clearances are provisioned exclusively through trusted administrative procedures. Client-side self-promotion is prevented by PostgreSQL triggers.
            </p>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, ID, or role..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              isLoading={isLoadingUsers}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Profiles
            </Button>
          </div>

          {/* Users List: Mobile Cards (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.map((u) => {
              const isCurrentUser = u.id === user?.id;
              const isUpdating = updatingUserId === u.id;

              return (
                <div
                  key={u.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900">
                          {u.full_name || 'Unspecified'}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] text-indigo-700 font-sans font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            Your Account
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 block truncate mt-0.5 max-w-[220px]">
                        {u.id}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                        u.role === 'administrator'
                          ? 'bg-indigo-100 text-indigo-800'
                          : u.role === 'officer'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    <span>Registered: {new Date(u.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">Assign Clearance:</span>
                    <select
                      disabled={isUpdating}
                      value={u.role}
                      onChange={(e) => handleAssignRole(u.id, e.target.value as UserRole)}
                      className="text-base sm:text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
                    >
                      <option value="applicant">Applicant</option>
                      <option value="officer">Officer</option>
                      <option value="administrator">Administrator</option>
                    </select>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                No user profiles found.
              </div>
            )}
          </div>

          {/* Users Table: Desktop (>= md) */}
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User ID / Profile</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Active Role</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-right">Assign Clearance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isCurrentUser = u.id === user?.id;
                    const isUpdating = updatingUserId === u.id;

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
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full capitalize ${
                              u.role === 'administrator'
                                ? 'bg-indigo-100 text-indigo-800'
                                : u.role === 'officer'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            disabled={isUpdating}
                            value={u.role}
                            onChange={(e) => handleAssignRole(u.id, e.target.value as UserRole)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
                          >
                            <option value="applicant">Applicant</option>
                            <option value="officer">Officer</option>
                            <option value="administrator">Administrator</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        No user profiles found.
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
                  Register Statutory Organisation
                </h4>
                <p className="text-xs text-slate-500">
                  Add an evaluating institution, directorate, or regulatory board to the system.
                </p>
              </div>

              <form onSubmit={handleCreateOrganisation} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Organisation Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="e.g. MCA Registrar of Companies Cell"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Statutory Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrgCode}
                    onChange={(e) => setNewOrgCode(e.target.value)}
                    placeholder="e.g. MCA-ROC-01"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                  />
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
                <span className="font-semibold text-slate-700">Registered Evaluating Bodies ({organisations.length})</span>
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

      {/* TAB 3: KNOWLEDGE BASE & RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Categories Selector */}
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

            {/* Knowledge Base Inspection Panel */}
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

                {/* Mandatory Fields & Regex Patterns */}
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

      {/* TAB 4: FORM INGESTION & DISCOVERY (SIH 2026) */}
      {activeTab === 'ingestion' && <FormIngestionWorkspace />}

      {/* TAB 5: SECURITY & AUDIT STATUS */}
      {activeTab === 'security' && (
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>PostgreSQL RLS Active</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Row-Level Security enabled on <code className="font-mono bg-slate-100 px-1">profiles</code>, <code className="font-mono bg-slate-100 px-1">applications</code>, and <code className="font-mono bg-slate-100 px-1">documents</code>.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Role Protection Trigger</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Function <code className="font-mono bg-slate-100 px-1">protect_profile_role()</code> blocks self-promotion requests from clients.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Private Storage Vault</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Bucket <code className="font-mono bg-slate-100 px-1">application-documents</code> is private; documents accessed only via signed 15m URLs.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Database Access Control Matrix</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Entity / Table</th>
                    <th className="p-3">Applicant Access</th>
                    <th className="p-3">Officer Access</th>
                    <th className="p-3">Administrator Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">public.profiles</td>
                    <td className="p-3 text-slate-600">Own profile only (role read-only)</td>
                    <td className="p-3 text-slate-600">Own profile only</td>
                    <td className="p-3 text-emerald-700 font-semibold">View all &bull; assign roles via RPC</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">public.applications</td>
                    <td className="p-3 text-slate-600">Own dossiers only</td>
                    <td className="p-3 text-slate-600">Assigned organisation dossiers</td>
                    <td className="p-3 text-slate-600">Platform oversight</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">storage.objects</td>
                    <td className="p-3 text-slate-600">Own folder {`{user_id}`} only</td>
                    <td className="p-3 text-slate-600">Authorized batch objects</td>
                    <td className="p-3 text-slate-600">Restricted by backend policy</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-semibold text-slate-800">screening_batches</td>
                    <td className="p-3 text-slate-400">No access</td>
                    <td className="p-3 text-emerald-700 font-semibold">Organisation batches</td>
                    <td className="p-3 text-emerald-700 font-semibold">Organisation batches</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
