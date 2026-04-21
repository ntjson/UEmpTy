import { describe, expect, it } from 'vitest'

import { buildZonedDate } from '@/lib/calendar'
import { rankedEmptyRooms, isRoomFree } from '@/lib/query'
import type { ParsedTimetable, SemesterConfig } from '@/lib/types'

const config: SemesterConfig = {
  semesterStartDate: '2026-01-12',
  totalWeeks: 15,
  timezone: 'Asia/Ho_Chi_Minh',
  excludedWeeks: [],
}

const timetable: ParsedTimetable = {
  classes: [
    {
      lop: 'K69I-IT1',
      maHP: 'INT2213',
      mon: 'Mạng máy tính',
      tc: 3,
      maLHP: 'INT2213 1',
      nhom: null,
      ltTh: 'LT',
      thu: 6,
      ca: 4,
      gd: '105-B',
      roomId: '105-B',
      building: 'B',
      gv: 'Nguyễn Văn A',
      ghiChu: '',
      weekCoverage: { weeks: [1, 2, 3, 4, 5, 6, 7, 8], kind: 'all', sourceNote: '' },
      sourceSheet: 'Sheet1',
      sourceRow: 2,
    },
    {
      lop: 'K69I-IT2',
      maHP: 'MAT1041 3',
      mon: 'Giải tích 1',
      tc: 3,
      maLHP: 'MAT1041 3',
      nhom: null,
      ltTh: 'LT',
      thu: 6,
      ca: 3,
      gd: '213-T',
      roomId: '213-T',
      building: 'T',
      gv: 'Lê B',
      ghiChu: '',
      weekCoverage: { weeks: [8], kind: 'all', sourceNote: '' },
      sourceSheet: 'Sheet1',
      sourceRow: 3,
    },
  ],
  rooms: new Map([
    ['105-B', { id: '105-B', code: '105', building: 'B', usageCount: 8 }],
    ['308-B', { id: '308-B', code: '308', building: 'B', usageCount: 0 }],
    ['213-T', { id: '213-T', code: '213', building: 'T', usageCount: 1 }],
  ]),
  buildings: new Map([
    ['B', { code: 'B', rooms: ['105-B', '308-B'] }],
    ['T', { code: 'T', rooms: ['213-T'] }],
  ]),
  warnings: [],
  parsedAt: '2026-01-12T00:00:00.000Z',
  sourceFileName: 'fixture.xlsx',
  sourceFileHash: 'hash',
  semesterStartDate: '2026-01-12',
  totalWeeks: 15,
}

describe('query helpers', () => {
  it('returns occupied during a class and includes the end time', () => {
    const date = buildZonedDate('2026-03-06', '16:30', config.timezone)
    const result = isRoomFree(timetable, config, '105-B', date)

    expect(result.status).toBe('occupied')
    if (result.status === 'occupied') {
      expect(result.current.maLHP).toBe('INT2213 1')
      expect(result.endsAt).toBe(19 * 60)
    }
  })

  it('returns free during the gap before the next ca', () => {
    const date = buildZonedDate('2026-03-06', '16:15', config.timezone)
    const result = isRoomFree(timetable, config, '105-B', date)

    expect(result).toEqual({
      status: 'free',
      next: timetable.classes[0],
      freeUntil: 16 * 60 + 20,
    })
  })

  it('returns out-of-semester before the configured start date', () => {
    const date = buildZonedDate('2026-01-01', '08:00', config.timezone)
    expect(isRoomFree(timetable, config, '105-B', date)).toEqual({
      status: 'out-of-semester',
      reason: 'before-semester',
      weekNumber: undefined,
    })
  })

  it('ranks empty rooms by building preference then duration', () => {
    const date = buildZonedDate('2026-03-06', '16:30', config.timezone)
    const result = rankedEmptyRooms(timetable, config, date, 'B')

    expect(result.rooms.map((entry) => entry.room.id)).toEqual(['308-B', '213-T'])
  })
})
