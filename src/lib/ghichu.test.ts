import { describe, expect, it } from 'vitest'

import { parseWeekCoverage } from '@/lib/ghichu'

describe('parseWeekCoverage', () => {
  it('returns all weeks for an empty note', () => {
    const result = parseWeekCoverage('', 1, 15)
    expect(result.weekCoverage.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(result.weekCoverage.kind).toBe('all')
  })

  it('parses front-loaded đợt 1 notes', () => {
    const result = parseWeekCoverage('Học 1 ca/10 tuần, thi đợt 1', 1, 15)
    expect(result.weekCoverage.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result.weekCoverage.kind).toBe('range')
  })

  it('parses back-loaded đợt 2 notes and emits an info warning', () => {
    const result = parseWeekCoverage('Học 1 ca/10 tuần, thi đợt 2', 1, 15)
    expect(result.weekCoverage.weeks).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(result.infoMessages).toContain('Áp dụng quy ước "đợt 2" là dồn về các tuần cuối học kỳ.')
  })

  it('parses explicit week lists', () => {
    const result = parseWeekCoverage('Học tuần 2, 4, 6, 8', 1, 15)
    expect(result.weekCoverage.weeks).toEqual([2, 4, 6, 8])
    expect(result.weekCoverage.kind).toBe('list')
  })

  it('parses hyphen-separated week lists from workbook notes', () => {
    const result = parseWeekCoverage('Học tuần 8-9-10 | Thi đợt 2', 1, 15)
    expect(result.weekCoverage.weeks).toEqual([8, 9, 10])
    expect(result.weekCoverage.kind).toBe('list')
  })

  it('ignores ca-specific clauses that belong to another ca', () => {
    const result = parseWeekCoverage('Ca 1 (học từ tuần 1-15)', 2, 15)
    expect(result.weekCoverage.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(result.weekCoverage.kind).toBe('all')
  })

  it('intersects compound clauses and subtracts nghỉ tuần', () => {
    const result = parseWeekCoverage('Học tuần 3-8; Nghỉ tuần 5, 7', 1, 15)
    expect(result.weekCoverage.weeks).toEqual([3, 4, 6, 8])
  })

  it('marks split schedules with a maintainer warning', () => {
    const result = parseWeekCoverage(
      'Học 1 ca/10 tuần đầu, từ tuần 11 học 2 ca/tuần, thi vào đợt 2',
      1,
      15,
    )
    expect(result.weekCoverage.kind).toBe('split')
    expect(result.infoMessages[0]).toContain('cần rà soát thủ công')
  })

  it('respects LT/TH-specific staged notes', () => {
    const ltResult = parseWeekCoverage(
      'Học LT từ tuần 1-3, học TH tuần 4-11, thi đợt 2',
      1,
      15,
      [],
      'LT',
    )
    const thResult = parseWeekCoverage(
      'Học LT từ tuần 1-3, học TH tuần 4-11, thi đợt 2',
      1,
      15,
      [],
      'TH',
    )

    expect(ltResult.weekCoverage.weeks).toEqual([1, 2, 3])
    expect(thResult.weekCoverage.weeks).toEqual([4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('falls back to all weeks for unparseable notes', () => {
    const result = parseWeekCoverage('Theo kế hoạch khoa', 1, 15)
    expect(result.weekCoverage.kind).toBe('unparseable')
    expect(result.weekCoverage.weeks).toHaveLength(15)
  })
})
