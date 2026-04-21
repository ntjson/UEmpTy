<script setup lang="ts">
import { computed, ref } from 'vue'

import EmptyRoomCard from '@/components/EmptyRoomCard.vue'
import { formatSemesterReason } from '@/lib/format'
import { rankedEmptyRooms } from '@/lib/query'
import { useTimetableStore } from '@/stores/timetable'

const store = useTimetableStore()
const referenceBuilding = ref('')
const durationScale = [0, 30, 60, 120]
const durationIndex = ref(0)

const minimumMinutes = computed(() => durationScale[durationIndex.value] ?? 0)
const ranking = computed(() => {
  if (!store.timetable || !store.config) {
    return null
  }

  return rankedEmptyRooms(
    store.timetable,
    store.config,
    store.queryDateTime,
    referenceBuilding.value || undefined,
  )
})

const filteredRooms = computed(() =>
  ranking.value?.rooms.filter((entry) => entry.freeDuration >= minimumMinutes.value) ?? [],
)
</script>

<template>
  <section class="grid gap-4">
    <article class="panel px-5 py-5">
      <div class="grid gap-5">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-dusk/70">Xếp hạng theo vị trí</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="chip-button"
              :class="referenceBuilding === '' ? 'chip-button-active' : 'chip-button-muted'"
              @click="referenceBuilding = ''"
            >
              Tất cả
            </button>
            <button
              v-for="building in store.buildingOptions"
              :key="building"
              type="button"
              class="chip-button"
              :class="
                referenceBuilding === building ? 'chip-button-active' : 'chip-button-muted'
              "
              @click="referenceBuilding = building"
            >
              {{ building }}
            </button>
          </div>
        </div>

        <label class="field-block">
          <span>Chỉ hiện phòng trống ≥ {{ minimumMinutes }} phút</span>
          <input v-model="durationIndex" type="range" class="accent-tide" min="0" max="3" step="1" />
        </label>
      </div>
    </article>

    <article v-if="!store.hasData" class="panel px-5 py-5 text-sm text-dusk">
      Chưa có dữ liệu để xếp hạng phòng trống. Hãy quay lại trang chủ để tải thời khóa biểu.
    </article>

    <article
      v-else-if="ranking?.error?.status === 'out-of-semester'"
      class="panel px-5 py-5 text-sm text-dusk"
    >
      {{ formatSemesterReason(ranking.error.reason, store.selectedDate) }}
    </article>

    <div v-else-if="filteredRooms.length > 0" class="grid gap-4">
      <EmptyRoomCard v-for="entry in filteredRooms" :key="entry.room.id" :entry="entry" />
    </div>

    <article v-else class="panel px-5 py-5 text-sm text-dusk">
      Không có phòng nào trống ở thời điểm này 😔
    </article>
  </section>
</template>
