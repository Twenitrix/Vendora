import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Star,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileCheck2,
  FileSignature,
  ShoppingCart,
  Receipt,
  MessageSquare,
  Download,
  Edit3,
  Upload,
} from 'lucide-react';
import { apiClient, downloadProtectedFile, extractErrorMessage } from '../../lib/api';
import {
  CategoryDto,
  CommunicationDto,
  ContractDto,
  InvoiceDto,
  PerformanceReviewDto,
  PurchaseOrderDto,
  VendorDocumentDto,
  VendorDto,
} from '../../types';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { exportToCsv, formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import { EmptyState, ErrorBlock, LoadingBlock, Modal, StatusBadge } from '../../components/ui/Primitives';

export const VendorsListPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [approvalModalVendor, setApprovalModalVendor] = useState<VendorDto | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED'>('APPROVED');
  const [approvalRemarks, setApprovalRemarks] = useState('');

  // Form state for new vendor
  const [form, setForm] = useState({
    vendorCode: '',
    companyName: '',
    businessRegNo: '',
    taxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'United States',
    categoryId: '',
  });

  const { data: categories = [] } = useQuery<CategoryDto[]>({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get('/categories')).data,
  });

  const {
    data: vendors = [],
    isLoading,
    error,
    refetch,
  } = useQuery<VendorDto[]>({
    queryKey: ['vendors', search, statusFilter, categoryFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.approvalStatus = statusFilter;
      if (categoryFilter !== 'ALL') params.categoryId = Number(categoryFilter);
      return (await apiClient.get('/vendors', { params })).data;
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async () => {
      return (
        await apiClient.post('/vendors', {
          ...form,
          categoryId: Number(form.categoryId),
        })
      ).data;
    },
    onSuccess: (created: VendorDto) => {
      notify('Vendor Onboarded', `${created.companyName} (${created.vendorCode}) registered.`);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Failed to create vendor', extractErrorMessage(err), 'error'),
  });

  const approvalMutation = useMutation({
    mutationFn: async () => {
      if (!approvalModalVendor) return;
      return (
        await apiClient.patch(`/vendors/${approvalModalVendor.vendorId}/approval`, {
          status: approvalDecision,
          remarks: approvalRemarks,
        })
      ).data;
    },
    onSuccess: (updated: VendorDto) => {
      notify('Vendor Status Updated', `${updated.companyName} marked as ${updated.approvalStatus}`);
      setApprovalModalVendor(null);
      setApprovalRemarks('');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Approval update failed', extractErrorMessage(err), 'error'),
  });

  const canManageVendors = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER');

  if (isLoading) return <LoadingBlock label="Loading supplier directory..." />;
  if (error) return <ErrorBlock message={extractErrorMessage(error)} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Enterprise Vendor Directory
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Manage supplier onboarding, categorization, compliance approvals, and relationship profiles.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() =>
              exportToCsv(
                'vendora-vendors.csv',
                vendors.map((v) => ({
                  VendorCode: v.vendorCode,
                  CompanyName: v.companyName,
                  Category: v.categoryName,
                  Status: v.approvalStatus,
                  Contact: v.contactPerson,
                  Email: v.email,
                  City: v.city,
                  TotalSpend: v.totalSpend,
                  Rating: v.averageRating ?? 'N/A',
                }))
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-800 bg-white dark:bg-[#101C2C] text-xs font-semibold text-[#172033] dark:text-slate-200 hover:border-[#36D6B0] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {canManageVendors && (
            <button
              onClick={() => {
                setForm({
                  vendorCode: '',
                  companyName: '',
                  businessRegNo: '',
                  taxId: '',
                  contactPerson: '',
                  email: '',
                  phone: '',
                  address: '',
                  city: '',
                  state: '',
                  country: 'United States',
                  categoryId: categories[0]?.categoryId ? String(categories[0].categoryId) : '',
                });
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold hover:opacity-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Onboard Vendor
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, vendor code, contact person, city..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-800 focus:outline-none focus:border-[#36D6B0]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-800 font-medium"
        >
          <option value="ALL">All Approval Statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending Approval</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-800 font-medium"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.categoryName}
            </option>
          ))}
        </select>
      </div>

      {/* Vendors Table */}
      {vendors.length === 0 ? (
        <EmptyState
          title="No matching vendors found"
          description="Try clearing your search filters or onboard a new supplier into Vendora."
        />
      ) : (
        <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Contact &amp; Location</th>
                  <th className="py-3.5 px-4">Total Spend</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800 text-xs">
                {vendors.map((v) => (
                  <tr
                    key={v.vendorId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => navigate(`/vendors/${v.vendorId}`)}
                        className="cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[#10B981]">
                            {v.vendorCode}
                          </span>
                          <span className="font-bold text-[#172033] dark:text-white group-hover:text-[#10B981] transition-colors">
                            {v.companyName}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-0.5">
                          Reg: {v.businessRegNo} • Tax: {v.taxId}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#172033] dark:text-slate-200 font-medium">
                        {v.categoryName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[#172033] dark:text-slate-200">{v.contactPerson}</p>
                      <p className="text-[11px] text-[#667085] dark:text-slate-400">
                        {v.city}, {v.state} ({v.country})
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#172033] dark:text-white">
                      {formatCurrency(v.totalSpend)}
                      <span className="block text-[10px] font-sans font-normal text-[#667085]">
                        {v.totalOrdersCount} POs • {v.activeContractsCount} Contracts
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {v.averageRating ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {v.averageRating.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Unrated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={v.approvalStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/vendors/${v.vendorId}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#36D6B0] hover:text-[#0B1220] font-semibold transition-colors cursor-pointer"
                      >
                        360° Profile
                      </button>
                      {canManageVendors && (
                        <button
                          onClick={() => {
                            setApprovalModalVendor(v);
                            setApprovalDecision(
                              v.approvalStatus === 'APPROVED' ? 'SUSPENDED' : 'APPROVED'
                            );
                            setApprovalRemarks(v.approvalRemarks || '');
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E5EAF0] dark:border-slate-700 hover:border-[#36D6B0] font-semibold transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Vendor Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Onboard New Enterprise Vendor"
        subtitle="Register company legal identifiers, primary contact, and category assignment."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createVendorMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Company Legal Name *</label>
              <input
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="e.g., Hyperion Cloud Networks"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Vendor Category *</label>
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              >
                <option value="">Select Category</option>
                {categories
                  .filter((c) => c.status === 'ACTIVE')
                  .map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Business Registration No *</label>
              <input
                required
                value={form.businessRegNo}
                onChange={(e) => setForm({ ...form, businessRegNo: e.target.value })}
                placeholder="US-DE-9920182"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Tax ID / EIN *</label>
              <input
                required
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="EIN-82-4910293"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Primary Contact Person *</label>
              <input
                required
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="Full Name"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Contact Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="procurement@supplier.io"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Phone Number *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (415) 555-0190"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Custom Vendor Code (Optional)</label>
              <input
                value={form.vendorCode}
                onChange={(e) => setForm({ ...form, vendorCode: e.target.value })}
                placeholder="Auto-generated if blank"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Headquarters Street Address *</label>
            <input
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="100 Enterprise Plaza, Suite 900"
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">City *</label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="San Jose"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">State / Province *</label>
              <input
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="CA"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Country *</label>
              <input
                required
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createVendorMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              {createVendorMutation.isPending ? 'Onboarding...' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Approval / Governance Review Modal */}
      <Modal
        open={!!approvalModalVendor}
        onClose={() => setApprovalModalVendor(null)}
        title={`Vendor Governance Decision — ${approvalModalVendor?.companyName}`}
        subtitle={`Current Status: ${approvalModalVendor?.approvalStatus}`}
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            approvalMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1.5">Select Governance Decision *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['APPROVED', 'REJECTED', 'SUSPENDED'] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setApprovalDecision(st)}
                  className={`py-2.5 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                    approvalDecision === st
                      ? 'bg-[#101C2C] text-white dark:bg-[#36D6B0] dark:text-[#0B1220] border-transparent'
                      : 'border-[#E5EAF0] dark:border-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1.5">Audit &amp; Compliance Remarks *</label>
            <textarea
              required
              rows={3}
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="Document verification rationale, risk score notes, or rejection reason..."
              className="w-full p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setApprovalModalVendor(null)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={approvalMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              {approvalMutation.isPending ? 'Saving...' : 'Confirm Decision'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// VENDOR 360° DETAIL PAGE (7 TABS)
// ============================================================================

export const VendorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const vendorId = Number(id);
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'contracts' | 'orders' | 'invoices' | 'reviews' | 'communications'
  >('overview');

  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState('SOC2 Type II Certificate');
  const [docExpiry, setDocExpiry] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');

  const { data: vendor, isLoading } = useQuery<VendorDto>({
    queryKey: ['vendor', vendorId],
    queryFn: async () => (await apiClient.get(`/vendors/${vendorId}`)).data,
  });

  const { data: categories = [] } = useQuery<CategoryDto[]>({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get('/categories')).data,
  });

  const { data: documents = [] } = useQuery<VendorDocumentDto[]>({
    queryKey: ['vendor-documents', vendorId],
    queryFn: async () => (await apiClient.get(`/vendors/${vendorId}/documents`)).data,
  });

  const { data: contracts = [] } = useQuery<ContractDto[]>({
    queryKey: ['vendor-contracts', vendorId],
    queryFn: async () => (await apiClient.get('/contracts', { params: { vendorId } })).data,
  });

  const { data: orders = [] } = useQuery<PurchaseOrderDto[]>({
    queryKey: ['vendor-orders', vendorId],
    queryFn: async () => (await apiClient.get('/purchase-orders', { params: { vendorId } })).data,
  });

  const { data: invoices = [] } = useQuery<InvoiceDto[]>({
    queryKey: ['vendor-invoices', vendorId],
    queryFn: async () => (await apiClient.get('/invoices', { params: { vendorId } })).data,
  });

  const { data: reviews = [] } = useQuery<PerformanceReviewDto[]>({
    queryKey: ['vendor-reviews', vendorId],
    queryFn: async () => (await apiClient.get(`/vendors/${vendorId}/reviews`)).data,
  });

  const { data: communications = [] } = useQuery<CommunicationDto[]>({
    queryKey: ['vendor-communications', vendorId],
    queryFn: async () => (await apiClient.get(`/vendors/${vendorId}/communications`)).data,
  });

  const [editForm, setEditForm] = useState({
    companyName: '',
    businessRegNo: '',
    taxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    categoryId: 1,
  });

  const updateMutation = useMutation({
    mutationFn: async () => (await apiClient.put(`/vendors/${vendorId}`, editForm)).data,
    onSuccess: () => {
      notify('Vendor Profile Updated', 'Changes persisted to database.');
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (err) => notify('Update failed', extractErrorMessage(err), 'error'),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (docFile) {
        const fd = new FormData();
        fd.append('documentType', docType);
        if (docExpiry) fd.append('expiryDate', docExpiry);
        fd.append('file', docFile);
        return (
          await apiClient.post(`/vendors/${vendorId}/documents`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        ).data;
      } else {
        return (
          await apiClient.post(`/vendors/${vendorId}/documents/metadata`, {
            documentType: docType,
            expiryDate: docExpiry,
            fileName: `${docType.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          })
        ).data;
      }
    },
    onSuccess: () => {
      notify('Document Uploaded', 'Compliance document registered for verification.');
      setUploadOpen(false);
      setDocFile(null);
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', vendorId] });
    },
    onError: (err) => notify('Upload failed', extractErrorMessage(err), 'error'),
  });

  const sendCommMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post(`/vendors/${vendorId}/communications`, {
          vendorId,
          subject: msgSubject,
          message: msgBody,
        })
      ).data,
    onSuccess: () => {
      notify('Message Dispatched', 'Communication logged in vendor history.');
      setMsgSubject('');
      setMsgBody('');
      queryClient.invalidateQueries({ queryKey: ['vendor-communications', vendorId] });
    },
    onError: (err) => notify('Message failed', extractErrorMessage(err), 'error'),
  });

  if (isLoading || !vendor) return <LoadingBlock label="Loading 360° vendor dossier..." />;

  const canApprove = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER');

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/vendors')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#667085] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vendors
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditForm({
                companyName: vendor.companyName,
                businessRegNo: vendor.businessRegNo,
                taxId: vendor.taxId,
                contactPerson: vendor.contactPerson,
                email: vendor.email,
                phone: vendor.phone,
                address: vendor.address,
                city: vendor.city,
                state: vendor.state,
                country: vendor.country,
                categoryId: vendor.categoryId,
              });
              setEditOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 bg-white dark:bg-[#101C2C] text-xs font-semibold cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] text-xs font-bold cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Compliance Doc
          </button>
        </div>
      </div>

      {/* Hero Summary Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#101C2C] dark:bg-[#36D6B0]/15 text-[#36D6B0] flex items-center justify-center font-black text-xl shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#10B981]">
                  {vendor.vendorCode}
                </span>
                <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
                  {vendor.companyName}
                </h2>
                <StatusBadge status={vendor.approvalStatus} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#667085] dark:text-slate-400 mt-2">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {vendor.address}, {vendor.city}, {vendor.state}, {vendor.country}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {vendor.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {vendor.phone}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E5EAF0] dark:border-slate-800">
            <div className="text-right">
              <p className="text-[11px] uppercase text-[#667085] dark:text-slate-400">Cumulative Spend</p>
              <p className="text-base font-extrabold font-mono text-[#172033] dark:text-white">
                {formatCurrency(vendor.totalSpend)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase text-[#667085] dark:text-slate-400">Active Contracts</p>
              <p className="text-base font-extrabold text-[#172033] dark:text-white">
                {vendor.activeContractsCount}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase text-[#667085] dark:text-slate-400">Overall Score</p>
              <p className="text-base font-extrabold text-amber-500 flex items-center justify-end gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {vendor.averageRating ? vendor.averageRating.toFixed(2) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* 7 Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-6 pt-4 border-t border-[#E5EAF0] dark:border-slate-800">
          {(
            [
              { id: 'overview', label: 'Overview', icon: Building2 },
              { id: 'documents', label: `Documents (${documents.length})`, icon: FileCheck2 },
              { id: 'contracts', label: `Contracts (${contracts.length})`, icon: FileSignature },
              { id: 'orders', label: `Purchase Orders (${orders.length})`, icon: ShoppingCart },
              { id: 'invoices', label: `Invoices (${invoices.length})`, icon: Receipt },
              { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
              { id: 'communications', label: `Communications (${communications.length})`, icon: MessageSquare },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#101C2C] text-white dark:bg-[#36D6B0] dark:text-[#0B1220]'
                    : 'text-[#667085] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-[#172033] dark:text-white">
              Corporate &amp; Tax Registration Details
            </h3>
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-[#667085] dark:text-slate-400">Business Registration No.</dt>
                <dd className="font-mono font-semibold mt-0.5">{vendor.businessRegNo}</dd>
              </div>
              <div>
                <dt className="text-[#667085] dark:text-slate-400">Tax ID / EIN</dt>
                <dd className="font-mono font-semibold mt-0.5">{vendor.taxId}</dd>
              </div>
              <div>
                <dt className="text-[#667085] dark:text-slate-400">Assigned Category</dt>
                <dd className="font-semibold mt-0.5">{vendor.categoryName}</dd>
              </div>
              <div>
                <dt className="text-[#667085] dark:text-slate-400">Registration Date</dt>
                <dd className="font-semibold mt-0.5">{formatDate(vendor.registrationDate)}</dd>
              </div>
              <div>
                <dt className="text-[#667085] dark:text-slate-400">Primary Contact</dt>
                <dd className="font-semibold mt-0.5">{vendor.contactPerson}</dd>
              </div>
              <div>
                <dt className="text-[#667085] dark:text-slate-400">Internal Account Manager</dt>
                <dd className="font-semibold mt-0.5">{vendor.managedByName || 'Procurement Team'}</dd>
              </div>
            </dl>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-[#172033] dark:text-white">
              Compliance &amp; Approval Governance
            </h3>
            <p className="text-xs text-[#667085] dark:text-slate-300 leading-relaxed">
              {vendor.approvalRemarks || 'No additional compliance remarks recorded.'}
            </p>
            {canApprove && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={async () => {
                    await apiClient.patch(`/vendors/${vendor.vendorId}/approval`, {
                      status: 'APPROVED',
                      remarks: 'Approved via Vendor 360° Executive Control',
                    });
                    notify('Vendor Approved', `${vendor.companyName} is now APPROVED.`);
                    queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Vendor
                </button>
                <button
                  onClick={async () => {
                    await apiClient.patch(`/vendors/${vendor.vendorId}/approval`, {
                      status: 'REJECTED',
                      remarks: 'Rejected during compliance review',
                    });
                    notify('Vendor Rejected', `${vendor.companyName} marked REJECTED.`, 'info');
                    queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verified By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
              {documents.map((d) => (
                <tr key={d.documentId}>
                  <td className="py-3 px-4 font-semibold">{d.documentType}</td>
                  <td className="py-3 px-4">{formatDateTime(d.uploadedAt)}</td>
                  <td className="py-3 px-4">
                    {formatDate(d.expiryDate)}
                    {d.expiringSoon && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Expiring Soon
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={d.verificationStatus} />
                  </td>
                  <td className="py-3 px-4">{d.verifiedByName || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => downloadProtectedFile(d.fileUrl, d.originalFileName)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold hover:bg-[#36D6B0] hover:text-[#0B1220] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: CONTRACTS */}
      {activeTab === 'contracts' && (
        <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
                <th className="py-3 px-4">Contract #</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
              {contracts.map((c) => (
                <tr key={c.contractId}>
                  <td className="py-3 px-4 font-mono font-bold">{c.contractNumber}</td>
                  <td className="py-3 px-4 font-semibold">{c.title}</td>
                  <td className="py-3 px-4">
                    {formatDate(c.startDate)} → {formatDate(c.endDate)} ({c.daysRemaining}d)
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold">{formatCurrency(c.contractValue)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: PURCHASE ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Expected Delivery</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
              {orders.map((o) => (
                <tr
                  key={o.poId}
                  onClick={() => navigate(`/purchase-orders/${o.poId}`)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#10B981]">{o.poNumber}</td>
                  <td className="py-3 px-4">{formatDate(o.orderDate)}</td>
                  <td className="py-3 px-4">{formatDate(o.expectedDeliveryDate)}</td>
                  <td className="py-3 px-4 font-mono font-semibold">{formatCurrency(o.totalAmount)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">PO Reference</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4">Approval</th>
                <th className="py-3 px-4">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.invoiceId}>
                  <td className="py-3 px-4 font-mono font-bold">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 font-mono">{inv.poNumber}</td>
                  <td className="py-3 px-4 font-mono font-semibold">{formatCurrency(inv.totalAmount)}</td>
                  <td className="py-3 px-4 font-mono">{formatCurrency(inv.outstandingBalance)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.approvalStatus} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.reviewId}
              className="p-4 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#10B981]">{r.poNumber}</span>
                  <span className="text-[#667085]">Reviewed by {r.reviewedByName}</span>
                  <span className="text-slate-400">• {formatDate(r.reviewDate)}</span>
                </div>
                <p className="mt-1.5 text-[#172033] dark:text-slate-200">{r.comments}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase text-[#667085] block">Overall Score</span>
                  <span className="text-lg font-extrabold text-amber-500">{r.overallScore} / 5.00</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: COMMUNICATIONS */}
      {activeTab === 'communications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {communications.map((c) => (
              <div
                key={c.communicationId}
                className="p-4 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172033] dark:text-white">{c.subject}</span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-[#667085] dark:text-slate-300 mt-1.5 leading-relaxed">{c.message}</p>
                <p className="text-[10px] text-slate-400 mt-2">
                  Sent by {c.senderName} ({c.senderRole}) • {formatDateTime(c.sentAt)}
                </p>
              </div>
            ))}
          </div>
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 h-fit">
            <h4 className="text-sm font-bold mb-3">Send Message to Thread</h4>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendCommMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <input
                required
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
                placeholder="Subject line..."
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
              <textarea
                required
                rows={4}
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Write official procurement message..."
                className="w-full p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
              <button
                type="submit"
                disabled={sendCommMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Vendor Profile — ${vendor.companyName}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Company Name *</label>
              <input
                required
                value={editForm.companyName}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Category *</label>
              <select
                value={editForm.categoryId}
                onChange={(e) => setEditForm({ ...editForm, categoryId: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              >
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.categoryName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Contact Person *</label>
              <input
                required
                value={editForm.contactPerson}
                onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Phone *</label>
              <input
                required
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Compliance Document"
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            uploadDocMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1">Document Type *</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            >
              <option value="SOC2 Type II Certificate">SOC2 Type II Certificate</option>
              <option value="ISO 27001 / ISO 9001 Certificate">ISO 27001 / ISO 9001 Certificate</option>
              <option value="Tax Registration (W-9 / W-8BEN)">Tax Registration (W-9 / W-8BEN)</option>
              <option value="Commercial Liability Insurance">Commercial Liability Insurance</option>
              <option value="Certificate of Incorporation">Certificate of Incorporation</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Expiration Date</label>
            <input
              type="date"
              value={docExpiry}
              onChange={(e) => setDocExpiry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Select File (PDF, PNG, DOCX up to 15MB)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="w-full text-xs"
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
              disabled={uploadDocMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Upload &amp; Submit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
