import { CA_SLOTS, END_OF_DAY_MINUTES } from '@/lib/constants'
import { getDateInfo, getMinutesSinceMidnight } from '@/lib/calendar'
import type {
  Class,
  ParsedTimetable,
  RankedEmptyRoom,
  RoomAvailability,
  SemesterConfig,
} from '@/lib/types'

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })

export function isRoomFree(
  timetable: ParsedTimetable,
  config: SemesterConfig,
  roomId: string,
  date: Date,
): RoomAvailability {
  const info = getDateInfo(date, config)
  if (!info.inSemester) {
    return { status: 'out-of-semester', reason: info.reason, weekNumber: info.weekNumber }
  }

  const nowMin = getMinutesSinceMidnight(date, config.timezone)
  const normalizedRoomId = roomId.trim().toUpperCase()
  const todaysClasses = timetable.classes
    .filter((entry) => entry.roomId === normalizedRoomId)
    .filter((entry) => entry.thu === info.thu)
    .filter((entry) => entry.weekCoverage.weeks.includes(info.weekNumber))
    .sort((left, right) => slotForCa(left.ca).startMin - slotForCa(right.ca).startMin)

  const currentClasses = todaysClasses.filter((entry) => {
    const slot = slotForCa(entry.ca)
    return slot.startMin <= nowMin && nowMin < slot.endMin
  })

  if (currentClasses.length > 0) {
    const current = currentClasses[0]
    const currentSlot = slotForCa(current.ca)
    const next = todaysClasses.find((entry) => slotForCa(entry.ca).startMin > currentSlot.endMin) ?? null

    return {
      status: 'occupied',
      current,
      endsAt: currentSlot.endMin,
      next,
      conflictingClasses: currentClasses,
    }
  }

  const next = todaysClasses.find((entry) => slotForCa(entry.ca).startMin > nowMin) ?? null

  return {
    status: 'free',
    next,
    freeUntil: next ? slotForCa(next.ca).startMin : END_OF_DAY_MINUTES,
  }
}

export function rankedEmptyRooms(
  timetable: ParsedTimetable,
  config: SemesterConfig,
  date: Date,
  referenceBuilding?: string,
): { error?: RoomAvailability; rooms: RankedEmptyRoom[] } {
  const state = getDateInfo(date, config)
  if (!state.inSemester) {
    return {
      error: { status: 'out-of-semester', reason: state.reason, weekNumber: state.weekNumber },
      rooms: [],
    }
  }

  const nowMin = getMinutesSinceMidnight(date, config.timezone)
  const results: RankedEmptyRoom[] = []

  for (const room of timetable.rooms.values()) {
    const status = isRoomFree(timetable, config, room.id, date)
    if (status.status !== 'free') {
      continue
    }

    results.push({
      room,
      freeUntil: status.freeUntil,
      freeDuration: status.freeUntil - nowMin,
      nextClass: status.next,
    })
  }

  results.sort((left, right) => {
    const buildingDelta =
      matchesReference(right.room.building, referenceBuilding) -
      matchesReference(left.room.building, referenceBuilding)

    if (buildingDelta !== 0) {
      return buildingDelta
    }

    if (right.freeDuration !== left.freeDuration) {
      return right.freeDuration - left.freeDuration
    }

    const codeCompare = collator.compare(left.room.code, right.room.code)
    if (codeCompare !== 0) {
      return codeCompare
    }

    return collator.compare(left.room.id, right.room.id)
  })

  return { rooms: results }
}

export function getConflictingClasses(
  classes: Class[],
  weekNumber: number,
): Class[][] {
  const grouped = new Map<string, Class[]>()

  for (const entry of classes) {
    if (!entry.weekCoverage.weeks.includes(weekNumber)) {
      continue
    }

    const key = `${entry.roomId}|${entry.thu}|${entry.ca}`
    const existing = grouped.get(key) ?? []
    existing.push(entry)
    grouped.set(key, existing)
  }

  return [...grouped.values()].filter((group) => group.length > 1)
}

function slotForCa(ca: Class['ca']) {
  return CA_SLOTS[ca - 1]
}

function matchesReference(building: string, referenceBuilding?: string): number {
  return referenceBuilding && building === referenceBuilding ? 1 : 0
}
