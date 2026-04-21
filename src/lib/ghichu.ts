import type { Ca, WeekRange } from '@/lib/types'

interface ClauseResult {
  matched: boolean
  neutral: boolean
  weeks: number[]
  kind: WeekRange['kind']
  warning?: string
}

export interface WeekCoverageParseResult {
  weekCoverage: WeekRange
  infoMessages: string[]
}

export function parseWeekCoverage(
  note: string,
  ca: Ca,
  totalWeeks: number,
  excludedWeeks: number[] = [],
  ltTh = '',
): WeekCoverageParseResult {
  const sourceNote = note.trim()
  const allWeeks = buildAllWeeks(totalWeeks)
  const normalizedTeachingMode = normalizeTeachingMode(ltTh)

  if (!sourceNote) {
    return {
      weekCoverage: {
        weeks: subtractWeeks(allWeeks, excludedWeeks),
        kind: 'all',
        sourceNote,
      },
      infoMessages: [],
    }
  }

  const clauses = splitClauses(sourceNote)
  const infoMessages: string[] = []
  let currentWeeks: number[] | null = null
  let currentKind: WeekRange['kind'] | null = null
  let matchedAny = false
  let neutralMatch = false

  for (const clause of clauses) {
    const result = parseClause(clause, ca, totalWeeks, normalizedTeachingMode)

    if (result.warning) {
      infoMessages.push(result.warning)
    }

    if (result.neutral) {
      neutralMatch = true
      continue
    }

    if (!result.matched) {
      continue
    }

    matchedAny = true
    currentWeeks = currentWeeks ? intersectWeeks(currentWeeks, result.weeks) : result.weeks
    currentKind = mergeKinds(currentKind, result.kind)
  }

  if (!matchedAny) {
    if (neutralMatch) {
      return {
        weekCoverage: {
          weeks: subtractWeeks(allWeeks, excludedWeeks),
          kind: 'all',
          sourceNote,
        },
        infoMessages,
      }
    }

    const warning =
      'Ghi chú không nhận diện được, mặc định dùng toàn bộ số tuần cấu hình.'
    infoMessages.push(warning)

    return {
      weekCoverage: {
        weeks: subtractWeeks(allWeeks, excludedWeeks),
        kind: 'unparseable',
        sourceNote,
        warning: warning,
      },
      infoMessages,
    }
  }

  const weeks = subtractWeeks(currentWeeks ?? allWeeks, excludedWeeks)
  const warning = infoMessages.length > 0 ? infoMessages.join(' | ') : undefined

  return {
    weekCoverage: {
      weeks,
      kind: currentKind ?? 'all',
      sourceNote,
      warning,
    },
    infoMessages,
  }
}

function parseClause(
  clause: string,
  ca: Ca,
  totalWeeks: number,
  teachingMode: 'lt' | 'th' | null,
): ClauseResult {
  const normalized = normalizeForMatching(clause)
  const allWeeks = buildAllWeeks(totalWeeks)
  const subtractors = [...normalized.matchAll(/nghi tuan\s+([0-9,\-\s]+)/g)]
  let working = normalized

  for (const match of subtractors) {
    working = working.replace(match[0], ' ')
  }

  const subtractWeeksList = subtractors.flatMap((match) => parseWeekTokens(match[1], totalWeeks))
  const baseText = working.replace(/\s+/g, ' ').trim()

  if (!baseText && subtractWeeksList.length > 0) {
    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(allWeeks, subtractWeeksList),
      kind: 'list',
    }
  }

  const stageMatch = matchStageSpecificWeeks(baseText, teachingMode, totalWeeks)
  if (stageMatch) {
    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(stageMatch.weeks, subtractWeeksList),
      kind: stageMatch.kind,
    }
  }

  if (containsStageSpecificWeeks(baseText)) {
    return { matched: false, neutral: true, weeks: allWeeks, kind: 'all' }
  }

  const caRangeMatch = baseText.match(/ca\s*(\d+)\s*\(\s*hoc tu tuan\s*(\d+)\s*-\s*(\d+)\s*\)/)
  if (caRangeMatch) {
    const targetCa = Number.parseInt(caRangeMatch[1], 10) as Ca
    if (targetCa !== ca) {
      return { matched: false, neutral: true, weeks: allWeeks, kind: 'all' }
    }

    const weeks = makeRange(caRangeMatch[2], caRangeMatch[3], totalWeeks)
    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(weeks, subtractWeeksList),
      kind: 'range',
    }
  }

  const caFromWeekMatch = baseText.match(
    /ca\s*(\d+)\s*\(\s*hoc dong thoi voi ca\s*\d+\s*tu tuan\s*(\d+)\s*\)/,
  )
  if (caFromWeekMatch) {
    const targetCa = Number.parseInt(caFromWeekMatch[1], 10) as Ca
    if (targetCa !== ca) {
      return { matched: false, neutral: true, weeks: allWeeks, kind: 'all' }
    }

    const start = Number.parseInt(caFromWeekMatch[2], 10)
    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(makeRange(start, totalWeeks, totalWeeks), subtractWeeksList),
      kind: 'range',
    }
  }

  const splitMatch = baseText.match(
    /hoc\s+\d+\s*ca\/\d+\s*tuan dau\s*,\s*tu tuan\s*\d+\s*hoc\s+\d+\s*ca\/tuan/,
  )
  if (splitMatch) {
    const warning =
      'Ghi chú dạng chia ca nhiều giai đoạn được hiểu là phủ toàn học kỳ; cần rà soát thủ công.'

    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(allWeeks, subtractWeeksList),
      kind: 'split',
      warning,
    }
  }

  const dotMatch = baseText.match(/hoc\s+\d+\s*ca\/(\d+)\s*tuan(?:\s*,?\s*thi(?: vao)? dot\s*(1|2))?$/)
  if (dotMatch) {
    const numberOfWeeks = Number.parseInt(dotMatch[1], 10)
    const examDot = dotMatch[2]

    if (numberOfWeeks === totalWeeks) {
      return {
        matched: true,
        neutral: false,
        weeks: subtractWeeks(allWeeks, subtractWeeksList),
        kind: 'all',
      }
    }

    if (examDot === '1') {
      return {
        matched: true,
        neutral: false,
        weeks: subtractWeeks(makeRange(1, numberOfWeeks, totalWeeks), subtractWeeksList),
        kind: 'range',
      }
    }

    if (examDot === '2') {
      const start = Math.max(1, totalWeeks - numberOfWeeks + 1)
      return {
        matched: true,
        neutral: false,
        weeks: subtractWeeks(makeRange(start, totalWeeks, totalWeeks), subtractWeeksList),
        kind: 'range',
        warning: 'Áp dụng quy ước "đợt 2" là dồn về các tuần cuối học kỳ.',
      }
    }
  }

  const hyphenListMatch = baseText.match(/hoc tuan\s*(\d+(?:\s*-\s*\d+){2,})/)
  if (hyphenListMatch) {
    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(parseDelimitedWeekList(hyphenListMatch[1], totalWeeks), subtractWeeksList),
      kind: 'list',
    }
  }

  const rangeMatch = baseText.match(/hoc tuan\s*(\d+)\s*-\s*(\d+)/)
  if (rangeMatch) {
    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(makeRange(rangeMatch[1], rangeMatch[2], totalWeeks), subtractWeeksList),
      kind: 'range',
    }
  }

  const listMatch = baseText.match(/hoc tuan\s*(\d+(?:\s*,\s*\d+)+)/)
  if (listMatch) {
    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(parseWeekTokens(listMatch[1], totalWeeks), subtractWeeksList),
      kind: 'list',
    }
  }

  if (subtractWeeksList.length > 0) {
    return {
      matched: true,
      neutral: false,
      weeks: subtractWeeks(allWeeks, subtractWeeksList),
      kind: 'list',
    }
  }

  return {
    matched: false,
    neutral: false,
    weeks: allWeeks,
    kind: 'unparseable',
  }
}

function mergeKinds(
  current: WeekRange['kind'] | null,
  next: WeekRange['kind'],
): WeekRange['kind'] {
  if (!current || current === 'all') {
    return next
  }

  if (next === 'all' || current === next) {
    return current
  }

  if (current === 'split' || next === 'split') {
    return 'split'
  }

  if (current === 'unparseable' || next === 'unparseable') {
    return 'unparseable'
  }

  return 'list'
}

function splitClauses(note: string): string[] {
  return note
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function normalizeTeachingMode(value: string): 'lt' | 'th' | null {
  const normalized = normalizeForMatching(value)

  if (normalized === 'lt') {
    return 'lt'
  }

  if (normalized === 'th') {
    return 'th'
  }

  return null
}

function normalizeForMatching(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function buildAllWeeks(totalWeeks: number): number[] {
  return Array.from({ length: totalWeeks }, (_, index) => index + 1)
}

function parseWeekTokens(source: string, totalWeeks: number): number[] {
  const tokens = source
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  const weeks = new Set<number>()

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/)
    if (rangeMatch) {
      for (const week of makeRange(rangeMatch[1], rangeMatch[2], totalWeeks)) {
        weeks.add(week)
      }
      continue
    }

    const week = Number.parseInt(token, 10)
    if (Number.isFinite(week) && week >= 1 && week <= totalWeeks) {
      weeks.add(week)
    }
  }

  return [...weeks].sort((left, right) => left - right)
}

function parseDelimitedWeekList(source: string, totalWeeks: number): number[] {
  return [...new Set(source.split(/[-,]/).flatMap((token) => parseWeekTokens(token, totalWeeks)))]
    .sort((left, right) => left - right)
}

function makeRange(startInput: string | number, endInput: string | number, totalWeeks: number): number[] {
  const start = clampWeek(Number.parseInt(String(startInput), 10), totalWeeks)
  const end = clampWeek(Number.parseInt(String(endInput), 10), totalWeeks)
  const lower = Math.min(start, end)
  const upper = Math.max(start, end)

  return Array.from({ length: upper - lower + 1 }, (_, index) => lower + index)
}

function clampWeek(week: number, totalWeeks: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.min(Math.max(week, 1), totalWeeks)
}

function subtractWeeks(weeks: number[], removed: number[]): number[] {
  const removedSet = new Set(removed)
  return weeks.filter((week) => !removedSet.has(week))
}

function intersectWeeks(left: number[], right: number[]): number[] {
  const rightSet = new Set(right)
  return left.filter((week) => rightSet.has(week))
}

function matchStageSpecificWeeks(
  clause: string,
  teachingMode: 'lt' | 'th' | null,
  totalWeeks: number,
): Pick<ClauseResult, 'weeks' | 'kind'> | null {
  if (!teachingMode) {
    return null
  }

  const matches = [...clause.matchAll(/hoc\s+(lt|th)\s+(?:tu\s+)?tuan\s*(\d+)\s*-\s*(\d+)/g)]
  if (matches.length === 0) {
    return null
  }

  const relevantMatch = matches.find((match) => match[1] === teachingMode)
  if (!relevantMatch) {
    return null
  }

  return {
    weeks: makeRange(relevantMatch[2], relevantMatch[3], totalWeeks),
    kind: 'range',
  }
}

function containsStageSpecificWeeks(clause: string): boolean {
  return /hoc\s+(lt|th)\s+(?:tu\s+)?tuan\s*\d+\s*-\s*\d+/.test(clause)
}
