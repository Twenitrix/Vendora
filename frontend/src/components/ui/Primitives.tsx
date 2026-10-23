import React from 'react';
import { cn } from '../../lib/utils';
import { X, AlertTriangle, Loader2, Inbox } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const StatusBadge: React.FC<{ status?: string | null; className?: string }> = ({ status, className }) => {
  const s = (status || 'UNKNOWN').toUpperCase();

  let colors = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  if (['APPROVED', 'ACTIVE', 'VERIFIED', 'PAID', 'COMPLETED', 'DELIVERED', 'CLOSED', 'ACCEPTED'].includes(s)) {
    colors = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
  } else if (['PENDING', 'PENDING_APPROVAL', 'UNDER_REVIEW', 'ISSUED', 'IN_FULFILLMENT', 'PARTIALLY_PAID', 'PARTIALLY_DELIVERED', 'SENT', 'ORDER_CREATED'].includes(s)) {
    colors = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
  } else if (['REJECTED', 'EXPIRED', 'SUSPENDED', 'TERMINATED', 'CANCELLED', 'OVERDUE', 'UNPAID'].includes(s)) {
    colors = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
  } else if (['DRAFT', 'RETURNED', 'READ'].includes(s)) {
    colors = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide',
        colors,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {s.replace(/_/g, ' ')}
    </span>
  );
};

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ open, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'relative w-full bg-white dark:bg-[#101C2C] border border-[#E5EAF0] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8',
              maxWidth
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAF0] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-[#172033] dark:text-white">{title}</h3>
                {subtitle && <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-14 px-4 text-center bg-white dark:bg-[#101C2C] rounded-2xl border border-dashed border-[#E5EAF0] dark:border-slate-800">
    <div className="w-12 h-12 rounded-2xl bg-[#101C2C]/5 dark:bg-[#36D6B0]/10 flex items-center justify-center text-[#101C2C] dark:text-[#36D6B0] mb-3">
      <Inbox className="w-6 h-6" />
    </div>
    <h4 className="text-base font-semibold text-[#172033] dark:text-white">{title}</h4>
    <p className="text-sm text-[#667085] dark:text-slate-400 max-w-md mt-1">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Loading enterprise records...' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-[#667085] dark:text-slate-400 gap-3">
    <Loader2 className="w-7 h-7 animate-spin text-[#36D6B0]" />
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export const ErrorBlock: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);
