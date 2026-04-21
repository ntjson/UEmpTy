<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import RoomStatusCard from '@/components/RoomStatusCard.vue'
import { isRoomFree } from '@/lib/query'
import { normalizeRoomIdInput } from '@/lib/parser'
import { useTimetableStore } from '@/stores/timetable'

const store = useTimetableStore()
const roomInput = ref('')
const submittedRoomId = ref('')
const inputError = ref('')

const roomRecord = computed(() =>
  store.timetable?.rooms.get(submittedRoomId.value) ?? null,
)

const status = computed(() => {
  if (!store.timetable || !store.config || !roomRecord.value) {
    return null
  }

  return isRoomFree(store.timetable, store.config, roomRecord.value.id, store.queryDateTime)
})

watch(
  () => store.roomOptions,
  (rooms) => {
    if (!submittedRoomId.value && rooms.length > 0) {
      roomInput.value = rooms[0].id
      submittedRoomId.value = rooms[0].id
    }
  },
  { immediate: true },
)

function submitRoom() {
  if (!roomInput.value.trim()) {
    inputError.value = 'Vui lòng nhập mã phòng.'
    return
  }

  const normalized = normalizeRoomIdInput(roomInput.value)
  if (!store.timetable?.rooms.has(normalized)) {
    inputError.value = `Không tìm thấy phòng "${normalized}" trong dữ liệu hiện tại.`
    return
  }

  inputError.value = ''
  submittedRoomId.value = normalized
  roomInput.value = normalized
}
</script>

<template>
  <section class="grid gap-4">
    <article class="panel px-5 py-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-end">
        <label class="field-block flex-1">
          <span>Mã phòng (vd: 308-B)</span>
          <input
            v-model="roomInput"
            list="room-options"
            class="field-input"
            type="text"
            placeholder="Nhập mã phòng"
            @keydown.enter.prevent="submitRoom"
          />
          <datalist id="room-options">
            <option v-for="room in store.roomOptions" :key="room.id" :value="room.id" />
          </datalist>
        </label>

        <button class="primary-btn md:w-40" type="button" :disabled="!store.hasData" @click="submitRoom">
          Kiểm tra
        </button>
      </div>

      <p v-if="inputError" class="mt-3 text-sm text-ember">{{ inputError }}</p>
      <p v-else class="mt-3 text-sm text-dusk">
        Chọn từ danh sách gợi ý hoặc nhập trực tiếp mã phòng rồi nhấn Enter.
      </p>
    </article>

    <article v-if="!store.hasData" class="panel px-5 py-5 text-sm text-dusk">
      Chưa có dữ liệu để tra cứu. Hãy quay lại trang chủ và tải hoặc kiểm tra file thời khóa biểu.
    </article>

    <RoomStatusCard
      v-else-if="roomRecord && status"
      :room-id="roomRecord.id"
      :building="roomRecord.building"
      :date-string="store.selectedDate"
      :status="status"
    />
  </section>
</template>
