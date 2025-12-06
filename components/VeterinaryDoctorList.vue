<template>
  <div class="veterinary-doctor-list">
    <!-- ヘッダー -->
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">
            先生一覧
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            登録済みの先生: {{ doctors.length }}件
          </p>
        </div>

        <!-- 検索・フィルタバー -->
        <div class="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          <!-- 病院フィルタ -->
          <div class="flex-1">
            <select
              v-model="hospitalFilter"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              @change="handleHospitalFilter"
            >
              <option value="">
                全ての病院
              </option>
              <option
                v-for="hospital in hospitals"
                :key="hospital.id"
                :value="hospital.id"
              >
                {{ hospital.name }}
              </option>
            </select>
          </div>

          <!-- 検索バー -->
          <div class="flex-1">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                v-model="searchQuery"
                type="text"
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="先生名・専門分野で検索..."
                @input="handleSearchInput"
              >
              <div
                v-if="searchQuery"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <button
                  class="text-gray-400 hover:text-gray-600 focus:outline-none"
                  @click="clearSearch"
                >
                  <svg
                    class="h-4 w-4"
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
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ローディング状態 -->
    <div
      v-if="loading"
      class="flex justify-center items-center py-12"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <span class="ml-2 text-gray-600">読み込み中...</span>
    </div>

    <!-- エラー状態 -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-md p-4"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg
            class="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
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

    <!-- 空の状態 -->
    <div
      v-else-if="filteredDoctors.length === 0"
      class="text-center py-12"
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
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ searchQuery || hospitalFilter ? '検索結果がありません' : '先生が登録されていません' }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ searchQuery || hospitalFilter ? '別の条件で検索してみてください' : '最初の先生を登録してください' }}
      </p>
    </div>

    <!-- 先生リスト -->
    <div
      v-else
      class="space-y-4"
    >
      <!-- デスクトップ表示 -->
      <div class="hidden md:block">
        <div class="bg-white shadow overflow-hidden sm:rounded-md">
          <ul class="divide-y divide-gray-200">
            <li
              v-for="doctor in paginatedDoctors"
              :key="doctor.id"
              class="hover:bg-gray-50"
            >
              <div class="px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-3">
                      <h3 class="text-lg font-medium text-gray-900 truncate">
                        {{ doctor.name }}
                      </h3>
                      <span
                        v-if="doctor.specialty"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {{ doctor.specialty }}
                      </span>
                    </div>

                    <div class="mt-2 space-y-1">
                      <p
                        v-if="showHospitalName && doctor.hospital"
                        class="text-sm text-gray-600 flex items-center"
                      >
                        <svg
                          class="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-2 4h2M9 15h2"
                          />
                        </svg>
                        {{ doctor.hospital.name }}
                      </p>

                      <p
                        v-else-if="showHospitalName && !doctor.hospital"
                        class="text-sm text-gray-500 flex items-center"
                      >
                        <svg
                          class="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-2 4h2M9 15h2"
                          />
                        </svg>
                        所属病院未設定
                      </p>

                      <p
                        v-if="doctor.memo"
                        class="text-sm text-gray-600 line-clamp-2"
                      >
                        {{ doctor.memo }}
                      </p>
                    </div>
                  </div>

                  <!-- アクションボタン -->
                  <div class="flex items-center space-x-2 ml-4">
                    <button
                      class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      @click="handleView(doctor)"
                    >
                      詳細
                    </button>
                    <button
                      class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      @click="handleEdit(doctor)"
                    >
                      編集
                    </button>
                    <button
                      class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      @click="handleDelete(doctor)"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- モバイル表示 -->
      <div class="md:hidden space-y-3">
        <div
          v-for="doctor in paginatedDoctors"
          :key="doctor.id"
          class="bg-white rounded-lg shadow p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-medium text-gray-900 truncate">
                {{ doctor.name }}
              </h3>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-if="doctor.specialty"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                >
                  {{ doctor.specialty }}
                </span>
              </div>
            </div>

            <!-- モバイル用アクションメニュー -->
            <div class="relative ml-2">
              <button
                class="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="toggleMobileMenu(doctor.id)"
              >
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              <div
                v-if="activeMobileMenu === doctor.id"
                class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border"
              >
                <div class="py-1">
                  <button
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    @click="handleView(doctor); activeMobileMenu = null"
                  >
                    詳細表示
                  </button>
                  <button
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    @click="handleEdit(doctor); activeMobileMenu = null"
                  >
                    編集
                  </button>
                  <button
                    class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    @click="handleDelete(doctor); activeMobileMenu = null"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 space-y-2">
            <p
              v-if="showHospitalName && doctor.hospital"
              class="text-sm text-gray-600 flex items-start"
            >
              <svg
                class="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-2 4h2M9 15h2"
                />
              </svg>
              {{ doctor.hospital.name }}
            </p>

            <p
              v-else-if="showHospitalName && !doctor.hospital"
              class="text-sm text-gray-500 flex items-center"
            >
              <svg
                class="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-2 4h2M9 15h2"
                />
              </svg>
              所属病院未設定
            </p>

            <p
              v-if="doctor.memo"
              class="text-sm text-gray-600 line-clamp-3"
            >
              {{ doctor.memo }}
            </p>
          </div>
        </div>
      </div>

      <!-- ページネーション -->
      <div
        v-if="showPagination"
        class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6"
      >
        <div class="flex flex-1 justify-between sm:hidden">
          <button
            :disabled="!hasPrevPage"
            class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="prevPage"
          >
            前へ
          </button>
          <button
            :disabled="!hasNextPage"
            class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="nextPage"
          >
            次へ
          </button>
        </div>

        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              <span class="font-medium">{{ startItem }}</span>
              から
              <span class="font-medium">{{ Math.min(endItem, filteredDoctors.length) }}</span>
              件目を表示（全
              <span class="font-medium">{{ filteredDoctors.length }}</span>
              件中）
            </p>
          </div>
          <div>
            <nav
              class="isolate inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <button
                :disabled="!hasPrevPage"
                class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="prevPage"
              >
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>

              <button
                v-for="page in visiblePages"
                :key="page"
                :class="[
                  'relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0',
                  page === currentPage
                    ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0',
                ]"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>

              <button
                :disabled="!hasNextPage"
                class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="nextPage"
              >
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- 削除確認ダイアログ -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      :title="'先生を削除'"
      :message="`「${doctorToDelete?.name}」を削除してもよろしいですか？この操作は取り消せません。`"
      :confirm-text="'削除'"
      :cancel-text="'キャンセル'"
      :is-destructive="true"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { VeterinaryDoctor, VeterinaryHospital } from '~/types/veterinary-master';
import { useVeterinaryDoctors } from '~/composables/useVeterinaryDoctors';
import { useSearchDebounce } from '~/composables/useDebounce';
import { usePagination } from '~/composables/usePagination';

// Props
interface Props {
  doctors: VeterinaryDoctor[];
  loading?: boolean;
  error?: string | null;
  searchQuery?: string;
  hospitalFilter?: number;
  showHospitalName?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  searchQuery: '',
  showHospitalName: true,
});

// Emits
interface Emits {
  edit: [doctor: VeterinaryDoctor];
  delete: [doctorId: number];
  search: [query: string];
  hospitalFilter: [hospitalId: number | undefined];
  view: [doctor: VeterinaryDoctor];
}

const emit = defineEmits<Emits>();

// 病院一覧を取得
const { hospitals, fetchHospitals } = useVeterinaryHospitals();

// リアクティブデータ
const searchQuery = ref(props.searchQuery);
const hospitalFilter = ref<number | ''>(props.hospitalFilter ?? '');
const showDeleteConfirmation = ref(false);
const doctorToDelete = ref<VeterinaryDoctor | null>(null);
const activeMobileMenu = ref<number | null>(null);

// ページネーション機能
const {
  currentPage,
  itemsPerPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  startItem,
  endItem,
  visiblePages,
  goToPage,
  nextPage,
  prevPage,
} = usePagination({
  initialPage: 1,
  initialLimit: 10,
  maxLimit: 50,
  minLimit: 5,
});

// 計算プロパティ
const filteredDoctors = computed(() => {
  let filtered = props.doctors;

  // 病院フィルタ
  if (hospitalFilter.value) {
    filtered = filtered.filter(doctor => doctor.hospitalId === hospitalFilter.value);
  }

  // 検索フィルタ
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(doctor =>
      doctor.name.toLowerCase().includes(query)
      || doctor.specialty?.toLowerCase().includes(query)
      || doctor.hospital?.name.toLowerCase().includes(query),
    );
  }

  return filtered;
});

const paginatedDoctors = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredDoctors.value.slice(start, end);
});

const showPagination = computed(() => filteredDoctors.value.length > itemsPerPage.value);

// デバウンス検索の設定
const { debouncedSearch, isSearching } = useSearchDebounce(
  props.searchQuery,
  300,
  {
    minLength: 0,
    onSearch: (query: string) => {
      currentPage.value = 1;
      emit('search', query);
    },
  },
);

// イベントハンドラー
const handleSearchInput = () => {
  debouncedSearch(searchQuery.value);
};

const handleHospitalFilter = () => {
  currentPage.value = 1;
  const value =
    hospitalFilter.value === '' || hospitalFilter.value === null
      ? undefined
      : Number(hospitalFilter.value);
  hospitalFilter.value = value ?? '';
  emit('hospitalFilter', value);
};

const clearSearch = () => {
  searchQuery.value = '';
  currentPage.value = 1;
  emit('search', '');
};

const handleEdit = (doctor: VeterinaryDoctor) => {
  emit('edit', doctor);
};

const handleView = (doctor: VeterinaryDoctor) => {
  emit('view', doctor);
};

const handleDelete = async (doctor: VeterinaryDoctor) => {
  // 関連データの存在チェック（オプション）
  try {
    const { checkDoctorRelatedData } = useVeterinaryDoctors();
    const relatedData = await checkDoctorRelatedData(doctor.id);
    const hasRelatedData = relatedData.hasVisits || relatedData.hasAppointments;

    // 削除警告を表示
    if (hasRelatedData) {
      console.warn('Doctor has related data:', relatedData);
    }
  }
  catch (error) {
    // 関連データチェックに失敗した場合でも削除確認は表示
    console.warn('Failed to check related data:', error);
  }

  doctorToDelete.value = doctor;
  showDeleteConfirmation.value = true;
};

const confirmDelete = () => {
  if (doctorToDelete.value) {
    emit('delete', doctorToDelete.value.id);
  }
  cancelDelete();
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  doctorToDelete.value = null;
};

const toggleMobileMenu = (doctorId: number) => {
  activeMobileMenu.value = activeMobileMenu.value === doctorId ? null : doctorId;
};

// ページネーション機能は usePagination から提供される

// ウォッチャー
watch(() => props.searchQuery, (newQuery) => {
  searchQuery.value = newQuery;
});

watch(() => props.hospitalFilter, (newFilter) => {
  hospitalFilter.value = newFilter ?? '';
});

// filteredDoctorsの変更を監視してページネーションを調整
watch(() => filteredDoctors.value.length, (newLength) => {
  const newTotalPages = Math.ceil(newLength / itemsPerPage.value);
  if (currentPage.value > newTotalPages && newTotalPages > 0) {
    goToPage(newTotalPages);
  }
});

// 外部クリックでモバイルメニューを閉じる
onMounted(async () => {
  // 病院一覧を取得
  await fetchHospitals();

  document.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (!target.closest('.relative')) {
      activeMobileMenu.value = null;
    }
  });
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .veterinary-doctor-list {
    @apply px-4;
  }
}
</style>
