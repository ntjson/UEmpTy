import { formatInTimeZone } from 'date-fns-tz'

import { END_OF_DAY_MINUTES } from '@/lib/constants'
import type { ParseWarning, SemesterBoundaryReason, Thu } from '@/lib/types'

export function formatThuLabel(thu: Thu): string {
  if (thu === 'CN') {
    return 'Chủ nhật'
  }

  return `Thứ ${thu}`
}

export function formatQueryDate(date: Date, timezone: string): string {
  const isoDay = Number.parseInt(formatInTimeZone(date, timezone, 'i'), 10)
  const thu = isoDay === 7 ? 'CN' : ((isoDay + 1) as Thu)
  return `${formatThuLabel(thu)}, ${formatInTimeZone(date, timezone, 'dd/MM/yyyy')}`
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const safeMinutes = Math.max(0, totalMinutes)
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function formatDurationLabel(durationMinutes: number): string {
  if (durationMinutes <= 0) {
    return '0 phút'
  }

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${minutes} phút`
}

export function formatFreeUntilLabel(freeUntil: number, nextExists: boolean): string {
  if (!nextExists && freeUntil >= END_OF_DAY_MINUTES) {
    return 'Trống cả ngày'
  }

  return `Trống đến ${formatMinutesAsTime(freeUntil)}`
}

export function formatParsedAt(isoString: string, timezone: string): string {
  return formatInTimeZone(new Date(isoString), timezone, 'dd/MM/yyyy HH:mm')
}

export function formatSemesterReason(
  reason: SemesterBoundaryReason,
  dateString: string,
): string {
  if (reason === 'before-semester' || reason === 'after-semester') {
    return `Ngày bạn chọn (${formatDateString(dateString)}) không nằm trong HK II 2025–2026.`
  }

  return `Tuần của ngày ${formatDateString(dateString)} đang bị loại trừ khỏi học kỳ cấu hình.`
}

export function groupWarningsBySheet(warnings: ParseWarning[]) {
  const grouped = new Map<string, ParseWarning[]>()

  for (const warning of warnings) {
    const bucket = grouped.get(warning.sheet) ?? []
    bucket.push(warning)
    grouped.set(warning.sheet, bucket)
  }

  return [...grouped.entries()]
}

function formatDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}
