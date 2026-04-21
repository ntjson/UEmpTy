<script setup lang="ts">
import { computed } from 'vue'

import { groupWarningsBySheet } from '@/lib/format'
import type { ParseWarning } from '@/lib/types'

const props = defineProps<{
  open: boolean
  warnings: ParseWarning[]
}>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

const groupedWarnings = computed(() => groupWarningsBySheet(props.warnings))
</script>

<template>
  <div v-if="open" class="sheet-backdrop" @click.self="emit('close')">
    <section class="sheet-panel h-full max-w-3xl">
      <div class="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-dusk/70">Warnings drawer</p>
          <h2 class="font-display text-2xl font-semibold">Ghi chú cần rà soát</h2>
        </div>

        <button class="icon-button" type="button" @click="emit('close')">✕</button>
      </div>

      <div class="space-y-4 overflow-y-auto px-5 py-5">
        <template v-if="warnings.length > 0">
          <section
            v-for="[sheet, entries] in groupedWarnings"
            :key="sheet"
            class="rounded-3xl bg-sand/60 p-4"
          >
            <h3 class="font-display text-lg font-semibold">{{ sheet }}</h3>
            <div class="mt-3 space-y-3 text-sm text-ink">
              <div
                v-for="warning in entries"
                :key="`${warning.sheet}-${warning.row}-${warning.message}`"
                class="rounded-2xl bg-white/80 p-3"
              >
                <p class="font-semibold">
                  {{ warning.sheet }}, dòng {{ warning.row }}:
                  <span
                    :class="
                      warning.severity === 'error'
                        ? 'text-ember'
                        : warning.severity === 'warning'
                          ? 'text-dusk'
                          : 'text-tide'
                    "
                  >
                    {{ warning.message }}
                  </span>
                </p>
                <p v-if="warning.ghiChu" class="mt-2 text-dusk">Ghi chú gốc: {{ warning.ghiChu }}</p>
              </div>
            </div>
          </section>
        </template>

        <p v-else class="text-sm text-dusk">Không có cảnh báo nào cần hiển thị.</p>
      </div>
    </section>
  </div>
</template>
