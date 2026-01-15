import { create } from 'zustand';

interface CurrencyState {
  currency: 'BDT';
  setCurrency: (currency: 'BDT') => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: 'BDT',
  setCurrency: (currency) => set({ currency }),
}));

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '৳0.00';
  }
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) {
    return '৳0.00';
  }
  return `৳${numAmount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumberOnly(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0.00';
  }
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) {
    return '0.00';
  }
  return numAmount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatFloor(floor: string, subedariCategory?: string | null): string {
  switch (floor) {
    case 'ground': return 'Ground Floor';
    case 'first': return '1st Floor';
    case 'second': return '2nd Floor';
    case 'subedari':
      if (subedariCategory === 'shops') return 'Subedari - Shops';
      if (subedariCategory === 'residential') return 'Subedari - Residential';
      return 'Subedari';
    default: return floor;
  }
}

export function getLeaseStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'expiring_soon': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'terminated': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function getShopStatusColor(status: string): string {
  switch (status) {
    case 'occupied': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'vacant': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default: return 'bg-gray-100 text-gray-800';
  }
}
