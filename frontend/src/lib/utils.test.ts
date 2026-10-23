import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime, cn } from './utils';

describe('Vendora Enterprise Utility Suite', () => {
  it('formats financial amounts accurately with explicit decimal precision', () => {
    expect(formatCurrency(125400.5)).toBe('$125,400.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency(undefined)).toBe('$0.00');
  });

  it('formats ISO dates and handles missing dates safely', () => {
    expect(formatDate('2026-06-15')).toContain('2026');
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats ISO date-times cleanly', () => {
    expect(formatDateTime('2026-06-15T10:30:00Z')).toContain('2026');
    expect(formatDateTime(null)).toBe('—');
  });

  it('merges conditional Tailwind CSS classes predictably', () => {
    expect(cn('px-4 py-2', false && 'hidden', 'bg-indigo-600')).toBe('px-4 py-2 bg-indigo-600');
  });
});
