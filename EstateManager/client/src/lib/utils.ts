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

export function sortByFloor<T>(items: T[], getFloor: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => {
    const floorA = getFloorOrder(getFloor(a));
    const floorB = getFloorOrder(getFloor(b));
    return floorA - floorB;
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
