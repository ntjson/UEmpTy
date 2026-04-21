<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (event: 'file-selected', file: File): void
}>()

defineProps<{
  disabled?: boolean
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  emit('file-selected', file)
  input.value = ''
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file) {
    return
  }

  emit('file-selected', file)
}
</script>

<template>
  <section
    class="panel border-dashed px-5 py-6 text-center transition"
    :class="dragging ? 'border-tide/60 bg-mist/80' : 'border-ink/10'"
    @dragenter.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @dragover.prevent
    @drop="onDrop"
  >
    <p class="font-display text-lg font-semibold">🔼 Kéo-thả hoặc chọn file thời khóa biểu (.xlsx)</p>
    <p class="mt-2 text-sm text-dusk">
      Nếu bạn tải lên file khác, ứng dụng chỉ dùng file đó trong phiên làm việc hiện tại.
    </p>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <button class="primary-btn" type="button" :disabled="disabled" @click="inputRef?.click()">
        Chọn file .xlsx
      </button>
      <p class="self-center text-sm text-dusk">Hỗ trợ cả thả file trực tiếp từ máy</p>
    </div>

    <input
      ref="inputRef"
      type="file"
      class="hidden"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      @change="onFileChange"
    />
  </section>
</template>
