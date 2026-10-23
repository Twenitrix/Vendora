import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Printer,
  ArrowLeft,
  PackageCheck,
  Edit3,
  Receipt,
  CreditCard,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { apiClient, downloadProtectedFile, extractErrorMessage } from '../../lib/api';
import {
  CategoryDto,
  InvoiceDto,
  PaymentDto,
  PurchaseOrderDto,
  PurchaseOrderItemDto,
  RequisitionDto,
  VendorDto,
} from '../../types';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { exportToCsv, formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import { EmptyState, LoadingBlock, Modal, StatusBadge } from '../../components/ui/Primitives';

// ============================================================================
// SUPPORTING S2P WORKFLOW: PURCHASE REQUISITIONS PAGE
// ============================================================================

export const RequisitionsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Cloud Infrastructure');
  const [priority, setPriority] = useState('HIGH');
  const [neededBy, setNeededBy] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [categoryId, setCategoryId] = useState('');
  const [preferredVendorId, setPreferredVendorId] = useState('');
  const [items, setItems] = useState([
    { itemName: 'Enterprise Server License', description: 'Annual node subscription', quantity: 2, unitPrice: 4500 },
  ]);

  const { data: requisitions = [], isLoading } = useQuery<RequisitionDto[]>({
    queryKey: ['requisitions'],
    queryFn: async () => (await apiClient.get('/requisitions')).data,
  });

  const { data: categories = [] } = useQuery<CategoryDto[]>({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get('/categories')).data,
  });

  const { data: vendors = [] } = useQuery<VendorDto[]>({
    queryKey: ['vendors'],
    queryFn: async () => (await apiClient.get('/vendors', { params: { approvalStatus: 'APPROVED' } })).data,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post('/requisitions', {
          title,
          department,
          priority,
          neededBy,
          categoryId: Number(categoryId),
          preferredVendorId: preferredVendorId ? Number(preferredVendorId) : null,
          items,
        })
      ).data,
    onSuccess: (created: RequisitionDto) => {
      notify('Requisition Submitted', `${created.requisitionNumber} routed for manager approval.`);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Failed to submit requisition', extractErrorMessage(err), 'error'),
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (
        await apiClient.patch(`/requisitions/${id}/approval`, {
          status,
          remarks: `Decision: ${status} via S2P Requisition Engine`,
        })
      ).data,
    onSuccess: (updated: RequisitionDto) => {
      notify(
        `Requisition ${updated.status}`,
        updated.generatedPoId
          ? `Purchase Order automatically generated!`
          : `Status updated to ${updated.status}`
      );
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Action failed', extractErrorMessage(err), 'error'),
  });

  const canApprove = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER');

  if (isLoading) return <LoadingBlock label="Loading internal purchase requisitions..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Purchase Requisitions (Source-to-Pay Intake)
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Internal business requests that automatically generate Purchase Orders upon manager approval.
          </p>
        </div>
        <button
          onClick={() => {
            setCategoryId(categories[0]?.categoryId ? String(categories[0].categoryId) : '');
            setPreferredVendorId(vendors[0]?.vendorId ? String(vendors[0].vendorId) : '');
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Requisition
        </button>
      </div>

      <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
              <th className="py-3.5 px-4">Requisition #</th>
              <th className="py-3.5 px-4">Title &amp; Department</th>
              <th className="py-3.5 px-4">Preferred Vendor</th>
              <th className="py-3.5 px-4">Est. Total</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
            {requisitions.map((r) => (
              <tr key={r.requisitionId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 font-mono font-bold text-[#10B981]">
                  {r.requisitionNumber}
                  <span className="block text-[10px] font-sans font-normal text-[#667085]">
                    By {r.requestedByName}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <p className="font-bold text-[#172033] dark:text-white">{r.title}</p>
                  <p className="text-[11px] text-[#667085]">
                    {r.department} • Priority: {r.priority} • Needed {formatDate(r.neededBy)}
                  </p>
                </td>
                <td className="py-3.5 px-4">{r.preferredVendorName || 'Any Approved Vendor'}</td>
                <td className="py-3.5 px-4 font-mono font-bold">
                  {formatCurrency(r.estimatedAmount)}
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  {r.generatedPoId && (
                    <button
                      onClick={() => navigate(`/purchase-orders/${r.generatedPoId}`)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#36D6B0]/20 text-[#10B981] font-bold cursor-pointer"
                    >
                      View PO →
                    </button>
                  )}
                  {canApprove && r.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        onClick={() =>
                          decideMutation.mutate({ id: r.requisitionId, status: 'APPROVED' })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                      >
                        Approve &amp; Gen PO
                      </button>
                      <button
                        onClick={() =>
                          decideMutation.mutate({ id: r.requisitionId, status: 'REJECTED' })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                      >
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Submit Purchase Requisition"
        subtitle="Approved requisitions automatically generate an official Purchase Order."
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
              <label className="block font-semibold mb-1">Requisition Title *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q4 Cloud Security Nodes"
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Department *</label>
              <input
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Category *</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
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
              <label className="block font-semibold mb-1">Preferred Approved Vendor *</label>
              <select
                required
                value={preferredVendorId}
                onChange={(e) => setPreferredVendorId(e.target.value)}
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
              <label className="block font-semibold mb-1">Needed By Date *</label>
              <input
                type="date"
                required
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-semibold">Requested Line Items *</label>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  required
                  placeholder="Item name"
                  value={it.itemName}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].itemName = e.target.value;
                    setItems(next);
                  }}
                  className="col-span-5 px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
                />
                <input
                  type="number"
                  min={1}
                  required
                  value={it.quantity}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].quantity = Number(e.target.value);
                    setItems(next);
                  }}
                  className="col-span-3 px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
                />
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  required
                  value={it.unitPrice}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].unitPrice = Number(e.target.value);
                    setItems(next);
                  }}
                  className="col-span-4 px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Submit Requisition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 7 & 8: PURCHASE ORDERS LIST & DYNAMIC ITEM CREATION
// ============================================================================

export const PurchaseOrdersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const [vendorId, setVendorId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<PurchaseOrderItemDto[]>([
    { itemName: 'Enterprise Cloud Cluster Node', description: 'Annual subscription', quantity: 2, unitPrice: 5000, taxAmount: 800 },
  ]);

  const { data: orders = [], isLoading } = useQuery<PurchaseOrderDto[]>({
    queryKey: ['purchase-orders', statusFilter, search],
    queryFn: async () =>
      (
        await apiClient.get('/purchase-orders', {
          params: {
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            search: search || undefined,
          },
        })
      ).data,
  });

  const { data: approvedVendors = [] } = useQuery<VendorDto[]>({
    queryKey: ['vendors', 'APPROVED'],
    queryFn: async () =>
      (await apiClient.get('/vendors', { params: { approvalStatus: 'APPROVED' } })).data,
  });

  const createPoMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post('/purchase-orders', {
          vendorId: Number(vendorId),
          expectedDeliveryDate,
          remarks,
          items,
        })
      ).data,
    onSuccess: (created: PurchaseOrderDto) => {
      notify(
        'Purchase Order Created',
        `${created.poNumber} (${formatCurrency(created.totalAmount)}) calculated by backend.`
      );
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      navigate(`/purchase-orders/${created.poId}`);
    },
    onError: (err) => notify('Failed to create PO', extractErrorMessage(err), 'error'),
  });

  const canCreate = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'EMPLOYEE');

  const previewSubtotal = items.reduce(
    (sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0),
    0
  );
  const previewTax = items.reduce((sum, i) => sum + Number(i.taxAmount || 0), 0);

  if (isLoading) return <LoadingBlock label="Loading purchase orders..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Purchase Order Management
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Create multi-item purchase orders, enforce approval workflows, and track goods fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() =>
              exportToCsv(
                'vendora-purchase-orders.csv',
                orders.map((o) => ({
                  PONumber: o.poNumber,
                  Vendor: o.vendorName,
                  OrderDate: o.orderDate,
                  DeliveryDate: o.expectedDeliveryDate,
                  Subtotal: o.subtotalAmount,
                  Tax: o.taxAmount,
                  TotalAmount: o.totalAmount,
                  Status: o.status,
                }))
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-800 bg-white dark:bg-[#101C2C] text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {canCreate && (
            <button
              onClick={() => {
                setVendorId(approvedVendors[0]?.vendorId ? String(approvedVendors[0].vendorId) : '');
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PO number, vendor name, or remarks..."
          className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-800"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-800 font-semibold"
        >
          <option value="ALL">All Order Statuses</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CLOSED">Closed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <EmptyState
          title="No purchase orders found"
          description="Create a new Purchase Order or adjust your search filters."
        />
      ) : (
        <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">Order / ETA</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Remaining Limit</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
                {orders.map((po) => (
                  <tr
                    key={po.poId}
                    onClick={() => navigate(`/purchase-orders/${po.poId}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#10B981]">
                      {po.poNumber}
                      <span className="block text-[10px] font-sans font-normal text-[#667085]">
                        By {po.createdByName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#172033] dark:text-white">
                      {po.vendorName}
                    </td>
                    <td className="py-3.5 px-4 text-[#667085]">
                      {formatDate(po.orderDate)} → {formatDate(po.expectedDeliveryDate)}
                    </td>
                    <td className="py-3.5 px-4">{po.items.length} line(s)</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#172033] dark:text-white">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#667085]">
                      {formatCurrency(po.remainingOrderLimit)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold">
                        Manage →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Enterprise Purchase Order"
        subtitle="Backend recalculates and verifies all line-item subtotals, taxes, and grand totals."
        maxWidth="max-w-3xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPoMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Approved Vendor *</label>
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              >
                {approvedVendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.companyName} ({v.vendorCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                required
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Order Remarks / Delivery Instructions</label>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Deliver to Building B Data Center Receiving Dock"
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>

          {/* Dynamic Line Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-sm">Purchase Order Line Items *</label>
              <button
                type="button"
                onClick={() =>
                  setItems([
                    ...items,
                    { itemName: '', description: '', quantity: 1, unitPrice: 1000, taxAmount: 80 },
                  ])
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#36D6B0]/20 text-[#10B981] font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#E5EAF0] dark:border-slate-800"
              >
                <div className="col-span-4">
                  <label className="text-[10px] text-[#667085] block">Item Name</label>
                  <input
                    required
                    value={item.itemName}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].itemName = e.target.value;
                      setItems(next);
                    }}
                    placeholder="Item description"
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-700"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-[#667085] block">Qty</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].quantity = Number(e.target.value);
                      setItems(next);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-700 font-mono"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] text-[#667085] block">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={item.unitPrice}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].unitPrice = Number(e.target.value);
                      next[idx].taxAmount = Number((Number(e.target.value) * next[idx].quantity * 0.08).toFixed(2));
                      setItems(next);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-700 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-[#667085] block">Tax ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.taxAmount}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].taxAmount = Number(e.target.value);
                      setItems(next);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-700 font-mono"
                  />
                </div>
                <div className="col-span-1 text-right pt-4">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-between">
            <div className="text-xs text-[#667085]">
              Subtotal: <strong className="font-mono">{formatCurrency(previewSubtotal)}</strong> + Tax:{' '}
              <strong className="font-mono">{formatCurrency(previewTax)}</strong>
            </div>
            <div className="text-sm font-extrabold font-mono text-[#10B981]">
              Total: {formatCurrency(previewSubtotal + previewTax)}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPoMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Submit Purchase Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// PURCHASE ORDER DETAIL, ITEM EDITOR & PRINTABLE DOCUMENT
// ============================================================================

export const PurchaseOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const poId = Number(id);
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [editItemsOpen, setEditItemsOpen] = useState(false);
  const [editableItems, setEditableItems] = useState<PurchaseOrderItemDto[]>([]);

  const { data: po, isLoading } = useQuery<PurchaseOrderDto>({
    queryKey: ['purchase-order', poId],
    queryFn: async () => (await apiClient.get(`/purchase-orders/${poId}`)).data,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) =>
      (
        await apiClient.patch(`/purchase-orders/${poId}/approval`, {
          status,
          remarks: `Status transitioned to ${status}`,
        })
      ).data,
    onSuccess: (updated: PurchaseOrderDto) => {
      notify('Order Status Updated', `${updated.poNumber} is now ${updated.status}`);
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Transition failed', extractErrorMessage(err), 'error'),
  });

  const updateItemsMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.put(`/purchase-orders/${poId}/items`, editableItems)).data,
    onSuccess: (updated: PurchaseOrderDto) => {
      notify('Line Items Updated', `New backend total: ${formatCurrency(updated.totalAmount)}`);
      setEditItemsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err) => notify('Item update failed', extractErrorMessage(err), 'error'),
  });

  if (isLoading || !po) return <LoadingBlock label="Loading purchase order document..." />;

  const canApprove = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER');
  const canEditItems =
    hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'EMPLOYEE') &&
    ['PENDING_APPROVAL', 'DRAFT'].includes(po.status);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          onClick={() => navigate('/purchase-orders')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#667085] hover:text-[#172033] dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 bg-white dark:bg-[#101C2C] text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Official PO
          </button>

          {canEditItems && (
            <button
              onClick={() => {
                setEditableItems(po.items.map((i) => ({ ...i })));
                setEditItemsOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 bg-white dark:bg-[#101C2C] text-xs font-semibold cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Line Items
            </button>
          )}

          {canApprove && po.status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={() => statusMutation.mutate('APPROVED')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Order
              </button>
              <button
                onClick={() => statusMutation.mutate('REJECTED')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Reject Order
              </button>
            </>
          )}

          {['APPROVED', 'ISSUED', 'IN_FULFILLMENT'].includes(po.status) && (
            <button
              onClick={() => statusMutation.mutate('DELIVERED')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] text-xs font-bold cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              Record Full Goods Delivery (GRN)
            </button>
          )}
        </div>
      </div>

      {/* Printable Official Purchase Order Sheet */}
      <div className="p-8 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E5EAF0] dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#10B981] font-bold">
                OFFICIAL PURCHASE ORDER
              </span>
              <StatusBadge status={po.status} />
            </div>
            <h2 className="text-2xl font-extrabold font-mono text-[#172033] dark:text-white mt-1">
              {po.poNumber}
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Created by {po.createdByName} on {formatDate(po.orderDate)}
              {po.approvedByName ? ` • Approved by ${po.approvedByName}` : ''}
            </p>
          </div>

          <div className="sm:text-right text-xs space-y-1">
            <p className="text-[#667085]">Supplier Counterparty</p>
            <p className="text-sm font-bold text-[#172033] dark:text-white">{po.vendorName}</p>
            <p className="font-mono text-[#10B981]">{po.vendorCode}</p>
            <p className="text-[#667085]">Expected Delivery: {formatDate(po.expectedDeliveryDate)}</p>
          </div>
        </div>

        {/* Line Items Breakdown Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-3">
            Purchase Order Line Items ({po.items.length})
          </h3>
          <div className="overflow-x-auto border border-[#E5EAF0] dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Item &amp; Specification</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Received</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Tax</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
                {po.items.map((item, index) => (
                  <tr key={item.poItemId || index}>
                    <td className="py-3 px-4 font-mono">{index + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#172033] dark:text-white">{item.itemName}</p>
                      {item.description && (
                        <p className="text-[11px] text-[#667085]">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono">{item.receivedQuantity ?? 0}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(item.taxAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#172033] dark:text-white">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4">
          <div className="max-w-md text-xs space-y-1">
            <span className="font-bold text-[#172033] dark:text-white block">Order Remarks:</span>
            <p className="text-[#667085] dark:text-slate-300">
              {po.remarks || 'Standard enterprise purchase terms apply.'}
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-[#E5EAF0] dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-[#667085]">Subtotal</span>
              <span className="font-mono font-semibold">{formatCurrency(po.subtotalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Total Tax</span>
              <span className="font-mono font-semibold">{formatCurrency(po.taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E5EAF0] dark:border-slate-800 text-sm font-extrabold">
              <span>Grand Total</span>
              <span className="font-mono text-[#10B981]">{formatCurrency(po.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-[#667085] pt-1">
              <span>Invoiced to Date</span>
              <span className="font-mono">{formatCurrency(po.invoicedAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Items Modal */}
      <Modal
        open={editItemsOpen}
        onClose={() => setEditItemsOpen(false)}
        title={`Modify Line Items — ${po.poNumber}`}
        maxWidth="max-w-3xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateItemsMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          {editableItems.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input
                required
                value={it.itemName}
                onChange={(e) => {
                  const next = [...editableItems];
                  next[idx].itemName = e.target.value;
                  setEditableItems(next);
                }}
                className="col-span-5 px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
              <input
                type="number"
                min={1}
                required
                value={it.quantity}
                onChange={(e) => {
                  const next = [...editableItems];
                  next[idx].quantity = Number(e.target.value);
                  setEditableItems(next);
                }}
                className="col-span-2 px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={it.unitPrice}
                onChange={(e) => {
                  const next = [...editableItems];
                  next[idx].unitPrice = Number(e.target.value);
                  setEditableItems(next);
                }}
                className="col-span-3 px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
              />
              <button
                type="button"
                onClick={() =>
                  editableItems.length > 1 &&
                  setEditableItems(editableItems.filter((_, i) => i !== idx))
                }
                className="col-span-2 text-rose-500 flex justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setEditableItems([
                ...editableItems,
                { itemName: 'Additional Item', quantity: 1, unitPrice: 500, taxAmount: 40 },
              ])
            }
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold"
          >
            + Add Item
          </button>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setEditItemsOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateItemsMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Recalculate &amp; Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 9 & 10: INVOICES & PAYMENTS PAGES
// ============================================================================

export const InvoicesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [payModalInvoice, setPayModalInvoice] = useState<InvoiceDto | null>(null);

  const [invForm, setInvForm] = useState({
    poId: '',
    invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    subtotal: '',
    taxAmount: '',
  });

  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMethod: 'WIRE_TRANSFER',
    transactionRef: '',
    remarks: 'Settled via corporate treasury run',
  });

  const { data: invoices = [], isLoading } = useQuery<InvoiceDto[]>({
    queryKey: ['invoices', approvalFilter],
    queryFn: async () =>
      (
        await apiClient.get('/invoices', {
          params: approvalFilter !== 'ALL' ? { approvalStatus: approvalFilter } : {},
        })
      ).data,
  });

  const { data: purchaseOrders = [] } = useQuery<PurchaseOrderDto[]>({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await apiClient.get('/purchase-orders')).data,
  });

  const eligiblePos = purchaseOrders.filter(
    (p) => !['PENDING_APPROVAL', 'REJECTED', 'CANCELLED'].includes(p.status) && p.remainingOrderLimit > 0
  );

  const submitInvoiceMutation = useMutation({
    mutationFn: async () => {
      const selectedPo = purchaseOrders.find((p) => p.poId === Number(invForm.poId));
      if (!selectedPo) throw new Error('Select a valid Purchase Order');
      return (
        await apiClient.post('/invoices', {
          vendorId: selectedPo.vendorId,
          poId: selectedPo.poId,
          invoiceNumber: invForm.invoiceNumber,
          invoiceDate: invForm.invoiceDate,
          dueDate: invForm.dueDate,
          subtotal: Number(invForm.subtotal),
          taxAmount: Number(invForm.taxAmount),
        })
      ).data;
    },
    onSuccess: (created: InvoiceDto) => {
      notify('Invoice Submitted', `${created.invoiceNumber} validated against PO limits.`);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Invoice Validation Failed', extractErrorMessage(err), 'error'),
  });

  const decideInvoiceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (
        await apiClient.patch(`/invoices/${id}/approval`, {
          status,
          remarks: `3-way match decision: ${status}`,
        })
      ).data,
    onSuccess: (updated: InvoiceDto) => {
      notify('Invoice Decision Recorded', `${updated.invoiceNumber} marked ${updated.approvalStatus}`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Approval action failed', extractErrorMessage(err), 'error'),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!payModalInvoice) return;
      return (
        await apiClient.post('/payments', {
          invoiceId: payModalInvoice.invoiceId,
          amount: Number(payForm.amount),
          paymentMethod: payForm.paymentMethod,
          transactionRef: payForm.transactionRef,
          remarks: payForm.remarks,
        })
      ).data;
    },
    onSuccess: (payment: PaymentDto) => {
      notify('Payment Disbursed', `Ref ${payment.transactionRef} (${formatCurrency(payment.amount)}) recorded.`);
      setPayModalInvoice(null);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Payment Validation Failed', extractErrorMessage(err), 'error'),
  });

  const canVerifyOrPay = hasRole('FINANCE', 'SYSTEM_ADMIN', 'PROCUREMENT_ADMIN');

  if (isLoading) return <LoadingBlock label="Loading vendor invoices & 3-way match queue..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Invoice Verification &amp; Payables Control
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Enforce 3-way PO limit validation, verify supplier invoices, and track overdue balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 font-semibold"
          >
            <option value="ALL">All Approval States</option>
            <option value="PENDING">Pending Verification</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <button
            onClick={() => {
              const firstPo = eligiblePos[0];
              setInvForm({
                poId: firstPo ? String(firstPo.poId) : '',
                invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                subtotal: firstPo ? String(firstPo.subtotalAmount) : '10000',
                taxAmount: firstPo ? String(firstPo.taxAmount) : '800',
              });
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Submit Invoice
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Vendor &amp; PO</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Outstanding Balance</th>
                <th className="py-3.5 px-4">Approval</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.invoiceId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#172033] dark:text-white">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#172033] dark:text-white">{inv.vendorName}</p>
                    <p className="text-[11px] font-mono text-[#10B981]">PO: {inv.poNumber}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span>{formatDate(inv.dueDate)}</span>
                    {inv.overdue && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> OVERDUE
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {formatCurrency(inv.outstandingBalance)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={inv.approvalStatus} />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={inv.paymentStatus} />
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    {inv.documentUrl && (
                      <button
                        onClick={() =>
                          downloadProtectedFile(inv.documentUrl!, `${inv.invoiceNumber}.pdf`)
                        }
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                      >
                        PDF
                      </button>
                    )}
                    {canVerifyOrPay && inv.approvalStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() =>
                            decideInvoiceMutation.mutate({
                              id: inv.invoiceId,
                              status: 'APPROVED',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            decideInvoiceMutation.mutate({
                              id: inv.invoiceId,
                              status: 'REJECTED',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {canVerifyOrPay &&
                      inv.approvalStatus === 'APPROVED' &&
                      inv.outstandingBalance > 0 && (
                        <button
                          onClick={() => {
                            setPayModalInvoice(inv);
                            setPayForm({
                              amount: String(inv.outstandingBalance),
                              paymentMethod: 'WIRE_TRANSFER',
                              transactionRef: `TXN-WIRE-${Math.floor(10000 + Math.random() * 90000)}`,
                              remarks: `Settlement for ${inv.invoiceNumber}`,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
                        >
                          Record Payment
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Invoice Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Submit Vendor Invoice"
        subtitle="Validated against Purchase Order ceiling limits."
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitInvoiceMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1">Purchase Order *</label>
            <select
              required
              value={invForm.poId}
              onChange={(e) => {
                const po = purchaseOrders.find((p) => p.poId === Number(e.target.value));
                setInvForm({
                  ...invForm,
                  poId: e.target.value,
                  subtotal: po ? String(po.subtotalAmount) : invForm.subtotal,
                  taxAmount: po ? String(po.taxAmount) : invForm.taxAmount,
                });
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            >
              <option value="">Select Approved PO</option>
              {eligiblePos.map((p) => (
                <option key={p.poId} value={p.poId}>
                  {p.poNumber} — {p.vendorName} (Remaining Limit: {formatCurrency(p.remainingOrderLimit)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Invoice Number *</label>
              <input
                required
                value={invForm.invoiceNumber}
                onChange={(e) => setInvForm({ ...invForm, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={invForm.dueDate}
                onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Subtotal ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={invForm.subtotal}
                onChange={(e) => setInvForm({ ...invForm, subtotal: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Tax Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={invForm.taxAmount}
                onChange={(e) => setInvForm({ ...invForm, taxAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitInvoiceMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Submit Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={!!payModalInvoice}
        onClose={() => setPayModalInvoice(null)}
        title={`Record Payment — ${payModalInvoice?.invoiceNumber}`}
        subtitle={`Outstanding Balance: ${formatCurrency(payModalInvoice?.outstandingBalance)}`}
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            recordPaymentMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1">Disbursement Amount (USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={payModalInvoice?.outstandingBalance}
              required
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Payment Method *</label>
              <select
                value={payForm.paymentMethod}
                onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              >
                <option value="WIRE_TRANSFER">WIRE_TRANSFER</option>
                <option value="ACH_TRANSFER">ACH_TRANSFER</option>
                <option value="CORPORATE_CARD">CORPORATE_CARD</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Unique Transaction Ref *</label>
              <input
                required
                value={payForm.transactionRef}
                onChange={(e) => setPayForm({ ...payForm, transactionRef: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Treasury Notes</label>
            <input
              value={payForm.remarks}
              onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPayModalInvoice(null)}
              className="px-4 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordPaymentMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const PaymentsPage: React.FC = () => {
  const [receiptPayment, setReceiptPayment] = useState<PaymentDto | null>(null);

  const { data: payments = [], isLoading } = useQuery<PaymentDto[]>({
    queryKey: ['payments'],
    queryFn: async () => (await apiClient.get('/payments')).data,
  });

  if (isLoading) return <LoadingBlock label="Loading treasury payment ledger..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Treasury Disbursements &amp; Payment History
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Audited payment records linked to verified invoices and purchase orders.
          </p>
        </div>
        <button
          onClick={() =>
            exportToCsv(
              'vendora-payments.csv',
              payments.map((p) => ({
                TransactionRef: p.transactionRef,
                InvoiceNumber: p.invoiceNumber,
                PONumber: p.poNumber,
                Vendor: p.vendorName,
                Amount: p.amount,
                Method: p.paymentMethod,
                PaidBy: p.paidByName,
                Date: p.paymentDate,
              }))
            )
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-800 bg-white dark:bg-[#101C2C] text-xs font-semibold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
              <th className="py-3.5 px-4">Transaction Ref</th>
              <th className="py-3.5 px-4">Invoice &amp; PO</th>
              <th className="py-3.5 px-4">Vendor</th>
              <th className="py-3.5 px-4">Method</th>
              <th className="py-3.5 px-4">Amount Paid</th>
              <th className="py-3.5 px-4">Date &amp; Payer</th>
              <th className="py-3.5 px-4 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
            {payments.map((p) => (
              <tr key={p.paymentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 font-mono font-bold text-[#10B981]">
                  {p.transactionRef}
                </td>
                <td className="py-3.5 px-4 font-mono">
                  {p.invoiceNumber}
                  <span className="block text-[10px] text-[#667085]">{p.poNumber}</span>
                </td>
                <td className="py-3.5 px-4 font-semibold">{p.vendorName}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                    {p.paymentMethod}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-[#172033] dark:text-white">
                  {formatCurrency(p.amount)}
                </td>
                <td className="py-3.5 px-4 text-[#667085]">
                  {formatDateTime(p.paymentDate)}
                  <span className="block text-[10px]">By {p.paidByName}</span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => setReceiptPayment(p)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold hover:bg-[#36D6B0] hover:text-[#0B1220] cursor-pointer"
                  >
                    Receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Printable Payment Receipt Modal */}
      <Modal
        open={!!receiptPayment}
        onClose={() => setReceiptPayment(null)}
        title="Official Payment Confirmation Receipt"
        subtitle={receiptPayment?.transactionRef}
        maxWidth="max-w-lg"
      >
        {receiptPayment && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <p className="text-emerald-700 dark:text-[#36D6B0] font-bold">DISBURSEMENT COMPLETED</p>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  {formatDateTime(receiptPayment.paymentDate)}
                </p>
              </div>
              <span className="text-xl font-mono font-extrabold text-emerald-700 dark:text-[#36D6B0]">
                {formatCurrency(receiptPayment.amount)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
              <div>
                <dt className="text-[#667085]">Beneficiary Vendor</dt>
                <dd className="font-bold mt-0.5">{receiptPayment.vendorName}</dd>
              </div>
              <div>
                <dt className="text-[#667085]">Payment Method</dt>
                <dd className="font-mono font-bold mt-0.5">{receiptPayment.paymentMethod}</dd>
              </div>
              <div>
                <dt className="text-[#667085]">Invoice Reference</dt>
                <dd className="font-mono font-bold mt-0.5">{receiptPayment.invoiceNumber}</dd>
              </div>
              <div>
                <dt className="text-[#667085]">Purchase Order</dt>
                <dd className="font-mono font-bold mt-0.5">{receiptPayment.poNumber}</dd>
              </div>
              <div>
                <dt className="text-[#667085]">Authorized By</dt>
                <dd className="font-bold mt-0.5">{receiptPayment.paidByName}</dd>
              </div>
              <div>
                <dt className="text-[#667085]">Remaining Invoice Balance</dt>
                <dd className="font-mono font-bold mt-0.5">
                  {formatCurrency(receiptPayment.remainingInvoiceBalance)}
                </dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
