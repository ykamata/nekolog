<template>
  <div class="veterinary-doctors-page">
    <!-- ページヘッダー -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                先生管理
              </h1>
              <p class="mt-1 text-sm text-gray-600">
                お世話になっている先生の情報を管理します
              </p>
            </div>

            <div class="mt-4 sm:mt-0">
              <button
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                @click="handleAddDoctor"
              >
                <svg
                  class="-ml-1 mr-2 h-5 w-5"
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
          </div>
        </div>
      </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- フォームモーダル -->
      <div
        v-if="showForm"
        class="fixed inset-0 z-50 overflow-y-auto"
      >
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <!-- オーバーレイ -->
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            @click="handleCloseForm"
          />

          <!-- モーダルコンテンツ -->
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">
                  {{ formMode === 'create' ? '先生登録' : '先生編集' }}
                </h3>
                <button
                  class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
                  @click="handleCloseForm"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <VeterinaryDoctorForm
                :doctor="selectedDoctor || undefined"
                :mode="formMode"
                :preselected-hospital-id="preselectedHospitalId"
                @save="handleSaveDoctor"
                @cancel="handleCloseForm"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 詳細モーダル -->
      <div
        v-if="showDetail"
        class="fixed inset-0 z-50 overflow-y-auto"
      >
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <!-- オーバーレイ -->
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            @click="handleCloseDetail"
          />

          <!-- モーダルコンテンツ -->
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-medium text-gray-900">
                  先生詳細
                </h3>
                <button
                  class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
                  @click="handleCloseDetail"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div
                v-if="selectedDoctor"
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
                        先生名
                      </dt>
                      <dd class="mt-1 text-sm text-gray-900">
                        {{ selectedDoctor.name }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-gray-500">
                        所属病院
                      </dt>
                      <dd class="mt-1 text-sm text-gray-900">
                        {{ selectedDoctor.hospital?.name || '未設定' }}
                      </dd>
                    </div>

                    <div v-if="selectedDoctor.specialty">
                      <dt class="text-sm font-medium text-gray-500">
                        専門分野
                      </dt>
                      <dd class="mt-1 text-sm text-gray-900">
                        {{ selectedDoctor.specialty }}
                      </dd>
                    </div>

                    <div>
                      <dt class="text-sm font-medium text-gray-500">
                        登録日
                      </dt>
                      <dd class="mt-1 text-sm text-gray-900">
                        {{ formatDate(selectedDoctor.createdAt) }}
                      </dd>
                    </div>
                  </dl>
                </div>

                <!-- 所属病院詳細 -->
                <div v-if="selectedDoctor.hospital">
                  <h4 class="text-base font-medium text-gray-900 mb-4">
                    所属病院詳細
                  </h4>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div v-if="selectedDoctor.hospital.address">
                        <dt class="text-sm font-medium text-gray-500">
                          住所
                        </dt>
                        <dd class="mt-1 text-sm text-gray-900">
                          {{ selectedDoctor.hospital.address }}
                        </dd>
                      </div>

                      <div v-if="selectedDoctor.hospital.phone">
                        <dt class="text-sm font-medium text-gray-500">
                          電話番号
                        </dt>
                        <dd class="mt-1 text-sm text-gray-900">
                          <a
                            :href="`tel:${selectedDoctor.hospital.phone}`"
                            class="text-blue-600 hover:text-blue-800"
                          >
                            {{ selectedDoctor.hospital.phone }}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <!-- メモ -->
                <div v-if="selectedDoctor.memo">
                  <h4 class="text-base font-medium text-gray-900 mb-2">
                    メモ
                  </h4>
                  <p class="text-sm text-gray-700 whitespace-pre-wrap">
                    {{ selectedDoctor.memo }}
                  </p>
                </div>

                <!-- アクションボタン -->
                <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <button
                    class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    @click="handleEditFromDetail"
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
                    @click="handleDeleteFromDetail"
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
          </div>
        </div>
      </div>

      <!-- 先生一覧 -->
      <VeterinaryDoctorList
        :doctors="doctors"
        :loading="loading"
        :error="error"
        :search-query="searchQuery"
        :hospital-filter="hospitalFilter"
        :show-hospital-name="true"
        @edit="handleEditDoctor"
        @delete="handleDeleteDoctor"
        @view="handleViewDoctor"
        @search="handleSearch"
        @hospital-filter="handleHospitalFilter"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VeterinaryDoctor, VeterinaryDoctorInput } from '~/types/veterinary-master';

// メタデータ
definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

// SEO
useHead({
  title: '先生管理 - 飼い猫健康管理',
  meta: [
    { name: 'description', content: 'お世話になっている先生の情報を管理します' },
  ],
});

// Composables
const {
  doctors,
  loading,
  error,
  fetchDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  clearError,
} = useVeterinaryDoctors();

// リアクティブデータ
const showForm = ref(false);
const showDetail = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const selectedDoctor = ref<VeterinaryDoctor | null>(null);
const searchQuery = ref('');
const hospitalFilter = ref('');
const preselectedHospitalId = ref<string | undefined>(undefined);

// ユーティリティ関数
const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// イベントハンドラー
const handleAddDoctor = () => {
  selectedDoctor.value = null;
  formMode.value = 'create';
  preselectedHospitalId.value = hospitalFilter.value || undefined;
  showForm.value = true;
  clearError();
};

const handleEditDoctor = (doctor: VeterinaryDoctor) => {
  selectedDoctor.value = doctor;
  formMode.value = 'edit';
  preselectedHospitalId.value = undefined;
  showForm.value = true;
  clearError();
};

const handleViewDoctor = (doctor: VeterinaryDoctor) => {
  selectedDoctor.value = doctor;
  showDetail.value = true;
};

const handleEditFromDetail = () => {
  showDetail.value = false;
  formMode.value = 'edit';
  preselectedHospitalId.value = undefined;
  showForm.value = true;
  clearError();
};

const handleDeleteDoctor = async (doctorId: string) => {
  try {
    await deleteDoctor(doctorId);
  }
  catch (error) {
    // エラーはComposable内でハンドリング済み
  }
};

const handleDeleteFromDetail = async () => {
  if (selectedDoctor.value) {
    try {
      await deleteDoctor(selectedDoctor.value.id);
      showDetail.value = false;
      selectedDoctor.value = null;
    }
    catch (error) {
      // エラーはComposable内でハンドリング済み
    }
  }
};

const handleSaveDoctor = async (doctorData: VeterinaryDoctorInput) => {
  try {
    if (formMode.value === 'create') {
      await createDoctor(doctorData);
    }
    else if (selectedDoctor.value) {
      await updateDoctor(selectedDoctor.value.id, doctorData);
    }

    handleCloseForm();
  }
  catch (error) {
    // エラーはComposable内でハンドリング済み
  }
};

const handleCloseForm = () => {
  showForm.value = false;
  selectedDoctor.value = null;
  preselectedHospitalId.value = undefined;
  clearError();
};

const handleCloseDetail = () => {
  showDetail.value = false;
  selectedDoctor.value = null;
};

const handleSearch = (query: string) => {
  searchQuery.value = query;
  fetchDoctors(hospitalFilter.value, query);
};

const handleHospitalFilter = (hospitalId: string) => {
  hospitalFilter.value = hospitalId;
  fetchDoctors(hospitalId, searchQuery.value);
};

// 初期データ読み込み
onMounted(async () => {
  await fetchDoctors();
});

// キーボードショートカット
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    // Escキーでモーダルを閉じる
    if (event.key === 'Escape') {
      if (showForm.value) {
        handleCloseForm();
      }
      else if (showDetail.value) {
        handleCloseDetail();
      }
    }

    // Ctrl+N で新規追加
    if (event.ctrlKey && event.key === 'n') {
      event.preventDefault();
      handleAddDoctor();
    }
  };

  document.addEventListener('keydown', handleKeydown);

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<style scoped>
.veterinary-doctors-page {
  min-height: 100vh;
  background-color: #f9fafb;
}

/* モーダルアニメーション */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .veterinary-doctors-page {
    @apply px-0;
  }
}
</style>
