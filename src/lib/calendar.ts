import { differenceInCalendarDays } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

import type { DateInfo, SemesterConfig, Thu } from '@/lib/types'

export function buildZonedDate(
  dateString: string,
  timeString: string,
  timezone: string,
): Date {
  return fromZonedTime(`${dateString}T${timeString}:00`, timezone)
}

export function getNowParts(timezone: string): {
  date: Date
  dateString: string
  timeString: string
} {
  const now = new Date()

  return {
    date: now,
    dateString: formatInTimeZone(now, timezone, 'yyyy-MM-dd'),
    timeString: formatInTimeZone(now, timezone, 'HH:mm'),
  }
}

export function getMinutesSinceMidnight(date: Date, timezone: string): number {
  const [hours, minutes] = formatInTimeZone(date, timezone, 'HH:mm')
    .split(':')
    .map((value) => Number.parseInt(value, 10))

  return hours * 60 + minutes
}

export function getDateInfo(date: Date, config: SemesterConfig): DateInfo {
  const start = buildZonedDate(config.semesterStartDate, '00:00', config.timezone)
  const normalizedDate = buildZonedDate(
    formatInTimeZone(date, config.timezone, 'yyyy-MM-dd'),
    '00:00',
    config.timezone,
  )
  const daysSinceStart = differenceInCalendarDays(normalizedDate, start)

  if (daysSinceStart < 0) {
    return { inSemester: false, reason: 'before-semester' }
  }

  if (daysSinceStart >= config.totalWeeks * 7) {
    return { inSemester: false, reason: 'after-semester' }
  }

  const weekNumber = Math.floor(daysSinceStart / 7) + 1

  if (config.excludedWeeks.includes(weekNumber)) {
    return { inSemester: false, reason: 'excluded-week', weekNumber }
  }

  const isoDay = Number.parseInt(formatInTimeZone(date, config.timezone, 'i'), 10)
  const thu: Thu = isoDay === 7 ? 'CN' : ((isoDay + 1) as Thu)

  return {
    inSemester: true,
    weekNumber,
    thu,
  }
}
