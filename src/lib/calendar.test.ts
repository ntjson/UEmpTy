import { describe, expect, it } from 'vitest'

import { buildZonedDate, getDateInfo, getMinutesSinceMidnight } from '@/lib/calendar'
import type { SemesterConfig } from '@/lib/types'

const config: SemesterConfig = {
  semesterStartDate: '2026-01-12',
  totalWeeks: 15,
  timezone: 'Asia/Ho_Chi_Minh',
  excludedWeeks: [],
}

describe('calendar helpers', () => {
  it('maps an in-semester date to the right week and thu', () => {
    const date = buildZonedDate('2026-03-06', '16:30', config.timezone)

    expect(getDateInfo(date, config)).toEqual({
      inSemester: true,
      weekNumber: 8,
      thu: 6,
    })
  })

  it('returns before-semester for dates before week 1', () => {
    const date = buildZonedDate('2026-01-01', '08:00', config.timezone)
    expect(getDateInfo(date, config)).toEqual({
      inSemester: false,
      reason: 'before-semester',
    })
  })

  it('returns after-semester for dates after the configured range', () => {
    const date = buildZonedDate('2026-06-01', '08:00', config.timezone)
    expect(getDateInfo(date, config)).toEqual({
      inSemester: false,
      reason: 'after-semester',
    })
  })

  it('marks excluded weeks as out-of-semester', () => {
    const excludedConfig: SemesterConfig = {
      ...config,
      excludedWeeks: [8],
    }
    const date = buildZonedDate('2026-03-06', '08:00', excludedConfig.timezone)

    expect(getDateInfo(date, excludedConfig)).toEqual({
      inSemester: false,
      reason: 'excluded-week',
      weekNumber: 8,
    })
  })

  it('maps Sunday to CN and tracks clock minutes in Vietnam time', () => {
    const sunday = buildZonedDate('2026-01-18', '09:15', config.timezone)

    expect(getDateInfo(sunday, config)).toEqual({
      inSemester: true,
      weekNumber: 1,
      thu: 'CN',
    })
    expect(getMinutesSinceMidnight(sunday, config.timezone)).toBe(9 * 60 + 15)
  })
})
