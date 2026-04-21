<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import headerLogoUrl from '../logo.png'

import SettingsPanel from '@/components/SettingsPanel.vue'
import WarningsDrawer from '@/components/WarningsDrawer.vue'
import { formatParsedAt, formatQueryDate } from '@/lib/format'
import { useTimetableStore } from '@/stores/timetable'

const store = useTimetableStore()

onMounted(() => {
  void store.bootstrap()
})

const dateLabel = computed(() =>
  store.config ? formatQueryDate(store.queryDateTime, store.config.timezone) : 'Đang tải ngày giờ...',
)

const parsedAtLabel = computed(() => {
  if (!store.timetable || !store.config) {
    return 'chưa có'
  }

  return formatParsedAt(store.timetable.parsedAt, store.config.timezone)
})

function openWarningsFromSettings() {
  store.setSettingsOpen(false)
  store.setWarningsOpen(true)
}
</script>

<template>
  <div class="min-h-screen bg-transparent text-ink">
    <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-5 sm:px-6">
      <header class="panel mb-4 overflow-hidden">
        <div class="flex items-center justify-between gap-4 border-b border-white/50 px-5 py-4">
          <div class="flex items-center gap-3">
            <img
              :src="headerLogoUrl"
              alt="Logo Trường Đại học Công nghệ, ĐHQGHN"
              class="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
              width="56"
              height="56"
            />
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-dusk/70">
                ĐHQGHN • Trường Đại học Công nghệ
              </p>
              <h1 class="font-display text-2xl font-semibold">Phòng trống UET</h1>
            </div>
          </div>

          <button
            class="icon-button"
            type="button"
            aria-label="Mở cài đặt dữ liệu"
            @click="store.setSettingsOpen(true)"
          >
            ⚙
          </button>
        </div>

        <div class="grid gap-4 px-5 py-4 md:grid-cols-[1.3fr_auto_auto] md:items-end">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-dusk/70">
              Thời điểm tra cứu
            </p>
            <p class="font-display text-xl font-semibold">{{ dateLabel }}</p>
          </div>

          <label class="field-block">
            <span>Ngày</span>
            <input
              :value="store.selectedDate"
              type="date"
              class="field-input"
              @input="store.setSelectedDate(($event.target as HTMLInputElement).value)"
            />
          </label>

          <div class="flex gap-3 sm:items-end">
            <label class="field-block flex-1">
              <span>Giờ</span>
              <input
                :value="store.selectedTime"
                type="time"
                class="field-input"
                @input="store.setSelectedTime(($event.target as HTMLInputElement).value)"
              />
            </label>

            <button class="secondary-btn h-[46px] shrink-0" type="button" @click="store.resetToNow">
              Bây giờ
            </button>
          </div>
        </div>
      </header>

      <div v-if="store.errorMessage" class="mb-4 rounded-3xl border border-ember/30 bg-white/80 px-4 py-3 text-sm text-ember shadow-panel">
        {{ store.errorMessage }}
      </div>

      <main class="flex-1">
        <RouterView />
      </main>

      <footer class="panel mt-5 flex flex-col gap-3 px-5 py-4 text-sm text-dusk md:flex-row md:items-center md:justify-between">
        <div>
          Dữ liệu: HK II 2025–2026 • Cập nhật lần cuối:
          <span class="font-semibold text-ink">{{ parsedAtLabel }}</span>
        </div>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-full border border-ink/10 bg-white/80 px-4 py-2 font-semibold text-ink transition hover:border-tide/40 hover:text-tide disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="store.warningCount === 0"
          @click="store.setWarningsOpen(true)"
        >
          {{ store.warningCount }} ghi chú cần rà soát
        </button>
      </footer>
    </div>

    <div
      v-if="store.loading"
      class="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-ink/25 px-4"
    >
      <div class="panel w-full max-w-sm px-5 py-4 text-center">
        <p class="font-display text-xl font-semibold">Đang phân tích thời khóa biểu...</p>
        <p class="mt-2 text-sm text-dusk">
          Bộ dữ liệu sẽ được lưu cục bộ để những lần truy cập sau nhanh hơn.
        </p>
      </div>
    </div>

    <WarningsDrawer
      :open="store.warningsOpen"
      :warnings="store.timetable?.warnings ?? []"
      @close="store.setWarningsOpen(false)"
    />

    <SettingsPanel
      :open="store.settingsOpen"
      :source-label="store.sourceLabel"
      :semester-start-date="store.config?.semesterStartDate ?? ''"
      :total-weeks="store.config?.totalWeeks ?? 0"
      :timezone="store.timezone"
      :warning-count="store.warningCount"
      @close="store.setSettingsOpen(false)"
      @open-warnings="openWarningsFromSettings"
    />
  </div>
</template>
