<script setup lang="ts">
import { useRouter } from 'vue-router'

import UploadCard from '@/components/UploadCard.vue'
import { useTimetableStore } from '@/stores/timetable'

const router = useRouter()
const store = useTimetableStore()

function openRoute(path: '/room' | '/empty') {
  if (!store.hasData) {
    return
  }

  void router.push(path)
}
</script>

<template>
  <section class="grid gap-4">
    <div class="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
      <article class="panel px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-dusk/70">Tra cứu nhanh</p>
        <h2 class="mt-3 font-display text-3xl font-semibold leading-tight">
          Xem phòng nào đang trống mà không phải dò file Excel bằng tay.
        </h2>
        <p class="mt-3 max-w-xl text-sm text-dusk">
          Dữ liệu được đọc trực tiếp từ thời khóa biểu HK II 2025–2026 và lưu trong trình duyệt để lần sau tra cứu nhanh hơn.
        </p>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <button class="primary-btn" type="button" :disabled="!store.hasData" @click="openRoute('/room')">
            Kiểm tra 1 phòng
          </button>
          <button class="secondary-btn" type="button" :disabled="!store.hasData" @click="openRoute('/empty')">
            Tìm phòng trống ngay
          </button>
        </div>

        <div
          class="mt-6 rounded-[26px] border px-4 py-4 text-sm"
          :class="
            store.hasData
              ? 'border-moss/20 bg-moss/5 text-ink'
              : 'border-ember/25 bg-ember/5 text-ember'
          "
        >
          <p class="font-semibold">
            {{ store.hasData ? 'Đã sẵn sàng tra cứu' : 'Chưa có dữ liệu thời khóa biểu' }}
          </p>
          <p class="mt-2">
            {{ store.hasData ? store.sourceLabel : 'Hai nút tra cứu sẽ mở sau khi ứng dụng đọc được file .xlsx hợp lệ.' }}
          </p>
        </div>
      </article>

      <article class="panel flex flex-col justify-between gap-6 overflow-hidden px-5 py-5">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-dusk/70">Ba câu hỏi chính</p>
          <div class="mt-4 grid gap-3">
            <div class="rounded-3xl bg-white/75 p-4">
              <p class="font-semibold text-ink">1. Phòng X có đang trống không?</p>
              <p class="mt-2 text-sm text-dusk">Xem ngay trạng thái, giờ kết thúc lớp hiện tại và lớp kế tiếp.</p>
            </div>
            <div class="rounded-3xl bg-white/75 p-4">
              <p class="font-semibold text-ink">2. Gần tòa mình đang đứng có phòng nào rảnh?</p>
              <p class="mt-2 text-sm text-dusk">Xếp hạng theo tòa nhà tham chiếu rồi theo thời lượng còn trống.</p>
            </div>
            <div class="rounded-3xl bg-white/75 p-4">
              <p class="font-semibold text-ink">3. Tuần sau lúc 14:00 thì sao?</p>
              <p class="mt-2 text-sm text-dusk">Đổi ngày giờ ở thanh trên và mọi kết quả sẽ cập nhật theo tuần học tương ứng.</p>
            </div>
          </div>
        </div>
      </article>
    </div>

    <UploadCard :disabled="store.loading" @file-selected="store.loadUploadedFile" />

    <article v-if="store.activeSource === 'session'" class="panel px-5 py-4 text-sm text-dusk">
      Đang dùng dữ liệu tạm thời từ file bạn vừa tải lên. Bạn có thể quay lại bộ dữ liệu mặc định trong nút
      <button class="font-semibold text-tide" type="button" @click="void store.restoreBundledSource()">
        cài đặt dữ liệu
      </button>
      ở góc phải trên.
    </article>
  </section>
</template>
