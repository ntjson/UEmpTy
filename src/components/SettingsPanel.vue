<script setup lang="ts">
defineProps<{
  open: boolean
  sourceLabel: string
  semesterStartDate: string
  totalWeeks: number
  timezone: string
  warningCount: number
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'open-warnings'): void
}>()
</script>

<template>
  <div v-if="open" class="sheet-backdrop" @click.self="emit('close')">
    <section class="sheet-panel max-w-xl">
      <div class="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-dusk/70">Dữ liệu & cài đặt</p>
          <h2 class="font-display text-2xl font-semibold">Thông tin bộ dữ liệu</h2>
        </div>

        <button class="icon-button" type="button" @click="emit('close')">✕</button>
      </div>

      <div class="space-y-4 px-5 py-5 text-sm text-ink">
        <section class="rounded-3xl bg-mist/70 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-dusk/70">Nguồn dữ liệu</p>
          <p class="mt-2 font-semibold">{{ sourceLabel }}</p>
        </section>

        <section class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-3xl bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-dusk/70">Tuần 1 bắt đầu</p>
            <p class="mt-2 font-semibold">{{ semesterStartDate || 'Chưa tải' }}</p>
          </div>
          <div class="rounded-3xl bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-dusk/70">Số tuần</p>
            <p class="mt-2 font-semibold">{{ totalWeeks }}</p>
          </div>
          <div class="rounded-3xl bg-white/80 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-dusk/70">Múi giờ</p>
            <p class="mt-2 font-semibold">{{ timezone }}</p>
          </div>
        </section>

        <div class="flex flex-col gap-3 sm:flex-row">
          <button class="secondary-btn flex-1" type="button" @click="emit('open-warnings')">
            Xem {{ warningCount }} cảnh báo
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
