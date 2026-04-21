<script setup lang="ts">
import { computed } from 'vue'

import { formatDurationLabel, formatFreeUntilLabel, formatMinutesAsTime } from '@/lib/format'
import type { RankedEmptyRoom } from '@/lib/types'

const props = defineProps<{
  entry: RankedEmptyRoom
}>()

const freeLabel = computed(() =>
  formatFreeUntilLabel(props.entry.freeUntil, Boolean(props.entry.nextClass)),
)
</script>

<template>
  <article class="panel px-5 py-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="status-pill bg-moss/10 text-moss">🟢 {{ entry.room.id }}</div>
        <p class="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-dusk/70">Tòa {{ entry.room.building }}</p>
      </div>

      <div class="sm:text-right">
        <p class="font-display text-xl font-semibold text-ink">{{ freeLabel }}</p>
        <p class="mt-1 text-sm text-dusk">(còn {{ formatDurationLabel(entry.freeDuration) }})</p>
      </div>
    </div>

    <div class="mt-4 rounded-3xl bg-white/75 p-4 text-sm text-dusk">
      <template v-if="entry.nextClass">
        <p class="font-semibold text-ink">
          Lớp tiếp theo: {{ entry.nextClass.maLHP }} lúc
          {{ formatMinutesAsTime(entry.freeUntil) }}
        </p>
        <p class="mt-2">{{ entry.nextClass.mon }} • {{ entry.nextClass.lop }}</p>
      </template>
      <p v-else class="font-semibold text-ink">Không còn lớp nào khác trong ngày được chọn.</p>
    </div>
  </article>
</template>
