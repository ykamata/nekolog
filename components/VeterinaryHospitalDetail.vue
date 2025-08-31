<template>
  <div class="veterinary-hospital-detail">
    <!-- ローディング状態 -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-8"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <span class="ml-3 text-gray-600">読み込み中...</span>
    </div>

    <!-- エラー状態 -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-md p-4"
    >
      <div class="flex">
        <svg
          class="h-5 w-5 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            エラーが発生しました
          </h3>
          <p class="mt-1 text-sm text-red-700">
            {{ error }}
          </p>
        </div>
      </div>
    </div>

    <!-- 病院詳細 -->
    <div
      v-else-if="hospital"
      class="space-y-6"
    >
      <!-- 基本情報 -->
      <div>
        <h4 class="text-base font-medium text-gray-900 mb-4">
          基本情報
        </h4>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm font-medium text-gray-500">
              病院名
            </dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ hospital.name }}
            </dd>
          </div>

          <div v-if="hospital.address">
            <dt class="text-sm font-medium text-gray-500">
              住所
            </dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ hospital.address }}
            </dd>
          </div>

          <div v-if="hospital.phone">
            <dt class="text-sm font-medium text-gray-500">
              電話番号
            </dt>
            <dd class="mt-1 text-sm text-gray-900">
              <a
                :href="`tel:${hospital.phone}`"
                class="text-blue-600 hover:text-blue-800"
              >
                {{ hospital.phone }}
              </a>
            </dd>
          </div>

          <div>
            <dt class="text-sm font-medium text-gray-500">
              登録日
            </dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ formatDate(hospital.createdAt) }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- メモ -->
      <div v-if="hospital.memo">
        <h4 class="text-base font-medium text-gray-900 mb-2">
          メモ
        </h4>
        <p class="text-sm text-gray-700 whitespace-pre-wrap">
          {{ hospital.memo }}
        </p>
      </div>

      <!-- 所属先生一覧 -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-base font-medium text-gray-900">
            所属先生一覧
            <span
              v-if="hospital.doctors"
              class="ml-2 text-sm text-gray-500"
            >
              ({{ hospital.doctors.length }}名)
            </span>
          </h4>
          <button
            class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="handleAddDoctor"
          >
            <svg
              class="-ml-0.5 mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            先生を追加
          </button>
        </div>

        <div
          v-if="hospital.doctors && hospital.doctors.length > 0"
          class="bg-gray-50 rounded-lg divide-y divide-gray-200"
        >
          <div
            v-for="doctor in hospital.doctors"
            :key="doctor.id"
            class="p-4 flex items-center justify-between"
          >
            <div class="flex-1">
              <h5 class="text-sm font-medium text-gray-900">
                {{ doctor.name }}
              </h5>
              <p
                v-if="doctor.specialty"
                class="text-sm text-gray-500"
              >
                専門分野: {{ doctor.specialty }}
              </p>
            </div>
            <div class="flex items-center space-x-2">
              <button
                class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                @click="handleEditDoctor(doctor)"
              >
                編集
              </button>
              <button
                class="text-red-600 hover:text-red-800 text-sm font-medium"
                @click="handleDeleteDoctor(doctor.id)"
              >
                削除
              </button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="text-center py-8 text-gray-500"
        >
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p class="mt-2 text-sm">
            この病院に所属する先生はまだ登録されていません
          </p>
        </div>
      </div>

      <!-- アクションボタン -->
      <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <button
          class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="handleEdit"
        >
          <svg
            class="-ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          編集
        </button>

        <button
          class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          @click="handleDelete"
        >
          <svg
            class="-ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          削除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VeterinaryHospital, VeterinaryDoctor } from '~/types/veterinary-master';

// Props
interface Props {
  hospital?: VeterinaryHospital | null;
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  hospital: null,
  loading: false,
  error: null,
});

// Emits
interface Emits {
  edit: [hospital: VeterinaryHospital];
  delete: [hospitalId: string];
  addDoctor: [hospitalId: string];
  editDoctor: [doctor: VeterinaryDoctor];
  deleteDoctor: [doctorId: string];
}

const emit = defineEmits<Emits>();

// ユーティリティ関数
const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// イベントハンドラー
const handleEdit = () => {
  if (props.hospital) {
    emit('edit', props.hospital);
  }
};

const handleDelete = () => {
  if (props.hospital) {
    emit('delete', props.hospital.id);
  }
};

const handleAddDoctor = () => {
  if (props.hospital) {
    emit('addDoctor', props.hospital.id);
  }
};

const handleEditDoctor = (doctor: VeterinaryDoctor) => {
  emit('editDoctor', doctor);
};

const handleDeleteDoctor = (doctorId: string) => {
  emit('deleteDoctor', doctorId);
};
</script>

<style scoped>
.veterinary-hospital-detail {
  @apply max-w-4xl;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .veterinary-hospital-detail {
    @apply px-0;
  }
}
</style>
