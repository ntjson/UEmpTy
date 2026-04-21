import * as XLSX from 'xlsx'

import { parseWeekCoverage } from '@/lib/ghichu'
import type {
  Building,
  Ca,
  Class,
  ParseWarning,
  ParsedTimetable,
  Room,
  SemesterConfig,
  SerializedParsedTimetable,
  Thu,
  WeekRange,
} from '@/lib/types'

type RequiredField =
  | 'lop'
  | 'maHP'
  | 'mon'
  | 'maLHP'
  | 'nhom'
  | 'ltTh'
  | 'thu'
  | 'ca'
  | 'gd'
  | 'gv'
  | 'ghiChu'

interface HeaderMap {
  headerRowIndex: number
  columns: Record<Exclude<RequiredField, 'ghiChu'>, number>
  ghiChuColumns: number[]
  tcColumn?: number
}

interface ParseOptions {
  data: ArrayBuffer
  sourceFileName: string
  sourceFileHash: string
  config: SemesterConfig
}

interface NormalizedRoom {
  gd: string
  roomId: string
  code: string
  building: string
}

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })
const HEADER_SCAN_LIMIT = 15
const REQUIRED_HEADERS_FOR_DISCOVERY = ['lop', 'ma hp', 'thu', 'ca', 'gd'] as const

const HEADER_ALIASES: Record<RequiredField | 'tc', string[]> = {
  lop: ['lop'],
  maHP: ['ma hp'],
  mon: ['mon'],
  maLHP: ['ma lhp'],
  nhom: ['nhom'],
  ltTh: ['lt th'],
  thu: ['thu'],
  ca: ['ca'],
  gd: ['gd'],
  gv: ['gv'],
  ghiChu: ['ghi chu'],
  tc: ['tc'],
}

export function parseTimetable({
  data,
  sourceFileName,
  sourceFileHash,
  config,
}: ParseOptions): ParsedTimetable {
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array', dense: true })
  const warnings: ParseWarning[] = []
  const classes: Class[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    })
    const headerMap = detectHeaderMap(rows)

    if (!headerMap) {
      warnings.push({
        severity: 'warning',
        sheet: sheetName,
        row: 1,
        message: 'Không tìm thấy hàng tiêu đề hợp lệ, bỏ qua sheet này.',
      })
      continue
    }

    for (let rowIndex = headerMap.headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? []
      if (isBlankRow(row)) {
        continue
      }

      const fields = extractFields(row, headerMap)
      if (normalizeForMatching(fields.mon) === 'tong tc') {
        continue
      }

      if (!fields.gd.trim()) {
        continue
      }

      if (isOnline(fields.gd) || isOnline(fields.ltTh)) {
        continue
      }

      const thu = parseThu(fields.thu)
      if (!thu) {
        warnings.push({
          severity: 'warning',
          sheet: sheetName,
          row: rowIndex + 1,
          maLHP: fields.maLHP,
          ghiChu: fields.ghiChu,
          message: `Giá trị Thứ "${fields.thu}" không hợp lệ, bỏ qua dòng.`,
        })
        continue
      }

      const caResult = parseCaField(fields.ca)
      if (caResult.cas.length === 0) {
        warnings.push({
          severity: 'warning',
          sheet: sheetName,
          row: rowIndex + 1,
          maLHP: fields.maLHP,
          ghiChu: fields.ghiChu,
          message: `Giá trị Ca "${fields.ca}" không hợp lệ, bỏ qua dòng.`,
        })
        continue
      }

      if (caResult.expanded) {
        warnings.push({
          severity: 'warning',
          sheet: sheetName,
          row: rowIndex + 1,
          maLHP: fields.maLHP,
          ghiChu: fields.ghiChu,
          message: `Giá trị Ca "${fields.ca}" được tách thành nhiều ca để tính chiếm dụng.`,
        })
      }

      const room = normalizeRoom(fields.gd)
      if (room.building === '?') {
        warnings.push({
          severity: 'warning',
          sheet: sheetName,
          row: rowIndex + 1,
          maLHP: fields.maLHP,
          ghiChu: fields.ghiChu,
          message: `Phòng "${fields.gd}" không có hậu tố tòa nhà, gán tòa "?".`,
        })
      }

      for (const ca of caResult.cas) {
        const weekResult = parseWeekCoverage(
          fields.ghiChu,
          ca,
          config.totalWeeks,
          config.excludedWeeks,
        )

        for (const message of weekResult.infoMessages) {
          warnings.push({
            severity: 'info',
            sheet: sheetName,
            row: rowIndex + 1,
            maLHP: fields.maLHP,
            ghiChu: fields.ghiChu,
            message,
          })
        }

        classes.push({
          lop: fields.lop.trim(),
          maHP: fields.maHP.trim(),
          mon: fields.mon.trim(),
          tc: parseNumberOrNull(fields.tc),
          maLHP: fields.maLHP.trim(),
          nhom: normalizeNullableText(fields.nhom),
          ltTh: fields.ltTh.trim(),
          thu,
          ca,
          gd: room.gd,
          roomId: room.roomId,
          building: room.building,
          gv: fields.gv.trim(),
          ghiChu: fields.ghiChu,
          weekCoverage: weekResult.weekCoverage,
          sourceSheet: sheetName,
          sourceRow: rowIndex + 1,
        })
      }
    }
  }

  const dedupedClasses = dedupeClasses(classes, warnings)
  emitConflictWarnings(dedupedClasses, warnings)
  const { rooms, buildings } = buildIndexes(dedupedClasses)

  return {
    classes: dedupedClasses,
    rooms,
    buildings,
    warnings,
    parsedAt: new Date().toISOString(),
    sourceFileName,
    sourceFileHash,
    semesterStartDate: config.semesterStartDate,
    totalWeeks: config.totalWeeks,
  }
}

export function serializeParsedTimetable(
  timetable: ParsedTimetable,
): SerializedParsedTimetable {
  return {
    ...timetable,
    rooms: [...timetable.rooms.entries()],
    buildings: [...timetable.buildings.entries()],
  }
}

export function deserializeParsedTimetable(
  payload: SerializedParsedTimetable,
): ParsedTimetable {
  return {
    ...payload,
    rooms: new Map(payload.rooms),
    buildings: new Map(payload.buildings),
  }
}

export function normalizeRoomIdInput(value: string): string {
  return normalizeRoom(value).roomId
}

export function normalizeForMatching(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectHeaderMap(rows: (string | number | null)[][]): HeaderMap | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, HEADER_SCAN_LIMIT); rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const normalizedCells = row.map((value) => normalizeForMatching(stringValue(value)))
    const nonEmptyCells = normalizedCells.filter(Boolean)
    const containsTargets = REQUIRED_HEADERS_FOR_DISCOVERY.every((target) =>
      nonEmptyCells.some((cell) => cell === target),
    )

    if (!containsTargets) {
      continue
    }

    const columns = {} as HeaderMap['columns']
    const ghiChuColumns: number[] = []
    let tcColumn: number | undefined

    for (let index = 0; index < normalizedCells.length; index += 1) {
      const header = normalizedCells[index]
      if (!header) {
        continue
      }

      const matchedKey = matchHeader(header)
      if (!matchedKey) {
        continue
      }

      if (matchedKey === 'ghiChu') {
        ghiChuColumns.push(index)
        continue
      }

      if (matchedKey === 'tc') {
        tcColumn ??= index
        continue
      }

      columns[matchedKey] ??= index
    }

    const missing = (Object.keys(HEADER_ALIASES) as Array<RequiredField | 'tc'>)
      .filter((key) => key !== 'tc' && key !== 'ghiChu')
      .filter((key) => columns[key as Exclude<RequiredField, 'ghiChu'>] === undefined)

    if (missing.length > 0 || ghiChuColumns.length === 0) {
      continue
    }

    return {
      headerRowIndex: rowIndex,
      columns,
      ghiChuColumns,
      tcColumn,
    }
  }

  return null
}

function matchHeader(header: string): RequiredField | 'tc' | null {
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [RequiredField | 'tc', string[]]
  >) {
    if (aliases.some((alias) => header === alias || header.startsWith(`${alias} `))) {
      return field
    }
  }

  return null
}

function extractFields(row: (string | number | null)[], headerMap: HeaderMap) {
  return {
    lop: readCell(row, headerMap.columns.lop),
    maHP: readCell(row, headerMap.columns.maHP),
    mon: readCell(row, headerMap.columns.mon),
    tc: headerMap.tcColumn !== undefined ? readCell(row, headerMap.tcColumn) : '',
    maLHP: readCell(row, headerMap.columns.maLHP),
    nhom: readCell(row, headerMap.columns.nhom),
    ltTh: readCell(row, headerMap.columns.ltTh),
    thu: readCell(row, headerMap.columns.thu),
    ca: readCell(row, headerMap.columns.ca),
    gd: readCell(row, headerMap.columns.gd),
    gv: readCell(row, headerMap.columns.gv),
    ghiChu: headerMap.ghiChuColumns.map((index) => readCell(row, index)).filter(Boolean).join(' | '),
  }
}

function readCell(row: (string | number | null)[], index: number): string {
  return stringValue(row[index]).replace(/\s+/g, ' ').trim()
}

function stringValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value)
  return text === 'NaN' ? '' : text
}

function isBlankRow(row: (string | number | null)[]): boolean {
  return row.every((value) => !stringValue(value).trim())
}

function isOnline(value: string): boolean {
  return value.trim().toUpperCase() === 'ONL'
}

function parseThu(value: string): Thu | null {
  const normalized = normalizeForMatching(value).replace(/\s+/g, '')

  if (!normalized) {
    return null
  }

  if (normalized === 'cn' || normalized === 'chunhat') {
    return 'CN'
  }

  const direct = Number.parseInt(normalized.replace('thu', ''), 10)
  if (Number.isFinite(direct) && direct >= 2 && direct <= 7) {
    return direct as Thu
  }

  return null
}

function parseCaField(value: string): { cas: Ca[]; expanded: boolean } {
  const normalized = value.replace(/\s+/g, '')
  const direct = Number.parseInt(normalized, 10)

  if (Number.isFinite(direct) && direct >= 1 && direct <= 4 && String(direct) === normalized) {
    return { cas: [direct as Ca], expanded: false }
  }

  const splitValues = normalized.split(/[-,]/).filter(Boolean)
  if (splitValues.length > 1) {
    const parsed = splitValues
      .map((part) => Number.parseInt(part, 10))
      .filter((part) => Number.isFinite(part) && part >= 1 && part <= 4)

    if (parsed.length === splitValues.length) {
      return {
        cas: [...new Set(parsed)] as Ca[],
        expanded: true,
      }
    }
  }

  return { cas: [], expanded: false }
}

function normalizeRoom(value: string): NormalizedRoom {
  const compact = value.trim().toUpperCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ')
  const lastHyphen = compact.lastIndexOf('-')

  if (lastHyphen === -1) {
    return {
      gd: compact,
      roomId: compact,
      code: compact,
      building: '?',
    }
  }

  const code = compact.slice(0, lastHyphen)
  const building = compact.slice(lastHyphen + 1) || '?'

  return {
    gd: compact,
    roomId: `${code}-${building}`,
    code,
    building,
  }
}

function parseNumberOrNull(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeNullableText(value: string): string | null {
  return value.trim() ? value.trim() : null
}

function dedupeClasses(classes: Class[], warnings: ParseWarning[]): Class[] {
  const deduped = new Map<string, Class>()

  for (const entry of classes) {
    const key = buildDedupKey(entry)
    const existing = deduped.get(key)

    if (!existing) {
      deduped.set(key, entry)
      continue
    }

    const mergedWeeks = [...new Set([...existing.weekCoverage.weeks, ...entry.weekCoverage.weeks])]
      .sort((left, right) => left - right)
    const mergedKind = mergeWeekKinds(existing.weekCoverage, entry.weekCoverage, mergedWeeks)

    if (existing.ghiChu !== entry.ghiChu) {
      warnings.push({
        severity: 'info',
        sheet: entry.sourceSheet,
        row: entry.sourceRow,
        maLHP: entry.maLHP,
        ghiChu: entry.ghiChu,
        message:
          'Phát hiện dòng trùng giữa nhiều sheet với ghi chú khác nhau; đã gộp tập tuần theo phép hợp.',
      })
    }

    existing.weekCoverage = {
      weeks: mergedWeeks,
      kind: mergedKind,
      sourceNote: existing.weekCoverage.sourceNote || entry.weekCoverage.sourceNote,
      warning: [existing.weekCoverage.warning, entry.weekCoverage.warning]
        .filter(Boolean)
        .join(' | ') || undefined,
    }
  }

  return [...deduped.values()]
}

function mergeWeekKinds(
  left: WeekRange,
  right: WeekRange,
  mergedWeeks: number[],
): WeekRange['kind'] {
  if (left.kind === right.kind && mergedWeeks.length === left.weeks.length) {
    return left.kind
  }

  if (left.kind === 'split' || right.kind === 'split') {
    return 'split'
  }

  if (left.kind === 'unparseable' || right.kind === 'unparseable') {
    return 'unparseable'
  }

  if (mergedWeeks.length === 0) {
    return 'list'
  }

  if (mergedWeeks.length === Math.max(...mergedWeeks) - Math.min(...mergedWeeks) + 1) {
    return mergedWeeks.length === 1 ? 'list' : 'range'
  }

  return 'list'
}

function buildDedupKey(entry: Class): string {
  return [entry.maLHP, entry.nhom ?? '', entry.thu, entry.ca, entry.roomId].join('|')
}

function emitConflictWarnings(classes: Class[], warnings: ParseWarning[]) {
  const grouped = new Map<string, Class[]>()

  for (const entry of classes) {
    const key = `${entry.roomId}|${entry.thu}|${entry.ca}`
    const bucket = grouped.get(key) ?? []
    bucket.push(entry)
    grouped.set(key, bucket)
  }

  for (const bucket of grouped.values()) {
    for (let index = 0; index < bucket.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < bucket.length; otherIndex += 1) {
        const left = bucket[index]
        const right = bucket[otherIndex]
        const overlap = left.weekCoverage.weeks.filter((week) =>
          right.weekCoverage.weeks.includes(week),
        )

        if (overlap.length === 0) {
          continue
        }

        warnings.push({
          severity: 'error',
          sheet: left.sourceSheet,
          row: left.sourceRow,
          maLHP: left.maLHP,
          message:
            `Phát hiện trùng lịch phòng ${left.roomId} giữa ` +
            `${left.maLHP} (dòng ${left.sourceRow}) và ${right.maLHP} (dòng ${right.sourceRow}) ` +
            `ở các tuần ${overlap.join(', ')}.`,
        })
      }
    }
  }
}

function buildIndexes(classes: Class[]): {
  rooms: Map<string, Room>
  buildings: Map<string, Building>
} {
  const rooms = new Map<string, Room>()
  const buildings = new Map<string, Building>()

  for (const entry of classes) {
    const existingRoom = rooms.get(entry.roomId)
    if (existingRoom) {
      existingRoom.usageCount += entry.weekCoverage.weeks.length
    } else {
      rooms.set(entry.roomId, {
        id: entry.roomId,
        code: normalizeRoom(entry.roomId).code,
        building: entry.building,
        usageCount: entry.weekCoverage.weeks.length,
      })
    }

    const existingBuilding = buildings.get(entry.building)
    if (existingBuilding) {
      if (!existingBuilding.rooms.includes(entry.roomId)) {
        existingBuilding.rooms.push(entry.roomId)
      }
    } else {
      buildings.set(entry.building, { code: entry.building, rooms: [entry.roomId] })
    }
  }

  for (const building of buildings.values()) {
    building.rooms.sort((left, right) => collator.compare(left, right))
  }

  return { rooms, buildings }
}
