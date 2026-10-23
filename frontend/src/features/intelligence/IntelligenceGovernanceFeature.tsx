import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star,
  Plus,
  MessageSquare,
  Send,
  Bell,
  CheckCheck,
  BarChart3,
  Download,
  ShieldCheck,
  Users,
  Settings,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { apiClient, extractErrorMessage } from '../../lib/api';
import {
  AuditLogDto,
  CommunicationDto,
  DashboardSummaryDto,
  NotificationDto,
  PerformanceReviewDto,
  PurchaseOrderDto,
  RoleDto,
  UserDto,
  VendorDto,
} from '../../types';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { exportToCsv, formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import { EmptyState, LoadingBlock, Modal, StatusBadge } from '../../components/ui/Primitives';

// ============================================================================
// MODULE 11: VENDOR PERFORMANCE REVIEWS PAGE
// ============================================================================

export const PerformanceReviewsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    poId: '',
    qualityScore: '4.8',
    deliveryScore: '4.6',
    communicationScore: '4.7',
    complianceScore: '4.9',
    comments: 'High quality deliverables and responsive technical support.',
  });

  const { data: reviews = [], isLoading } = useQuery<PerformanceReviewDto[]>({
    queryKey: ['reviews'],
    queryFn: async () => (await apiClient.get('/reviews')).data,
  });

  const { data: orders = [] } = useQuery<PurchaseOrderDto[]>({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await apiClient.get('/purchase-orders')).data,
  });

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      const selectedPo = orders.find((o) => o.poId === Number(form.poId));
      if (!selectedPo) throw new Error('Select a valid Purchase Order');
      return (
        await apiClient.post('/reviews', {
          vendorId: selectedPo.vendorId,
          poId: selectedPo.poId,
          qualityScore: Number(form.qualityScore),
          deliveryScore: Number(form.deliveryScore),
          communicationScore: Number(form.communicationScore),
          complianceScore: Number(form.complianceScore),
          comments: form.comments,
        })
      ).data;
    },
    onSuccess: (created: PerformanceReviewDto) => {
      notify(
        'Performance Review Saved',
        `Backend calculated overall score: ${created.overallScore} / 5.00`
      );
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => notify('Failed to submit review', extractErrorMessage(err), 'error'),
  });

  const canCreate = hasRole('SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'FINANCE');

  if (isLoading) return <LoadingBlock label="Loading vendor performance scorecards..." />;

  const previewAvg = (
    (Number(form.qualityScore || 0) +
      Number(form.deliveryScore || 0) +
      Number(form.communicationScore || 0) +
      Number(form.complianceScore || 0)) /
    4
  ).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Vendor Performance Scorecards
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Evaluate quality, delivery, communication, and compliance on a 1.0–5.0 scale.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setForm({
                ...form,
                poId: orders[0]?.poId ? String(orders[0].poId) : '',
              });
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Performance Review
          </button>
        )}
      </div>

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((r) => (
          <div
            key={r.reviewId}
            className="p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-[#10B981]">{r.poNumber}</span>
                  <h3 className="text-base font-bold text-[#172033] dark:text-white">
                    {r.vendorName}
                  </h3>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {Number(r.overallScore).toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#667085] block">Quality</span>
                  <span className="font-mono font-bold">{r.qualityScore}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] block">Delivery</span>
                  <span className="font-mono font-bold">{r.deliveryScore}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] block">Comms</span>
                  <span className="font-mono font-bold">{r.communicationScore}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] block">Compliance</span>
                  <span className="font-mono font-bold">{r.complianceScore}</span>
                </div>
              </div>

              <p className="text-xs text-[#667085] dark:text-slate-300 mt-3 leading-relaxed">
                “{r.comments}”
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5EAF0] dark:border-slate-800 flex items-center justify-between text-[11px] text-[#667085]">
              <span>Evaluator: {r.reviewedByName}</span>
              <span>{formatDate(r.reviewDate)}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Vendor Performance Evaluation"
        subtitle="Overall score is automatically calculated on the backend from the 4 dimensions."
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createReviewMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1">Purchase Order *</label>
            <select
              required
              value={form.poId}
              onChange={(e) => setForm({ ...form, poId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            >
              {orders.map((o) => (
                <option key={o.poId} value={o.poId}>
                  {o.poNumber} — {o.vendorName} ({formatCurrency(o.totalAmount)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'qualityScore', label: 'Quality Score (1.0 - 5.0)' },
              { key: 'deliveryScore', label: 'Delivery Score (1.0 - 5.0)' },
              { key: 'communicationScore', label: 'Communication Score (1.0 - 5.0)' },
              { key: 'complianceScore', label: 'Compliance Score (1.0 - 5.0)' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block font-semibold mb-1">{field.label} *</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  required
                  value={(form as Record<string, string>)[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 font-mono"
                />
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              Calculated Overall Rating (25% equal weight)
            </span>
            <span className="text-base font-mono font-extrabold text-amber-600 dark:text-amber-400">
              {previewAvg} / 5.00
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1">Evaluation Comments *</label>
            <textarea
              required
              rows={3}
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
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
              disabled={createReviewMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Submit Scorecard
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 12: COMMUNICATION CENTER PAGE
// ============================================================================

export const CommunicationsPage: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { data: communications = [], isLoading } = useQuery<CommunicationDto[]>({
    queryKey: ['communications', vendorFilter, search],
    queryFn: async () =>
      (
        await apiClient.get('/communications', {
          params: {
            vendorId: vendorFilter !== 'ALL' ? Number(vendorFilter) : undefined,
            search: search || undefined,
          },
        })
      ).data,
  });

  const { data: vendors = [] } = useQuery<VendorDto[]>({
    queryKey: ['vendors'],
    queryFn: async () => (await apiClient.get('/vendors')).data,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const targetVendorId = user?.vendorId || Number(vendorId || vendors[0]?.vendorId);
      return (
        await apiClient.post('/communications', {
          vendorId: targetVendorId,
          subject,
          message,
        })
      ).data;
    },
    onSuccess: () => {
      notify('Message Recorded', 'Persisted to vendor communication history.');
      setSubject('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
    onError: (err) => notify('Send failed', extractErrorMessage(err), 'error'),
  });

  if (isLoading) return <LoadingBlock label="Loading vendor communication logs..." />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
              Vendor Communication Center
            </h2>
            <p className="text-xs text-[#667085] dark:text-slate-400">
              Audited correspondence history between internal teams and suppliers.
            </p>
          </div>
          {!user?.vendorId && (
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 font-semibold"
            >
              <option value="ALL">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.vendorId} value={v.vendorId}>
                  {v.companyName}
                </option>
              ))}
            </select>
          )}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search message subjects or contents..."
          className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800"
        />

        <div className="space-y-3">
          {communications.map((c) => (
            <div
              key={c.communicationId}
              className="p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#36D6B0]" />
                  <span className="font-bold text-sm text-[#172033] dark:text-white">
                    {c.subject}
                  </span>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-[#667085] dark:text-slate-300 mt-2 leading-relaxed">{c.message}</p>
              <div className="mt-3 pt-3 border-t border-[#E5EAF0] dark:border-slate-800 flex items-center justify-between text-[11px] text-[#667085]">
                <span>
                  Vendor: <strong>{c.vendorName}</strong> • Sender: {c.senderName} ({c.senderRole})
                </span>
                <span>{formatDateTime(c.sentAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compose Panel */}
      <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs h-fit">
        <h3 className="text-base font-bold text-[#172033] dark:text-white mb-1">
          Compose Official Message
        </h3>
        <p className="text-xs text-[#667085] dark:text-slate-400 mb-4">
          Messages are persisted to the vendor record and trigger recipient notifications.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          {!user?.vendorId && (
            <div>
              <label className="block font-semibold mb-1">Recipient Vendor *</label>
              <select
                required
                value={vendorId || (vendors[0]?.vendorId ? String(vendors[0].vendorId) : '')}
                onChange={(e) => setVendorId(e.target.value)}
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
            <label className="block font-semibold mb-1">Subject *</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., PO-2026-2004 Delivery Schedule Confirmation"
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Message Body *</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter detailed inquiry, contract clarification, or compliance follow-up..."
              className="w-full p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>

          <button
            type="submit"
            disabled={sendMutation.isPending}
            className="w-full py-2.5 px-4 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {sendMutation.isPending ? 'Sending...' : 'Dispatch Message'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 13: NOTIFICATIONS PAGE
// ============================================================================

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const { data: notifications = [], isLoading } = useQuery<NotificationDto[]>({
    queryKey: ['notifications'],
    queryFn: async () => (await apiClient.get('/notifications')).data,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      notify('All Notifications Read', 'Your inbox is up to date.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (isLoading) return <LoadingBlock label="Loading user notifications..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Scoped Event Notifications
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Real-time alerts generated by backend vendor, compliance, order, invoice, and payment workflows.
          </p>
        </div>

        <button
          onClick={() => markAllMutation.mutate()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] text-xs font-bold cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          Mark All as Read
        </button>
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You are all caught up." />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.notificationId}
              className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                n.isRead
                  ? 'bg-white dark:bg-[#101C2C] border-[#E5EAF0] dark:border-slate-800'
                  : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-[#36D6B0]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#36D6B0]/15 text-[#10B981] flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172033] dark:text-white">
                      {n.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {n.type}
                    </span>
                  </div>
                  <p className="text-xs text-[#667085] dark:text-slate-300 mt-1">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => markReadMutation.mutate(n.notificationId)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-[#36D6B0] hover:text-[#0B1220] cursor-pointer shrink-0"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 14: REPORTS & ANALYTICS PAGE
// ============================================================================

export const ReportsAnalyticsPage: React.FC = () => {
  const { data: summary, isLoading } = useQuery<DashboardSummaryDto>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await apiClient.get('/dashboard/summary')).data,
  });

  if (isLoading || !summary) return <LoadingBlock label="Compiling enterprise analytics..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white">
            Enterprise Analytics &amp; Executive Reports
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Live spend intelligence, supplier performance rankings, and CSV data export.
          </p>
        </div>

        <button
          onClick={() =>
            exportToCsv('vendora-category-spend-report.csv', summary.categoryDistribution)
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Spend Report (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#36D6B0]" />
            Monthly Spend Progression
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.monthlySpendTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line
                  type="monotone"
                  dataKey="spend"
                  stroke="#36D6B0"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800">
          <h3 className="text-sm font-bold mb-4">Vendor Count by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.categoryDistribution}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="vendors" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Vendors Table */}
      <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5EAF0] dark:border-slate-800">
          <h3 className="text-sm font-bold">Top Performing Vendors Ranking</h3>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Vendor</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Overall Score</th>
              <th className="py-3 px-4">Total Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
            {summary.topPerformingVendors.map((v, i) => (
              <tr key={v.vendorId}>
                <td className="py-3 px-4 font-mono font-bold">#{i + 1}</td>
                <td className="py-3 px-4 font-bold">{v.companyName}</td>
                <td className="py-3 px-4">{v.categoryName}</td>
                <td className="py-3 px-4 font-bold text-amber-500">★ {v.rating.toFixed(2)}</td>
                <td className="py-3 px-4 font-mono font-semibold">{formatCurrency(v.totalSpend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 15: AUDIT LOGS & USER/ROLE ADMINISTRATION PAGES
// ============================================================================

export const AuditLogsPage: React.FC = () => {
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const { data: logs = [], isLoading } = useQuery<AuditLogDto[]>({
    queryKey: ['audit-logs', moduleFilter],
    queryFn: async () =>
      (
        await apiClient.get('/audit-logs', {
          params: moduleFilter !== 'ALL' ? { module: moduleFilter } : {},
        })
      ).data,
  });

  if (isLoading) return <LoadingBlock label="Loading immutable audit trail..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#36D6B0]" />
            Immutable Enterprise Audit Trail
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Every authentication, approval, verification, order, invoice, and payment action is permanently logged.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 font-semibold"
          >
            <option value="ALL">All Modules</option>
            <option value="Auth">Authentication</option>
            <option value="Vendor">Vendor</option>
            <option value="Document">Document</option>
            <option value="Contract">Contract</option>
            <option value="PurchaseOrder">Purchase Order</option>
            <option value="Invoice">Invoice</option>
            <option value="Payment">Payment</option>
          </select>

          <button
            onClick={() =>
              exportToCsv(
                'vendora-audit-logs.csv',
                logs.map((l) => ({
                  AuditID: l.auditId,
                  Timestamp: l.createdAt,
                  Actor: l.actorEmail,
                  Role: l.actorRole,
                  Module: l.module,
                  Action: l.action,
                  Details: l.details,
                }))
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] dark:border-slate-800 bg-white dark:bg-[#101C2C] text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">Actor &amp; Role</th>
              <th className="py-3.5 px-4">Module</th>
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">Audit Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
            {logs.map((l) => (
              <tr key={l.auditId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono text-[11px] text-[#667085]">
                  {formatDateTime(l.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-[#172033] dark:text-white block">
                    {l.actorEmail}
                  </span>
                  <span className="text-[10px] font-mono text-[#10B981]">{l.actorRole}</span>
                </td>
                <td className="py-3 px-4 font-semibold">{l.module}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                    {l.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#172033] dark:text-slate-200">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const UsersRolesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'Vendora@2026',
    phone: '+1 (415) 555-0100',
    roleId: '2',
    status: 'ACTIVE',
  });

  const { data: users = [], isLoading } = useQuery<UserDto[]>({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get('/users')).data,
  });

  const { data: roles = [] } = useQuery<RoleDto[]>({
    queryKey: ['roles'],
    queryFn: async () => (await apiClient.get('/roles')).data,
  });

  const createUserMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post('/users', {
          ...form,
          roleId: Number(form.roleId),
        })
      ).data,
    onSuccess: (created: UserDto) => {
      notify('User Provisioned', `${created.email} assigned role ${created.roleName}`);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => notify('Failed to create user', extractErrorMessage(err), 'error'),
  });

  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  if (isLoading) return <LoadingBlock label="Loading users & RBAC matrix..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#172033] dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#36D6B0]" />
            Users &amp; Role-Based Access Governance
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400">
            Manage enterprise users and the 6 RBAC roles mapped to the ROLE and USER tables.
          </p>
        </div>

        {isSysAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Provision User
          </button>
        )}
      </div>

      {/* Role Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map((r) => (
          <div
            key={r.roleId}
            className="p-4 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800"
          >
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#36D6B0]/15 text-[#10B981]">
              {r.roleName}
            </span>
            <p className="text-xs text-[#667085] dark:text-slate-300 mt-2">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] bg-slate-50/60 dark:bg-slate-900/40">
              <th className="py-3.5 px-4">Name</th>
              <th className="py-3.5 px-4">Email</th>
              <th className="py-3.5 px-4">Phone</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.userId}>
                <td className="py-3.5 px-4 font-bold text-[#172033] dark:text-white">{u.name}</td>
                <td className="py-3.5 px-4 font-mono">{u.email}</td>
                <td className="py-3.5 px-4">{u.phone || '—'}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[#10B981]">
                    {u.roleName}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={u.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Provision New Enterprise User"
        maxWidth="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1">Full Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Initial Password *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">System Role *</label>
              <select
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700"
              >
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
              </select>
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
              disabled={createUserMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#172033] dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#36D6B0]" />
          Platform &amp; Profile Settings
        </h2>
        <p className="text-xs text-[#667085] dark:text-slate-400">
          Current session details and enterprise procurement configuration thresholds.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 space-y-4 text-xs">
        <h3 className="text-sm font-bold">Authenticated Session Profile</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-[#667085]">Full Name</dt>
            <dd className="font-bold text-sm mt-0.5">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-[#667085]">Email</dt>
            <dd className="font-mono font-bold mt-0.5">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-[#667085]">Assigned Role</dt>
            <dd className="font-mono font-bold text-[#10B981] mt-0.5">{user?.roleName}</dd>
          </div>
          <div>
            <dt className="text-[#667085]">Account Status</dt>
            <dd className="mt-0.5">
              <StatusBadge status={user?.status} />
            </dd>
          </div>
        </dl>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 space-y-3 text-xs">
        <h3 className="text-sm font-bold">Enterprise Governance Policies</h3>
        <ul className="space-y-2 text-[#667085] dark:text-slate-300 list-disc pl-5">
          <li>
            <strong>3-Way Match Enforcement:</strong> Invoices cannot exceed remaining Purchase Order ceiling limits.
          </li>
          <li>
            <strong>Backend Financial Integrity:</strong> Line totals, taxes, and overall PO sums are computed using Java <code>BigDecimal</code>.
          </li>
          <li>
            <strong>Performance Formula:</strong> Equal 25% weight across Quality, Delivery, Communication, and Compliance scores.
          </li>
          <li>
            <strong>API Specification:</strong> Interactive Swagger UI available at{' '}
            <a
              href="http://localhost:8080/swagger-ui.html"
              target="_blank"
              rel="noreferrer"
              className="text-[#10B981] underline font-mono"
            >
              http://localhost:8080/swagger-ui.html
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};
