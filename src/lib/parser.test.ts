import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'

import { parseTimetable } from '@/lib/parser'
import type { SemesterConfig } from '@/lib/types'

const config: SemesterConfig = {
  semesterStartDate: '2026-01-12',
  totalWeeks: 15,
  timezone: 'Asia/Ho_Chi_Minh',
  excludedWeeks: [],
}

function workbookToArrayBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer
  return Uint8Array.from(output).buffer
}

describe('parseTimetable', () => {
  it('detects headers, filters rows, and builds room indexes', () => {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Lớp', 'Mã HP', 'Môn', 'TC', 'Mã LHP', 'Nhóm', 'LT/TH', 'Thứ', 'Ca', 'GĐ', 'GV', 'Ghi chú'],
      ['K69A', 'INT2213', 'Mạng máy tính', 3, 'INT2213 1', '', 'LT', '6', '4', '105-B', 'GV A', ''],
      ['K69A', 'INT2213', 'Tổng TC', 3, 'INT2213 1', '', 'LT', '6', '4', '105-B', 'GV A', ''],
      ['K69B', 'INT9999', 'Online', 3, 'INT9999 1', '', 'ONL', '6', '1', 'ONL', 'GV B', ''],
      ['K69C', 'MAT1042', 'Giải tích', 3, 'MAT1042 1', '', 'LT', '4', '1-2', '308-B', 'GV C', 'Học tuần 3-6'],
    ])

    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet3')

    const parsed = parseTimetable({
      data: workbookToArrayBuffer(workbook),
      sourceFileHash: 'fixture',
      sourceFileName: 'fixture.xlsx',
      config,
    })

    expect(parsed.classes).toHaveLength(3)
    expect(parsed.rooms.has('105-B')).toBe(true)
    expect(parsed.rooms.has('308-B')).toBe(true)
    expect(parsed.warnings.some((warning) => warning.message.includes('tách thành nhiều ca'))).toBe(true)
  })

  it('merges duplicate rows across sheets and warns on note differences', () => {
    const workbook = XLSX.utils.book_new()
    const rows = [
      ['Lớp', 'Mã HP', 'Môn', 'TC', 'Mã LHP', 'Nhóm', 'LT/TH', 'Thứ', 'Ca', 'GĐ', 'GV', 'Ghi chú'],
      ['K69A', 'INT2213', 'Mạng máy tính', 3, 'INT2213 1', '', 'LT', '6', '4', '105-B', 'GV A', 'Học tuần 1-4'],
    ]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Sheet3')
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        rows[0],
        ['K69A', 'INT2213', 'Mạng máy tính', 3, 'INT2213 1', '', 'LT', '6', '4', '105-B', 'GV A', 'Học tuần 5-8'],
      ]),
      'KhoaCNTT',
    )

    const parsed = parseTimetable({
      data: workbookToArrayBuffer(workbook),
      sourceFileHash: 'fixture',
      sourceFileName: 'fixture.xlsx',
      config,
    })

    expect(parsed.classes).toHaveLength(1)
    expect(parsed.classes[0].weekCoverage.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(parsed.warnings.some((warning) => warning.message.includes('ghi chú khác nhau'))).toBe(true)
  })

  it('can parse the committed official workbook as a smoke test', () => {
    const workbookPath = path.resolve(process.cwd(), 'public/data/tkb-2025-2026-hk2.xlsx')
    const buffer = fs.readFileSync(workbookPath)

    const parsed = parseTimetable({
      data: Uint8Array.from(buffer).buffer,
      sourceFileHash: 'official',
      sourceFileName: 'tkb-2025-2026-hk2.xlsx',
      config,
    })

    expect(parsed.classes.length).toBeGreaterThan(0)
    expect(parsed.rooms.size).toBeGreaterThan(0)
  })
})
