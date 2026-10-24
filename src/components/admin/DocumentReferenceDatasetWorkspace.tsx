import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Eye,
  Archive,
  XCircle,
  Building,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  DocumentReferenceType,
  DocumentReferenceTemplate,
  ReferenceReviewStatus,
} from '../../types';
import {
  fetchReferenceTypes,
  createReferenceType,
  fetchReferenceTemplates,
  updateReferenceReviewStatus,
} from '../../services/documentAuthenticityService';
import { useAuth } from '../../contexts/AuthContext';

export const DocumentReferenceDatasetWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [types, setTypes] = useState<DocumentReferenceType[]>([]);
  const [templates, setTemplates] = useState<DocumentReferenceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReferenceReviewStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Inspect Modal
  const [inspectingTemplate, setInspectingTemplate] = useState<{
    template: DocumentReferenceTemplate;
    docType?: DocumentReferenceType;
  } | null>(null);

  // Status Change Confirmation Modal (Approve, Reject, Retire)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'retire';
    template: DocumentReferenceTemplate;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // New Document Type Modal
  const [isNewTypeModalOpen, setIsNewTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState('');
  const [newTypeAuthority, setNewTypeAuthority] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [typesRes, templatesRes] = await Promise.all([
        fetchReferenceTypes(),
        fetchReferenceTemplates({ includeAllStatuses: true }),
      ]);
      if (typesRes.data) setTypes(typesRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed loading reference dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecuteStatusChange = async () => {
    if (!confirmAction || !user) return;
    const { type, template } = confirmAction;

    let targetStatus: ReferenceReviewStatus = 'approved';
    if (type === 'reject') targetStatus = 'rejected';
    if (type === 'retire') targetStatus = 'retired';

    setIsProcessingAction(true);
    setErrorMsg(null);

    try {
      const { data, error } = await updateReferenceReviewStatus(
        template.id,
        targetStatus,
        user.id,
        actionNotes || undefined
      );

      if (error || !data) {
        throw error || new Error('Status update failed');
      }

      setTemplates((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      setSuccessMsg(
        `Template ${template.version} status successfully updated to "${targetStatus}".`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      setConfirmAction(null);
      setActionNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed updating reference review status.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypeCategory.trim() || !newTypeAuthority.trim()) return;

    setErrorMsg(null);
    try {
      const derivedCode =
        newTypeCode.trim() ||
        `doc_type_${newTypeName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

      const { data, error } = await createReferenceType({
        name: newTypeName.trim(),
        code: derivedCode,
        applicationCategory: newTypeCategory.trim(),
        issuingAuthority: newTypeAuthority.trim(),
        description: newTypeDescription.trim(),
        jurisdiction: 'India',
      });

      if (error || !data) throw error || new Error('Failed creating document type');

      setTypes((prev) => [...prev, data]);
      setSuccessMsg(`Document type "${data.name}" added to reference catalogue.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setIsNewTypeModalOpen(false);
      setNewTypeName('');
      setNewTypeCode('');
      setNewTypeCategory('');
      setNewTypeAuthority('');
      setNewTypeDescription('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating document type.');
    }
  };

  const filteredTemplates = templates.filter((tmpl) => {
    const parentType = types.find((t) => t.id === tmpl.documentTypeId);
    if (statusFilter !== 'all' && tmpl.reviewStatus !== statusFilter) return false;
    if (categoryFilter !== 'all' && parentType?.applicationCategory !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const typeName = (parentType?.name || '').toLowerCase();
    const authority = (parentType?.issuingAuthority || '').toLowerCase();
    const version = tmpl.version.toLowerCase();
    return typeName.includes(q) || authority.includes(q) || version.includes(q);
  });

  const categories = Array.from(new Set(types.map((t) => t.applicationCategory)));

  const getStatusBadge = (status: ReferenceReviewStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'retired':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <Archive className="w-3 h-3" /> Retired
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Central Document Reference Dataset
            </h3>
            <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
              {templates.length} Templates Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative internal catalogue of reference document structures, versioned validation rules, and issuing authority standards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsNewTypeModalOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Document Type</span>
          </Button>
        </div>
      </div>

      {/* Security & Provenance Banner */}
      <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 text-xs text-indigo-900 flex items-start gap-3">
        <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">Reference Provenance &amp; Verification Rules</span>
          <p className="text-[11px] text-indigo-800 leading-relaxed">
            Only templates marked as <strong className="font-semibold">Approved</strong> are evaluated by the comparison engine. Synthetic demonstration references are explicitly tagged and never represented as genuine government-issued originals. Uploaded applicant files are never automatically added to the trusted reference dataset.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference types, authorities, versions..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Category:</span>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending_review">Pending Review</option>
              <option value="retired">Retired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Document Type &amp; Authority</th>
                <th className="py-3 px-3">Version</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Provenance</th>
                <th className="py-3 px-3">Review Status</th>
                <th className="py-3 px-3">Effective Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading reference catalogue...
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No reference templates match the active filters.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tmpl) => {
                  const parentType = types.find((t) => t.id === tmpl.documentTypeId);
                  return (
                    <tr key={tmpl.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {parentType?.name || 'Document Type'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{parentType?.issuingAuthority || 'Issuing Authority'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {tmpl.version}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {parentType?.applicationCategory || 'General'}
                      </td>
                      <td className="py-3 px-3">
                        {tmpl.isSynthetic ? (
                          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                            SYNTHETIC DEMO
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded">
                            {tmpl.provenance.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(tmpl.reviewStatus)}</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {tmpl.effectiveDate}
                        {tmpl.expiryDate && (
                          <span className="block text-[10px] text-slate-400">
                            to {tmpl.expiryDate}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setInspectingTemplate({ template: tmpl, docType: parentType })
                            }
                            className="text-[11px] py-1 px-2 h-7"
                          >
                            <Eye className="w-3 h-3 mr-1 text-slate-500" />
                            Rules
                          </Button>

                          {tmpl.reviewStatus === 'pending_review' && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  setConfirmAction({ type: 'approve', template: tmpl })
                                }
                                className="text-[11px] py-1 px-2 h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setConfirmAction({ type: 'reject', template: tmpl })
                                }
                                className="text-[11px] py-1 px-2 h-7 text-rose-600 border-rose-200 hover:bg-rose-50"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {tmpl.reviewStatus === 'approved' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setConfirmAction({ type: 'retire', template: tmpl })
                              }
                              className="text-[11px] py-1 px-2 h-7 text-slate-600 hover:bg-slate-100"
                            >
                              Retire
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Template Details Modal */}
      {inspectingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  <span>{inspectingTemplate.docType?.name}</span>
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                    {inspectingTemplate.template.version}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {inspectingTemplate.docType?.issuingAuthority} •{' '}
                  {inspectingTemplate.docType?.applicationCategory}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingTemplate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provenance & Review Banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Provenance Classification:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {inspectingTemplate.template.isSynthetic
                    ? 'SYNTHETIC DEMO REFERENCE'
                    : inspectingTemplate.template.provenance.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Review Status:</span>
                <span>{getStatusBadge(inspectingTemplate.template.reviewStatus)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Effective Window:</span>
                <span className="font-mono text-slate-700">
                  {inspectingTemplate.template.effectiveDate}{' '}
                  {inspectingTemplate.template.expiryDate
                    ? `to ${inspectingTemplate.template.expiryDate}`
                    : '(Current Active Version)'}
                </span>
              </div>
              {inspectingTemplate.template.approvalNotes && (
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Reviewer Notes:</span>
                  <p className="text-slate-700 italic">
                    "{inspectingTemplate.template.approvalNotes}"
                  </p>
                </div>
              )}
            </div>

            {/* Expected Headings */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Expected Document Headings
              </h5>
              <div className="flex flex-wrap gap-2">
                {inspectingTemplate.template.expectedHeadings.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Required Fields & Regex Specifications */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Required Statutory Fields &amp; Validation Patterns
              </h5>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Field Label</th>
                      <th className="py-2 px-3">Key</th>
                      <th className="py-2 px-3">Format Regex</th>
                      <th className="py-2 px-3">Mandatory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectingTemplate.template.requiredFields.map((f, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{f.label}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{f.fieldKey}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-700">
                          {f.formatRegex || 'Any text'}
                        </td>
                        <td className="py-2.5 px-3">
                          {f.mandatory ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                              YES
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Optional</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verification Method */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 block font-semibold">
                Official Verification Mechanism:
              </span>
              <p className="text-slate-700 font-mono">
                {inspectingTemplate.template.officialVerificationMethod}
              </p>
              <p className="text-[11px] text-slate-500">
                Source: {inspectingTemplate.template.officialVerificationSource}
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInspectingTemplate(null)}
              >
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Consequential Actions */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  confirmAction.type === 'approve'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : confirmAction.type === 'retire'
                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}
              >
                {confirmAction.type === 'approve' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : confirmAction.type === 'retire' ? (
                  <Archive className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 capitalize">
                  {confirmAction.type} Reference Template
                </h4>
                <p className="text-xs text-slate-500">
                  Version {confirmAction.template.version} (ID: {confirmAction.template.id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmAction.type === 'approve'
                ? 'Approving this reference allows the comparison engine to use it as an authoritative standard for candidate documents.'
                : confirmAction.type === 'retire'
                ? 'Retiring this reference prevents future automatic selections while preserving past assessment history.'
                : 'Rejecting this reference excludes it from the comparison engine.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Administrative Review Note (Optional):
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Reason or regulatory justification..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-18"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction(null)}
                disabled={isProcessingAction}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteStatusChange}
                disabled={isProcessingAction}
                className={
                  confirmAction.type === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : confirmAction.type === 'retire'
                    ? 'bg-slate-700 hover:bg-slate-800 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }
              >
                {isProcessingAction ? 'Processing...' : `Confirm ${confirmAction.type}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Type Modal */}
      {isNewTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <form
            onSubmit={handleCreateType}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Add Supported Document Type</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsNewTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Factory Safety Compliance Certificate"
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Document Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTypeCode}
                    onChange={(e) => setNewTypeCode(e.target.value)}
                    placeholder="e.g. doc_type_factory_safety"
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTypeCategory}
                    onChange={(e) => setNewTypeCategory(e.target.value)}
                    placeholder="e.g. Industrial Safety"
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Issuing Authority <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTypeAuthority}
                  onChange={(e) => setNewTypeAuthority(e.target.value)}
                  placeholder="e.g. Directorate of Factories and Boilers"
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description &amp; Intended Use
                </label>
                <textarea
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  placeholder="Intended application requirements, regulatory scope..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-16"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewTypeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Register Document Type
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
