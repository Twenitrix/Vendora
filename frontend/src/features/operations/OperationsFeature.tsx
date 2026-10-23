import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tags,
  Plus,
  Search,
  Edit3,
  Trash2,
  FileCheck2,
  Upload,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle,
  FileSignature,
  Calendar,
} from 'lucide-react';
import { apiClient, downloadProtectedFile, extractErrorMessage } from '../../lib/api';
import { CategoryDto, ContractDto, VendorDocumentDto, VendorDto } from '../../types';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import { EmptyState, LoadingBlock, Modal, StatusBadge } from '../../components/ui/Primitives';

// ============================================================================
// MODULE 4: VENDOR CATEGORIES PAGE
// ============================================================================

export const CategoriesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [form, setForm] = useState({ categoryName: '', description: '', status: 'ACTIVE' });

  const { data: categories = [], isLoading } = useQuery<CategoryDto[]>({
    queryKey: ['categories', search],
    queryFn: async () =>
      (await apiClient.get('/categories', { params: search ? { search } : {} })).data,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return (await apiClient.put(`/categories/${editing.categoryId}`, form)).data;
      }
      return (await apiClient.post('/categories', form)).data;
    },
    onSuccess: () => {
      notify(editing ? 'Category Updated' : 'Category Created', form.categoryName);
      setModalOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => notify('Category action failed', extractErrorMessage(err), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/categories/${id}`)).data,
    onSuccess: () => {
      notify('Category Deleted', 'Unused category removed.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => notify('Cannot delete category', extractErrorMessage(err), 'error'),
  });

  const canManage = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN');

  if (isLoading) return <LoadingBlock label="Loading vendor categories..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Vendor Categories &amp; Taxonomy
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Organize suppliers by domain, track category spend, and enforce relational integrity.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setForm({ categoryName: '', description: '', status: 'ACTIVE' });
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Category
          </button>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name or description..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.categoryId}
            className="p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#36D6B0]/15 text-[#10B981] flex items-center justify-center shrink-0">
                  <Tags className="w-4 h-4" />
                </div>
                <StatusBadge status={cat.status} />
              </div>
              <h3 className="text-base font-bold text-[#172033] dark:text-white mt-3">
                {cat.categoryName}
              </h3>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 leading-relaxed">
                {cat.description || 'Standard procurement category.'}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-[#E5EAF0] dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#172033] dark:text-white">{cat.vendorCount}</span>{' '}
                <span className="text-[#667085]">Vendors</span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="font-mono font-semibold text-[#10B981]">
                  {formatCurrency(cat.totalSpend)}
                </span>
              </div>

              {canManage && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditing(cat);
                      setForm({
                        categoryName: cat.categoryName,
                        description: cat.description || '',
                        status: cat.status,
                      });
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    title="Edit category"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(cat.categoryId)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 cursor-pointer"
                    title="Delete if unused"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Vendor Category' : 'Create Vendor Category'}
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1">Category Name *</label>
            <input
              required
              value={form.categoryName}
              onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              {editing ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 5: DOCUMENT & COMPLIANCE CENTER PAGE
// ============================================================================

export const DocumentsCompliancePage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [docType, setDocType] = useState('SOC2 Type II Compliance');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useQuery<VendorDocumentDto[]>({
    queryKey: ['documents', statusFilter],
    queryFn: async () =>
      (
        await apiClient.get('/documents', {
          params: statusFilter !== 'ALL' ? { status: statusFilter } : {},
        })
      ).data,
  });

  const { data: vendors = [] } = useQuery<VendorDto[]>({
    queryKey: ['vendors'],
    queryFn: async () => (await apiClient.get('/vendors')).data,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const vId = user?.vendorId || Number(selectedVendorId);
      if (!vId) throw new Error('Please select a vendor');
      if (file) {
        const fd = new FormData();
        fd.append('documentType', docType);
        if (expiryDate) fd.append('expiryDate', expiryDate);
        fd.append('file', file);
        return (
          await apiClient.post(`/vendors/${vId}/documents`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        ).data;
      } else {
        return (
          await apiClient.post(`/vendors/${vId}/documents/metadata`, {
            documentType: docType,
            expiryDate,
            fileName: `${docType.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          })
        ).data;
      }
    },
    onSuccess: () => {
      notify('Document Uploaded', 'Compliance certificate registered.');
      setUploadOpen(false);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => notify('Upload failed', extractErrorMessage(err), 'error'),
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (
        await apiClient.patch(`/documents/${id}/verification`, {
          status,
          remarks: `Document marked ${status} by ${user?.name}`,
        })
      ).data,
    onSuccess: (updated: VendorDocumentDto) => {
      notify('Verification Recorded', `${updated.documentType} marked ${updated.verificationStatus}`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Verification failed', extractErrorMessage(err), 'error'),
  });

  const canVerify = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER');

  if (isLoading) return <LoadingBlock label="Loading compliance document vault..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Document &amp; Compliance Center
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Verify supplier certifications, monitor approaching expirations, and enforce private file downloads.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <button
            onClick={() => {
              setSelectedVendorId(
                user?.vendorId ? String(user.vendorId) : vendors[0]?.vendorId ? String(vendors[0].vendorId) : ''
              );
              setUploadOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="No compliance documents found"
          description="Upload vendor tax forms, ISO certificates, or liability insurance records."
        />
      ) : (
        <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">Document Type</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Verified By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
                {documents.map((d) => (
                  <tr key={d.documentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-bold text-[#10B981] block">
                        {d.vendorCode}
                      </span>
                      <span className="font-semibold text-[#172033] dark:text-white">
                        {d.vendorName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-[#36D6B0]" />
                        {d.documentType}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#667085]">{formatDateTime(d.uploadedAt)}</td>
                    <td className="py-3.5 px-4">
                      <span>{formatDate(d.expiryDate)}</span>
                      {d.expiringSoon && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" /> Expiring Soon
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={d.verificationStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-[#667085]">{d.verifiedByName || '—'}</td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => downloadProtectedFile(d.fileUrl, d.originalFileName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold hover:bg-[#36D6B0] hover:text-[#0B1220] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        File
                      </button>
                      {canVerify && d.verificationStatus === 'PENDING' && (
                        <>
                          <button
                            onClick={() =>
                              verifyMutation.mutate({ id: d.documentId, status: 'VERIFIED' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verify
                          </button>
                          <button
                            onClick={() =>
                              verifyMutation.mutate({ id: d.documentId, status: 'REJECTED' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Compliance Document"
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            uploadMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          {!user?.vendorId && (
            <div>
              <label className="block font-semibold mb-1">Vendor *</label>
              <select
                required
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              >
                {vendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.companyName} ({v.vendorCode})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block font-semibold mb-1">Document Type *</label>
            <input
              required
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Document File (PDF / Image / Word)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Upload Document
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 6: CONTRACT MANAGEMENT PAGE
// ============================================================================

export const ContractsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailContract, setDetailContract] = useState<ContractDto | null>(null);
  const [form, setForm] = useState({
    vendorId: '',
    title: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    contractValue: '125000.00',
    terms: 'Master Service Agreement — Net 30 Payment Terms, 99.9% SLA availability, annual compliance audit.',
    status: 'ACTIVE',
  });

  const { data: contracts = [], isLoading } = useQuery<ContractDto[]>({
    queryKey: ['contracts', statusFilter],
    queryFn: async () =>
      (
        await apiClient.get('/contracts', {
          params: statusFilter !== 'ALL' ? { status: statusFilter } : {},
        })
      ).data,
  });

  const { data: vendors = [] } = useQuery<VendorDto[]>({
    queryKey: ['vendors'],
    queryFn: async () => (await apiClient.get('/vendors')).data,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post('/contracts', {
          ...form,
          vendorId: Number(form.vendorId),
          contractValue: Number(form.contractValue),
        })
      ).data,
    onSuccess: (created: ContractDto) => {
      notify('Contract Registered', `${created.contractNumber} — ${created.title}`);
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Failed to create contract', extractErrorMessage(err), 'error'),
  });

  const canManage = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER');

  if (isLoading) return <LoadingBlock label="Loading enterprise contracts..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Enterprise Contract Lifecycle Management
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Track master service agreements, financial ceilings, validity periods, and renewal alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 font-semibold"
          >
            <option value="ALL">All Contracts</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Within 30 Days</option>
            <option value="DRAFT">Draft</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          {canManage && (
            <button
              onClick={() => {
                setForm({
                  ...form,
                  vendorId: vendors[0]?.vendorId ? String(vendors[0].vendorId) : '',
                });
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Contract
            </button>
          )}
        </div>
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          title="No contracts match the selected filter"
          description="Create a new vendor contract or switch the status filter."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {contracts.map((c) => (
            <div
              key={c.contractId}
              className="p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#10B981]">
                    {c.contractNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    {c.expiringSoon && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Expiring in {c.daysRemaining}d
                      </span>
                    )}
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-[#172033] dark:text-white mt-2">
                  {c.title}
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                  Vendor: <strong className="text-[#172033] dark:text-slate-200">{c.vendorName}</strong> ({c.vendorCode})
                </p>
                <p className="text-xs text-[#667085] dark:text-slate-400 mt-2 line-clamp-2">
                  {c.terms}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E5EAF0] dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] uppercase text-[#667085] block">Contract Value</span>
                    <span className="font-mono font-bold text-sm text-[#172033] dark:text-white">
                      {formatCurrency(c.contractValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#667085] block">Validity Period</span>
                    <span className="font-medium inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(c.startDate)} → {formatDate(c.endDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetailContract(c)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold hover:bg-[#36D6B0] hover:text-[#0B1220] cursor-pointer"
                  >
                    Inspect
                  </button>
                  {c.documentUrl && (
                    <button
                      onClick={() => downloadProtectedFile(c.documentUrl!, `${c.contractNumber}.pdf`)}
                      className="p-1.5 rounded-lg border border-[#E5EAF0] dark:border-slate-700 hover:border-[#36D6B0] cursor-pointer"
                      title="Download Contract PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Contract Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Execute New Vendor Contract"
        subtitle="Validate contract value and start/end dates."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Vendor *</label>
              <select
                required
                value={form.vendorId}
                onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              >
                {vendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.companyName} ({v.vendorCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Contract Ceiling Value (USD) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={form.contractValue}
                onChange={(e) => setForm({ ...form, contractValue: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Contract Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Global Enterprise Cloud & Security SLA 2026"
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Effective Start Date *</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Expiration Date *</label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Terms, SLAs &amp; Clauses *</label>
            <textarea
              required
              rows={3}
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
              className="w-full p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Execute Contract
            </button>
          </div>
        </form>
      </Modal>

      {/* Contract Detail Modal */}
      <Modal
        open={!!detailContract}
        onClose={() => setDetailContract(null)}
        title={detailContract?.title || 'Contract Details'}
        subtitle={detailContract?.contractNumber}
      >
        {detailContract && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
              <div>
                <p className="text-[#667085]">Counterparty Vendor</p>
                <p className="text-sm font-bold mt-0.5">{detailContract.vendorName}</p>
              </div>
              <div className="text-right">
                <p className="text-[#667085]">Contract Ceiling</p>
                <p className="text-base font-mono font-extrabold text-[#10B981]">
                  {formatCurrency(detailContract.contractValue)}
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-1">Contractual Terms &amp; SLA Obligations</h4>
              <p className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 leading-relaxed">
                {detailContract.terms}
              </p>
            </div>
            <div className="flex justify-between items-center pt-2">
              <StatusBadge status={detailContract.status} />
              {detailContract.documentUrl && (
                <button
                  onClick={() =>
                    downloadProtectedFile(
                      detailContract.documentUrl!,
                      `${detailContract.contractNumber}.pdf`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
                >
                  <FileSignature className="w-4 h-4" />
                  Download Signed Agreement
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
