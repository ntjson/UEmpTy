import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { buildZonedDate, getNowParts } from '@/lib/calendar'
import { CACHE_VERSION, DEFAULT_WORKBOOK_PATH } from '@/lib/constants'
import { deserializeParsedTimetable, parseTimetable, serializeParsedTimetable } from '@/lib/parser'
import type { ParsedTimetable, SemesterConfig, SerializedParsedTimetable } from '@/lib/types'

export const useTimetableStore = defineStore('timetable', () => {
  const config = ref<SemesterConfig | null>(null)
  const timetable = ref<ParsedTimetable | null>(null)
  const loading = ref(false)
  const bootstrapped = ref(false)
  const errorMessage = ref('')
  const selectedDate = ref('')
  const selectedTime = ref('')
  const warningsOpen = ref(false)
  const settingsOpen = ref(false)

  const hasData = computed(() => timetable.value !== null)
  const timezone = computed(() => config.value?.timezone ?? 'Asia/Ho_Chi_Minh')
  const warningCount = computed(() => timetable.value?.warnings.length ?? 0)
  const roomOptions = computed(() =>
    timetable.value
      ? [...timetable.value.rooms.values()].sort((left, right) =>
          left.id.localeCompare(right.id, 'vi', { numeric: true }),
        )
      : [],
  )
  const buildingOptions = computed(() =>
    timetable.value
      ? [...timetable.value.buildings.keys()].sort((left, right) =>
          left.localeCompare(right, 'vi', { numeric: true }),
        )
      : [],
  )
  const queryDateTime = computed(() =>
    config.value
      ? buildZonedDate(selectedDate.value, selectedTime.value, config.value.timezone)
      : new Date(),
  )
  const sourceLabel = computed(() => {
    if (!timetable.value) {
      return 'Chưa tải dữ liệu'
    }

    return `Tệp mặc định: ${timetable.value.sourceFileName}`
  })

  async function bootstrap() {
    if (bootstrapped.value || loading.value) {
      return
    }

    loading.value = true
    errorMessage.value = ''

    try {
      const loadedConfig = await loadConfig()
      config.value = loadedConfig

      const nowParts = getNowParts(loadedConfig.timezone)
      selectedDate.value = nowParts.dateString
      selectedTime.value = nowParts.timeString

      await loadBundledWorkbook()
      bootstrapped.value = true
    } catch (error) {
      errorMessage.value = toErrorMessage(error, 'Không thể khởi tạo dữ liệu thời khóa biểu.')
    } finally {
      loading.value = false
    }
  }

  async function loadBundledWorkbook() {
    ensureConfig()
    loading.value = true
    errorMessage.value = ''

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${DEFAULT_WORKBOOK_PATH}`)
      if (!response.ok) {
        throw new Error('Không tải được file thời khóa biểu mặc định.')
      }

      const fileName = DEFAULT_WORKBOOK_PATH.split('/').at(-1) ?? 'tkb.xlsx'
      const buffer = await response.arrayBuffer()
      const parsed = await parseBuffer(buffer, fileName)
      timetable.value = parsed
    } catch (error) {
      errorMessage.value = toErrorMessage(error, 'Không thể tải file thời khóa biểu mặc định.')
      timetable.value = null
    } finally {
      loading.value = false
    }
  }

  function resetToNow() {
    if (!config.value) {
      return
    }

    const nowParts = getNowParts(config.value.timezone)
    selectedDate.value = nowParts.dateString
    selectedTime.value = nowParts.timeString
  }

  function setSelectedDate(value: string) {
    selectedDate.value = value
  }

  function setSelectedTime(value: string) {
    selectedTime.value = value
  }

  function setWarningsOpen(value: boolean) {
    warningsOpen.value = value
  }

  function setSettingsOpen(value: boolean) {
    settingsOpen.value = value
  }

  async function parseBuffer(buffer: ArrayBuffer, fileName: string) {
    const loadedConfig = ensureConfig()
    const fileHash = await sha256(buffer)
    const cached = tryReadCache(fileHash, loadedConfig)
    if (cached) {
      return cached
    }

    const parsed = parseTimetable({
      data: buffer,
      sourceFileHash: fileHash,
      sourceFileName: fileName,
      config: loadedConfig,
    })
    writeCache(parsed)
    return parsed
  }

  function tryReadCache(fileHash: string, loadedConfig: SemesterConfig) {
    try {
      const cached = localStorage.getItem(cacheKey(fileHash, loadedConfig))
      if (!cached) {
        return null
      }

      return deserializeParsedTimetable(JSON.parse(cached) as SerializedParsedTimetable)
    } catch {
      return null
    }
  }

  function writeCache(parsed: ParsedTimetable) {
    if (!config.value) {
      return
    }

    const key = cacheKey(parsed.sourceFileHash, config.value)
    localStorage.setItem(key, JSON.stringify(serializeParsedTimetable(parsed)))
  }

  function ensureConfig() {
    if (!config.value) {
      throw new Error('Thiếu cấu hình học kỳ.')
    }

    return config.value
  }

  return {
    bootstrapped,
    buildingOptions,
    config,
    errorMessage,
    hasData,
    loading,
    queryDateTime,
    resetToNow,
    roomOptions,
    selectedDate,
    selectedTime,
    setSelectedDate,
    setSelectedTime,
    setSettingsOpen,
    setWarningsOpen,
    settingsOpen,
    sourceLabel,
    timetable,
    timezone,
    warningCount,
    warningsOpen,
    bootstrap,
  }
})

async function loadConfig(): Promise<SemesterConfig> {
  const response = await fetch(`${import.meta.env.BASE_URL}semester.json`)
  if (!response.ok) {
    throw new Error('Không tải được cấu hình học kỳ.')
  }

  return (await response.json()) as SemesterConfig
}

function cacheKey(fileHash: string, config: SemesterConfig) {
  return [
    'uempty',
    CACHE_VERSION,
    fileHash,
    config.semesterStartDate,
    config.totalWeeks,
    config.timezone,
    config.excludedWeeks.join(','),
  ].join(':')
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
