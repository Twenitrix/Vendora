import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Building2,
  Tags,
  FileCheck2,
  FileSignature,
  ShoppingCart,
  ClipboardList,
  Receipt,
  CreditCard,
  Star,
  MessageSquare,
  Bell,
  BarChart3,
  ShieldCheck,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  CheckCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { apiClient } from '../../lib/api';
import { NotificationDto, UserRole } from '../../types';
import { cn, formatDateTime } from '../../lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.FC<{ className?: string }>;
  roles?: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'VENDOR OPERATIONS',
    items: [
      { label: 'Vendors', to: '/vendors', icon: Building2 },
      {
        label: 'Categories',
        to: '/categories',
        icon: Tags,
        roles: ['SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'FINANCE', 'EMPLOYEE'],
      },
      { label: 'Documents & Compliance', to: '/documents', icon: FileCheck2 },
      { label: 'Contracts', to: '/contracts', icon: FileSignature },
    ],
  },
  {
    title: 'PROCUREMENT & FINANCE',
    items: [
      {
        label: 'Requisitions (S2P)',
        to: '/requisitions',
        icon: ClipboardList,
        roles: ['SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'EMPLOYEE', 'FINANCE'],
      },
      { label: 'Purchase Orders', to: '/purchase-orders', icon: ShoppingCart },
      { label: 'Invoices', to: '/invoices', icon: Receipt },
      {
        label: 'Payments',
        to: '/payments',
        icon: CreditCard,
        roles: ['SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'FINANCE', 'VENDOR'],
      },
    ],
  },
  {
    title: 'RELATIONSHIPS',
    items: [
      { label: 'Performance Reviews', to: '/performance', icon: Star },
      { label: 'Communications', to: '/communications', icon: MessageSquare },
      { label: 'Notifications', to: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'INSIGHTS & GOVERNANCE',
    items: [
      {
        label: 'Analytics & Reports',
        to: '/reports',
        icon: BarChart3,
        roles: ['SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'FINANCE'],
      },
      {
        label: 'Audit Logs',
        to: '/audit-logs',
        icon: ShieldCheck,
        roles: ['SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER', 'FINANCE'],
      },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      {
        label: 'Users & Roles',
        to: '/users',
        icon: Users,
        roles: ['SYSTEM_ADMIN', 'PROCUREMENT_ADMIN', 'PROCUREMENT_MANAGER'],
      },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const { data: notifications = [] } = useQuery<NotificationDto[]>({
    queryKey: ['notifications'],
    queryFn: async () => (await apiClient.get('/notifications')).data,
    refetchInterval: 15000,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    const q = globalSearch.trim().toLowerCase();
    if (q.startsWith('po-')) {
      navigate('/purchase-orders');
    } else if (q.startsWith('inv-')) {
      navigate('/invoices');
    } else if (q.startsWith('ctr-')) {
      navigate('/contracts');
    } else {
      navigate(`/vendors?q=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentTitle =
    pathSegments.length === 0
      ? 'Executive Dashboard'
      : pathSegments[0]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#101C2C] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#36D6B0] to-emerald-500 flex items-center justify-center text-[#0B1220] font-black text-lg shadow-md shadow-[#36D6B0]/20 shrink-0">
            V
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white tracking-tight text-base">VENDORA</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#36D6B0]/15 text-[#36D6B0] border border-[#36D6B0]/30">
                  S2P
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Enterprise Procurement</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.roleName))
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400/80">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-[#36D6B0] text-[#0B1220] font-semibold shadow-sm shadow-[#36D6B0]/25'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        )
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.to === '/notifications' && unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                          {unreadCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Footer */}
      {user && (
        <div className="p-3 border-t border-slate-800/80 bg-[#0B1220]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#36D6B0]/20 border border-[#36D6B0]/40 text-[#36D6B0] flex items-center justify-center font-bold text-sm shrink-0">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[11px] text-[#36D6B0] font-mono truncate">
                  {user.roleName.replace(/_/g, ' ')}
                </p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/70 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7FA] dark:bg-[#0B1220]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block h-full shrink-0 transition-all duration-200 border-r border-slate-800 no-print',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-xs h-full z-10">{renderSidebarContent()}</div>
          <button
            onClick={() => setMobileOpen(false)}
            className="z-10 m-3 p-2 h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white dark:bg-[#101C2C] border-b border-[#E5EAF0] dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between gap-4 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#667085] dark:text-slate-400">
                <span>Vendora</span>
                <span>/</span>
                <span className="font-medium text-[#172033] dark:text-slate-200">{currentTitle}</span>
              </div>
              <h1 className="text-base font-bold text-[#172033] dark:text-white hidden sm:block">
                {currentTitle}
              </h1>
            </div>
          </div>

          {/* Global Search */}
          <form onSubmit={handleGlobalSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search vendors, PO-2026-..., INV-..., or contracts..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-800 text-[#172033] dark:text-slate-100 focus:outline-none focus:border-[#36D6B0]"
              />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {user?.vendorCompanyName && (
              <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#36D6B0]/15 text-[#101C2C] dark:text-[#36D6B0] border border-[#36D6B0]/30">
                <Sparkles className="w-3.5 h-3.5" />
                Portal: {user.vendorCompanyName}
              </span>
            )}

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-[#E5EAF0] dark:border-slate-800 text-[#667085] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl border border-[#E5EAF0] dark:border-slate-800 text-[#667085] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 shadow-2xl z-40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5EAF0] dark:border-slate-800">
                      <span className="text-sm font-bold text-[#172033] dark:text-white">
                        Notifications ({unreadCount} unread)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllReadMutation.mutate()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#10B981] hover:underline"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#E5EAF0] dark:divide-slate-800">
                      {notifications.slice(0, 6).map((n) => (
                        <div
                          key={n.notificationId}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate('/notifications');
                          }}
                          className={cn(
                            'p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                            !n.isRead && 'bg-emerald-50/40 dark:bg-emerald-950/20'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#172033] dark:text-white">{n.title}</p>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {n.type}
                            </span>
                          </div>
                          <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <p className="p-6 text-center text-xs text-slate-400">No notifications yet.</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/notifications');
                      }}
                      className="w-full py-2.5 text-center text-xs font-semibold text-[#101C2C] dark:text-[#36D6B0] bg-slate-50 dark:bg-slate-900/60 hover:underline"
                    >
                      View all notifications
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
