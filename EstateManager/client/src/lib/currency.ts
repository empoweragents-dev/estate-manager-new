import { create } from 'zustand';

interface CurrencyState {
  currency: 'BDT';
  setCurrency: (currency: 'BDT') => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: 'BDT',
  setCurrency: (currency) => set({ currency }),
}));

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return `৳${numAmount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumberOnly(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return numAmount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatFloor(floor: string, subedariCategory?: string | null): string {
  switch (floor) {
    case 'ground': return 'Ground Floor';
    case 'first': return '1st Floor';
    case 'second': return '2nd Floor';
    case 'subedari': 
      if (subedariCategory === 'shops') return 'Subedari Shop';
      if (subedariCategory === 'residential') return 'Subedari Res';
      return 'Subedari';
    default: return floor;
  }
}

export function formatShopLocation(floor: string, shopNumber: string, subedariCategory?: string | null): string {
  if (floor === 'subedari') {
    const category = subedariCategory === 'residential' ? 'Res' : 'Shop';
    return `Subedari ${category} ${shopNumber}`;
  }
  const floorLabel = floor === 'ground' ? 'Ground' : floor === 'first' ? '1st' : '2nd';
  return `${floorLabel} Floor ${shopNumber}`;
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
