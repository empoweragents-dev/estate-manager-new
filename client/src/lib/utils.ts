import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const FLOOR_ORDER: Record<string, number> = {
  'ground': 1,
  'first': 2,
  'second': 3,
  'subedari': 4,
};

// Prefix order for shop numbers: E (East) -> M (Middle) -> W (West)
export const PREFIX_ORDER: Record<string, number> = { E: 1, M: 2, W: 3 };

export function getFloorOrder(floor: string | null | undefined): number {
  if (!floor) return 999;
  return FLOOR_ORDER[floor.toLowerCase()] || 999;
}

// Extract prefix letter from shop number (e.g., "E-12" -> "E", "M-6" -> "M")
export function extractShopPrefix(shopNumber: string | null | undefined): string {
  if (!shopNumber) return 'Z';
  const match = shopNumber.match(/^([EMW])/i);
  return match ? match[1].toUpperCase() : 'Z'; // 'Z' for unknown prefixes to sort last
}

// Get prefix order for sorting (E=1, M=2, W=3)
export function getPrefixOrder(shopNumber: string | null | undefined): number {
  const prefix = extractShopPrefix(shopNumber);
  return PREFIX_ORDER[prefix] || 999;
}

// Extract numerical part from shop number for sorting (e.g., "E-12" -> 12, "M-6" -> 6)
export function extractShopNumber(shopNumber: string | null | undefined): number {
  if (!shopNumber) return 999;
  const match = shopNumber.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 999;
}

// Sort by floor order only (legacy function for backward compatibility)
export function sortByFloor<T>(items: T[], getFloor: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => {
    const floorA = getFloorOrder(getFloor(a));
    const floorB = getFloorOrder(getFloor(b));
    return floorA - floorB;
  });
}

// Sort by floor order first, then by prefix (E->M->W), then by numerical shop number
export function sortByFloorAndShopNumber<T>(
  items: T[], 
  getFloor: (item: T) => string | null | undefined,
  getShopNumber: (item: T) => string | null | undefined
): T[] {
  return [...items].sort((a, b) => {
    // First: sort by floor
    const floorA = getFloorOrder(getFloor(a));
    const floorB = getFloorOrder(getFloor(b));
    if (floorA !== floorB) {
      return floorA - floorB;
    }
    // Second: sort by prefix (E -> M -> W)
    const prefixA = getPrefixOrder(getShopNumber(a));
    const prefixB = getPrefixOrder(getShopNumber(b));
    if (prefixA !== prefixB) {
      return prefixA - prefixB;
    }
    // Third: sort by numerical shop number
    const numA = extractShopNumber(getShopNumber(a));
    const numB = extractShopNumber(getShopNumber(b));
    return numA - numB;
  });
}

export function formatFloor(floor: string | null | undefined): string {
  if (!floor) return '';
  const floorMap: Record<string, string> = {
    'ground': 'Ground Floor',
    'first': '1st Floor',
    'second': '2nd Floor',
    'subedari': 'Subedari',
  };
  return floorMap[floor.toLowerCase()] || floor;
}
