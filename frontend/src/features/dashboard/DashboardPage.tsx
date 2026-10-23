import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  FileSignature,
  ShoppingCart,
  Receipt,
  DollarSign,
  AlertTriangle,
  Star,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { apiClient, extractErrorMessage } from '../../lib/api';
import { DashboardSummaryDto } from '../../types';
import { useAuth } from '../../providers/AuthProvider';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import { ErrorBlock, LoadingBlock, StatusBadge } from '../../components/ui/Primitives';

const CHART_COLORS = ['#36D6B0', '#0EA5E9', '#6366F1', '#F59E0B', '#EC4899'];

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'6M' | 'YTD' | 'ALL'>('6M');

  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardSummaryDto>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await apiClient.get('/dashboard/summary')).data,
  });

  if (isLoading) return <LoadingBlock label="Synthesizing live procurement & vendor telemetry..." />;
  if (error || !summary)
    return <ErrorBlock message={extractErrorMessage(error)} onRetry={() => refetch()} />;

  const isVendor = hasRole('VENDOR');

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#101C2C] via-[#132338] to-[#0B1220] text-white border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase bg-[#36D6B0]/15 text-[#36D6B0] border border-[#36D6B0]/30">
              {user?.roleName.replace(/_/g, ' ')} WORKSPACE
            </span>
            <span className="text-xs text-slate-400">Live Database Metrics</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2">
            Good day, {user?.name.split(' ')[0]}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {isVendor
              ? `Managing supplier operations, orders, compliance documents, and invoices for ${user?.vendorCompanyName || 'your organization'}.`
              : 'Every vendor. Every contract. Every transaction — monitored in real time.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Reporting Period Selector */}
          <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
            {(['6M', 'YTD', 'ALL'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  period === p ? 'bg-[#36D6B0] text-[#0B1220]' : 'text-slate-300 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {!isVendor ? (
            <button
              onClick={() => navigate('/purchase-orders')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold text-xs hover:opacity-95 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              New Purchase Order
            </button>
          ) : (
            <button
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#36D6B0] text-[#0B1220] font-bold text-xs hover:opacity-95 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              Submit Invoice
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/vendors')}
          className="p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs hover:border-[#36D6B0] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-400">
              Total Vendors
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-[#36D6B0] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#172033] dark:text-white">
              {summary.totalVendors}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-[#36D6B0]">
              {summary.approvedVendors} Approved
            </span>
          </div>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
            {summary.pendingVendorApprovals} awaiting onboarding review
          </p>
        </div>

        <div
          onClick={() => navigate('/contracts')}
          className="p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs hover:border-[#36D6B0] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-400">
              Active Contracts
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <FileSignature className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#172033] dark:text-white">
              {summary.activeContracts}
            </span>
            {summary.contractsNearingExpiry > 0 && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {summary.contractsNearingExpiry} Expiring ≤30d
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
            Master service &amp; supply agreements
          </p>
        </div>

        <div
          onClick={() => navigate('/purchase-orders')}
          className="p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs hover:border-[#36D6B0] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-400">
              Procurement Spend
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#172033] dark:text-white">
              {formatCurrency(summary.totalSpendYtd)}
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {summary.activePurchaseOrders} Active POs
            </span>
          </div>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
            {summary.pendingPoApprovals} POs awaiting manager approval
          </p>
        </div>

        <div
          onClick={() => navigate('/invoices')}
          className="p-5 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs hover:border-[#36D6B0] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-400">
              Outstanding Payables
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#172033] dark:text-white">
              {formatCurrency(summary.outstandingPayables)}
            </span>
            {summary.overdueInvoices > 0 && (
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {summary.overdueInvoices} Overdue
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
            {summary.pendingInvoices} invoices pending verification
          </p>
        </div>
      </div>

      {/* Action Queue Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/vendors')}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 hover:border-[#36D6B0] transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-xs font-bold text-[#172033] dark:text-white">
                {summary.pendingVendorApprovals} Pending Vendors
              </p>
              <p className="text-[11px] text-[#667085] dark:text-slate-400">Onboarding queue</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => navigate('/documents')}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 hover:border-[#36D6B0] transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-sky-500" />
            <div>
              <p className="text-xs font-bold text-[#172033] dark:text-white">
                {summary.pendingDocuments} Pending Docs
              </p>
              <p className="text-[11px] text-[#667085] dark:text-slate-400">Compliance queue</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => navigate('/purchase-orders')}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 hover:border-[#36D6B0] transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-xs font-bold text-[#172033] dark:text-white">
                {summary.pendingPoApprovals} PO Approvals
              </p>
              <p className="text-[11px] text-[#667085] dark:text-slate-400">Awaiting sign-off</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => navigate('/performance')}
          className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 hover:border-[#36D6B0] transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <div>
              <p className="text-xs font-bold text-[#172033] dark:text-white">
                {summary.averageVendorRating.toFixed(2)} / 5.00
              </p>
              <p className="text-[11px] text-[#667085] dark:text-slate-400">Avg Vendor Score</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Spend Trend Chart */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#172033] dark:text-white">
                Procurement Spend Trajectory
              </h3>
              <p className="text-xs text-[#667085] dark:text-slate-400">
                Committed purchase order volume by month
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#10B981]">
              Total: {formatCurrency(summary.totalSpendYtd)}
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.monthlySpendTrend}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#36D6B0" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#36D6B0" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" opacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#667085' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#667085' }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Order Spend']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E5EAF0',
                    backgroundColor: '#101C2C',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="#36D6B0"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#spendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend by Category Chart */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#172033] dark:text-white">
              Spend by Vendor Category
            </h3>
            <p className="text-xs text-[#667085] dark:text-slate-400">
              Distribution across active procurement categories
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.categoryDistribution} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" opacity={0.3} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#667085' }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={125}
                  tick={{ fontSize: 11, fill: '#667085' }}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Category Spend']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E5EAF0',
                    backgroundColor: '#101C2C',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="spend" radius={[0, 6, 6, 0]}>
                  {summary.categoryDistribution.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Operational Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Purchase Orders */}
        <div className="lg:col-span-7 bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5EAF0] dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#172033] dark:text-white">
                Recent Purchase Orders
              </h3>
              <p className="text-xs text-[#667085] dark:text-slate-400">
                Latest procurement commitments and fulfillment status
              </p>
            </div>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="text-xs font-semibold text-[#10B981] hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] dark:border-slate-800 text-[11px] font-bold uppercase text-[#667085] dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] dark:divide-slate-800 text-xs">
                {summary.recentPurchaseOrders.map((po) => (
                  <tr
                    key={po.poId}
                    onClick={() => navigate(`/purchase-orders/${po.poId}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-[#172033] dark:text-white">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-4 text-[#172033] dark:text-slate-200">{po.vendorName}</td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={po.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expiring Contracts & Activity Feed */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contracts Watchlist */}
          <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#172033] dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Contract Renewal Watchlist
              </h3>
              <button
                onClick={() => navigate('/contracts')}
                className="text-xs font-semibold text-[#10B981] hover:underline"
              >
                All Contracts
              </button>
            </div>
            <div className="space-y-2.5">
              {summary.expiringContracts.map((c) => (
                <div
                  key={c.contractId}
                  onClick={() => navigate('/contracts')}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5EAF0] dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-[#36D6B0]"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-[#172033] dark:text-white truncate">
                      {c.title}
                    </p>
                    <p className="text-[11px] text-[#667085] dark:text-slate-400">
                      {c.vendorName} • Ends {formatDate(c.endDate)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0 ${
                      c.daysRemaining <= 30
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {c.daysRemaining}d left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Activity Feed */}
          {!isVendor && (
            <div className="bg-white dark:bg-[#101C2C] rounded-2xl border border-[#E5EAF0] dark:border-slate-800 shadow-xs p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#172033] dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#36D6B0]" />
                  Recent Governance Activity
                </h3>
                <button
                  onClick={() => navigate('/audit-logs')}
                  className="text-xs font-semibold text-[#10B981] hover:underline"
                >
                  Full Trail
                </button>
              </div>
              <div className="space-y-3">
                {summary.recentActivity.slice(0, 4).map((a) => (
                  <div key={a.auditId} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#36D6B0] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#172033] dark:text-slate-200 font-medium">{a.details}</p>
                      <p className="text-[10px] text-[#667085] dark:text-slate-400 mt-0.5">
                        {a.actorEmail} • {formatDateTime(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
