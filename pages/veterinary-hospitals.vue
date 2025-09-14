<template>
  <div class="veterinary-hospitals-page">
    <!-- ページヘッダー -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                病院管理
              </h1>
              <p class="mt-1 text-sm text-gray-600">
                通院する病院の情報を管理します
              </p>
            </div>

            <div class="mt-4 sm:mt-0">
              <button
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                @click="handleAddHospital"
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
                病院を追加
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
                  {{ formMode === 'create' ? '病院登録' : '病院編集' }}
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

              <VeterinaryHospitalForm
                :hospital="selectedHospital || undefined"
                :mode="formMode"
                @save="handleSaveHospital"
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
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-medium text-gray-900">
                  病院詳細
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

              <VeterinaryHospitalDetail
                :hospital="detailHospital"
                :loading="detailLoading"
                :error="detailError"
                @edit="handleEditFromDetail"
                @delete="handleDeleteFromDetail"
                @add-doctor="handleAddDoctorFromDetail"
                @edit-doctor="handleEditDoctorFromDetail"
                @delete-doctor="handleDeleteDoctorFromDetail"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 病院一覧 -->
      <VeterinaryHospitalList
        :hospitals="hospitals"
        :loading="loading"
        :error="error"
        :search-query="searchQuery"
        :show-doctor-count="true"
        @edit="handleEditHospital"
        @delete="handleDeleteHospital"
        @view="handleViewHospital"
        @search="handleSearch"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VeterinaryHospital, VeterinaryHospitalInput } from '~/types/veterinary-master';

// メタデータ
definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

// SEO
useHead({
  title: '病院管理 - 飼い猫健康管理',
  meta: [
    { name: 'description', content: '通院する病院の情報を管理します' },
  ],
});

// Composables
const {
  hospitals,
  loading,
  error,
  fetchHospitals,
  createHospital,
  updateHospital,
  deleteHospital,
  clearError,
} = useVeterinaryHospitals();

const {
  doctors: doctorsList,
  deleteDoctor: deleteDoctorById,
} = useVeterinaryDoctors();

// リアクティブデータ
const showForm = ref(false);
const showDetail = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const selectedHospital = ref<VeterinaryHospital | null>(null);
const searchQuery = ref('');
const detailHospital = ref<VeterinaryHospital | null>(null);
const detailLoading = ref(false);
const detailError = ref<string | null>(null);

// ユーティリティ関数
const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// イベントハンドラー
const handleAddHospital = () => {
  selectedHospital.value = null;
  formMode.value = 'create';
  showForm.value = true;
  clearError();
};

const handleEditHospital = (hospital: VeterinaryHospital) => {
  selectedHospital.value = hospital;
  formMode.value = 'edit';
  showForm.value = true;
  clearError();
};

const handleEditFromDetail = (hospital: VeterinaryHospital) => {
  selectedHospital.value = hospital;
  showDetail.value = false;
  formMode.value = 'edit';
  showForm.value = true;
  clearError();
};

const handleViewHospital = async (hospital: VeterinaryHospital) => {
  selectedHospital.value = hospital;
  showDetail.value = true;

  // 病院詳細データを取得（所属先生一覧を含む）
  await fetchHospitalDetail(hospital.id);
};

const fetchHospitalDetail = async (hospitalId: string) => {
  detailLoading.value = true;
  detailError.value = null;

  try {
    const data = await $fetch<VeterinaryHospital>(`/api/veterinary-hospitals/${hospitalId}`);
    detailHospital.value = data;
  }
  catch (error: any) {
    detailError.value = error.data?.message || '病院詳細の取得に失敗しました';
  }
  finally {
    detailLoading.value = false;
  }
};

const handleDeleteHospital = async (hospitalId: string) => {
  try {
    await deleteHospital(hospitalId);
  }
  catch (error) {
    // エラーはComposable内でハンドリング済み
  }
};

const handleDeleteFromDetail = async (hospitalId: string) => {
  try {
    await deleteHospital(hospitalId);
    showDetail.value = false;
    selectedHospital.value = null;
    detailHospital.value = null;
  }
  catch (error) {
    // エラーはComposable内でハンドリング済み
  }
};

const handleAddDoctorFromDetail = (hospitalId: string) => {
  // 先生管理ページに遷移（病院IDを指定）
  navigateTo(`/veterinary-doctors?hospitalId=${hospitalId}`);
};

const handleEditDoctorFromDetail = (doctor: any) => {
  // 先生管理ページに遷移（編集モード）
  navigateTo(`/veterinary-doctors?editId=${doctor.id}`);
};

const handleDeleteDoctorFromDetail = async (doctorId: string) => {
  try {
    await deleteDoctorById(doctorId);
    // 病院詳細を再取得して先生一覧を更新
    if (detailHospital.value) {
      await fetchHospitalDetail(detailHospital.value.id);
    }
  }
  catch (error) {
    // エラーはComposable内でハンドリング済み
  }
};

const handleSaveHospital = async (hospitalData: VeterinaryHospitalInput) => {
  try {
    if (formMode.value === 'create') {
      await createHospital(hospitalData);
    }
    else if (selectedHospital.value) {
      await updateHospital(selectedHospital.value.id, hospitalData);
    }

    handleCloseForm();
  }
  catch (error) {
    // エラーはComposable内でハンドリング済み
  }
};

const handleCloseForm = () => {
  showForm.value = false;
  selectedHospital.value = null;
  clearError();
};

const handleCloseDetail = () => {
  showDetail.value = false;
  selectedHospital.value = null;
  detailHospital.value = null;
  detailError.value = null;
};

const handleSearch = (query: string) => {
  searchQuery.value = query;
  fetchHospitals(query);
};

// 初期データ読み込み
onMounted(async () => {
  await fetchHospitals();
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
      handleAddHospital();
    }
  };

  document.addEventListener('keydown', handleKeydown);

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<style scoped>
.veterinary-hospitals-page {
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
  .veterinary-hospitals-page {
    @apply px-0;
  }
}
</style>
