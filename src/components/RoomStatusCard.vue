<script setup lang="ts">
import { computed } from 'vue'

import { formatFreeUntilLabel, formatMinutesAsTime, formatSemesterReason } from '@/lib/format'
import type { RoomAvailability } from '@/lib/types'

const props = defineProps<{
  roomId: string
  building: string
  dateString: string
  status: RoomAvailability
}>()

const freeLabel = computed(() => {
  if (props.status.status !== 'free') {
    return ''
  }

  return formatFreeUntilLabel(props.status.freeUntil, Boolean(props.status.next))
})
</script>

<template>
  <section class="panel px-5 py-5">
    <template v-if="status.status === 'occupied'">
      <div class="status-pill bg-ember/10 text-ember">🔴 Đang bận</div>
      <h2 class="mt-3 font-display text-2xl font-semibold">{{ roomId }} • Tòa {{ building }}</h2>

      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div class="rounded-3xl bg-sand/70 p-4">
          <p class="text-sm font-semibold uppercase tracking-[0.18em] text-dusk/70">Hiện tại</p>
          <p class="mt-3 font-semibold text-ink">{{ status.current.maLHP }} — {{ status.current.mon }}</p>
          <p class="mt-2 text-sm text-dusk">{{ status.current.lop }} • GV: {{ status.current.gv || 'Chưa rõ' }}</p>
          <p class="mt-4 text-sm font-semibold text-ink">Kết thúc: {{ formatMinutesAsTime(status.endsAt) }}</p>
        </div>

        <div class="rounded-3xl bg-white/75 p-4">
          <p class="text-sm font-semibold uppercase tracking-[0.18em] text-dusk/70">Tiếp theo</p>
          <template v-if="status.next">
            <p class="mt-3 font-semibold text-ink">{{ status.next.maLHP }} — {{ status.next.mon }}</p>
            <p class="mt-2 text-sm text-dusk">{{ status.next.lop }} • Bắt đầu ở ca {{ status.next.ca }}</p>
          </template>
          <p v-else class="mt-3 text-sm text-dusk">Không có lớp nào nữa hôm nay</p>
        </div>
      </div>

      <div
        v-if="status.conflictingClasses.length > 1"
        class="mt-4 rounded-3xl border border-ember/20 bg-ember/5 p-4 text-sm text-ink"
      >
        <p class="font-semibold text-ember">Dữ liệu đang có xung đột cùng phòng/cùng ca:</p>
        <ul class="mt-2 space-y-2">
          <li v-for="entry in status.conflictingClasses" :key="`${entry.maLHP}-${entry.sourceRow}`">
            {{ entry.maLHP }} — {{ entry.mon }} ({{ entry.sourceSheet }}, dòng {{ entry.sourceRow }})
          </li>
        </ul>
      </div>
    </template>

    <template v-else-if="status.status === 'free'">
      <div class="status-pill bg-moss/10 text-moss">🟢 Đang trống</div>
      <h2 class="mt-3 font-display text-2xl font-semibold">{{ roomId }} • Tòa {{ building }}</h2>

      <div class="mt-4 rounded-3xl bg-mist/80 p-4">
        <p class="font-display text-xl font-semibold text-ink">{{ freeLabel }}</p>
        <template v-if="status.next">
          <p class="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-dusk/70">Lớp tiếp theo</p>
          <p class="mt-2 font-semibold text-ink">{{ status.next.maLHP }} — {{ status.next.mon }}</p>
          <p class="mt-2 text-sm text-dusk">Bắt đầu ở ca {{ status.next.ca }}</p>
        </template>
        <p v-else class="mt-4 text-sm text-dusk">Không có lớp nào nữa trong ngày được chọn.</p>
      </div>
    </template>

    <template v-else>
      <div class="status-pill bg-dusk/10 text-dusk">⚪ Ngoài học kỳ</div>
      <h2 class="mt-3 font-display text-2xl font-semibold">Ngày ngoài phạm vi dữ liệu</h2>
      <p class="mt-4 max-w-xl text-sm text-dusk">
        {{ formatSemesterReason(status.reason, dateString) }}
      </p>
    </template>
  </section>
</template>
