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

export function getFloorOrder(floor: string | null | undefined): number {
  if (!floor) return 999;
  return FLOOR_ORDER[floor.toLowerCase()] || 999;
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

// Sort by floor order first, then by numerical shop number
export function sortByFloorAndShopNumber<T>(
  items: T[], 
  getFloor: (item: T) => string | null | undefined,
  getShopNumber: (item: T) => string | null | undefined
): T[] {
  return [...items].sort((a, b) => {
    const floorA = getFloorOrder(getFloor(a));
    const floorB = getFloorOrder(getFloor(b));
    if (floorA !== floorB) {
      return floorA - floorB;
    }
    // Within same floor, sort by numerical shop number
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
