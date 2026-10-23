import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { ToastProvider } from './providers/ToastProvider';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { VendorsListPage, VendorDetailPage } from './features/vendors/VendorsFeature';
import {
  CategoriesPage,
  DocumentsCompliancePage,
  ContractsPage,
} from './features/operations/OperationsFeature';
import {
  RequisitionsPage,
  PurchaseOrdersPage,
  PurchaseOrderDetailPage,
  InvoicesPage,
  PaymentsPage,
} from './features/procurement/ProcurementFinanceFeature';
import {
  PerformanceReviewsPage,
  CommunicationsPage,
  NotificationsPage,
  ReportsAnalyticsPage,
  AuditLogsPage,
  UsersRolesPage,
  SettingsPage,
} from './features/intelligence/IntelligenceGovernanceFeature';
import { ShieldAlert } from 'lucide-react';
import type { UserRole } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, user, hasRole } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-slate-900/90 border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6 text-rose-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Restricted Enterprise Workspace</h2>
        <p className="text-xs text-slate-400 mb-6">
          Your active role (<span className="text-slate-200 font-semibold">{user.roleName}</span>) does not have
          permission to view this module. Backend role-based access control is strictly enforced.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
        >
          Return to Previous Screen
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/vendors" element={<VendorsListPage />} />
        <Route path="/vendors/:id" element={<VendorDetailPage />} />
        <Route
          path="/categories"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SYSTEM_ADMIN',
                'PROCUREMENT_ADMIN',
                'PROCUREMENT_MANAGER',
                'FINANCE',
                'EMPLOYEE',
              ]}
            >
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/documents" element={<DocumentsCompliancePage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route
          path="/requisitions"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SYSTEM_ADMIN',
                'PROCUREMENT_ADMIN',
                'PROCUREMENT_MANAGER',
                'FINANCE',
                'EMPLOYEE',
              ]}
            >
              <RequisitionsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/performance" element={<PerformanceReviewsPage />} />
        <Route path="/communications" element={<CommunicationsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route
          path="/reports"
          element={
            <ProtectedRoute
              allowedRoles={['SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'FINANCE']}
            >
              <ReportsAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute
              allowedRoles={['SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'FINANCE']}
            >
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
              <UsersRolesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
