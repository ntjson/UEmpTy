export type Thu = 2 | 3 | 4 | 5 | 6 | 7 | 'CN'
export type Ca = 1 | 2 | 3 | 4

export interface Class {
  lop: string
  maHP: string
  mon: string
  tc: number | null
  maLHP: string
  nhom: string | null
  ltTh: 'LT' | 'TH' | string
  thu: Thu
  ca: Ca
  gd: string
  roomId: string
  building: string
  gv: string
  ghiChu: string
  weekCoverage: WeekRange
  sourceSheet: string
  sourceRow: number
}

export interface Room {
  id: string
  code: string
  building: string
  usageCount: number
}

export interface Building {
  code: string
  rooms: string[]
}

export interface CaSlot {
  ca: Ca
  buoi: 'Sáng' | 'Chiều'
  tiet: [number, number]
  startMin: number
  endMin: number
}

export interface WeekRange {
  weeks: number[]
  kind: 'all' | 'range' | 'list' | 'split' | 'unparseable'
  sourceNote: string
  warning?: string
}

export interface ParseWarning {
  severity: 'info' | 'warning' | 'error'
  sheet: string
  row: number
  maLHP?: string
  ghiChu?: string
  message: string
}

export interface ParsedTimetable {
  classes: Class[]
  rooms: Map<string, Room>
  buildings: Map<string, Building>
  warnings: ParseWarning[]
  parsedAt: string
  sourceFileName: string
  sourceFileHash: string
  semesterStartDate: string
  totalWeeks: number
}

export interface SemesterConfig {
  semesterStartDate: string
  totalWeeks: number
  timezone: string
  excludedWeeks: number[]
}

export type SemesterBoundaryReason =
  | 'before-semester'
  | 'after-semester'
  | 'excluded-week'

export type DateInfo =
  | {
      inSemester: true
      weekNumber: number
      thu: Thu
    }
  | {
      inSemester: false
      reason: SemesterBoundaryReason
      weekNumber?: number
    }

export interface OccupiedRoomStatus {
  status: 'occupied'
  current: Class
  endsAt: number
  next: Class | null
  conflictingClasses: Class[]
}

export interface FreeRoomStatus {
  status: 'free'
  next: Class | null
  freeUntil: number
}

export interface OutOfSemesterStatus {
  status: 'out-of-semester'
  reason: SemesterBoundaryReason
  weekNumber?: number
}

export type RoomAvailability =
  | OccupiedRoomStatus
  | FreeRoomStatus
  | OutOfSemesterStatus

export interface RankedEmptyRoom {
  room: Room
  freeUntil: number
  freeDuration: number
  nextClass: Class | null
}

export interface SerializedParsedTimetable {
  classes: Class[]
  rooms: Array<[string, Room]>
  buildings: Array<[string, Building]>
  warnings: ParseWarning[]
  parsedAt: string
  sourceFileName: string
  sourceFileHash: string
  semesterStartDate: string
  totalWeeks: number
}
