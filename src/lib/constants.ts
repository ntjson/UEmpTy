import type { CaSlot } from '@/lib/types'

export const CA_SLOTS: CaSlot[] = [
  { ca: 1, buoi: 'Sáng', tiet: [1, 3], startMin: 7 * 60, endMin: 9 * 60 + 40 },
  { ca: 2, buoi: 'Sáng', tiet: [4, 6], startMin: 9 * 60 + 50, endMin: 12 * 60 + 30 },
  { ca: 3, buoi: 'Chiều', tiet: [7, 9], startMin: 13 * 60 + 30, endMin: 16 * 60 + 10 },
  { ca: 4, buoi: 'Chiều', tiet: [10, 12], startMin: 16 * 60 + 20, endMin: 19 * 60 },
]

export const END_OF_DAY_MINUTES = 23 * 60 + 59
export const DEFAULT_WORKBOOK_PATH = 'data/tkb-2025-2026-hk2.xlsx'
export const CACHE_VERSION = 'v1'
