<script setup lang="ts">
import ConfirmationDialog from './ConfirmationDialog.vue';
import type {
  VeterinaryVisitWithRelations,
  VeterinaryHospital,
  VeterinaryDoctor,
} from '~/types/veterinary-visit';
import type { Cat } from '~/types/cat-meal';

interface Props {
  visits: VeterinaryVisitWithRelations[];
  loading?: boolean;
  showActions?: boolean;
  cats?: Cat[];
}

interface Emits {
  (e: 'select' | 'edit' | 'delete' | 'view', visit: VeterinaryVisitWithRelations): void;
  (e: 'add'): void;
  (e: 'catFilterChanged', catId: number | undefined): void;
  (e: 'bloodTestFilterChanged', hasBloodTest: boolean | string): void;
  (e: 'search', query: string): void;
  (e: 'sortChanged', field: string, order: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
  cats: () => [],
});

const emit = defineEmits<Emits>();

// State for confirmation dialog
const showDeleteConfirmation = ref(false);
const visitToDelete = ref<VeterinaryVisitWithRelations | null>(null);

// State for filtering and sorting
const searchQuery = ref('');
const selectedCatId = ref<number | undefined>(undefined);
const selectedHospitalId = ref<number | undefined>(undefined);
const hasBloodTestFilter = ref<boolean | ''>('');
const sortBy = ref<'visitDate' | 'hospitalName' | 'cost' | 'createdAt'>('visitDate');
const sortOrder = ref<'asc' | 'desc'>('desc');

// Pagination state
const currentPage = ref(1);
const itemsPerPage = ref(10); // 通常の値に戻す

// レスポンシブ対応
const { screenSize, getResponsiveClasses } = useResponsive();

// 後方互換性のためのcomputed
const isMobile = computed(() => screenSize.value === 'mobile');
const isTablet = computed(() => screenSize.value === 'tablet');

// Computed properties
const catOptions = computed(() => {
  if (!props.cats || !Array.isArray(props.cats)) {
    return [{ value: '', label: 'すべての猫' }];
  }

  return [
    { value: '', label: 'すべての猫' },
    ...props.cats
      .filter(cat => cat && cat.id && cat.name) // Filter out invalid cats
      .map(cat => ({ value: cat.id, label: cat.name })),
  ];
});

const hospitalOptions = computed(() => {
  if (!props.visits || !Array.isArray(props.visits)) {
    return [{ value: '', label: 'すべての病院' }];
  }

  const hospitals = new Map<number, VeterinaryHospital>();

  props.visits.forEach((visit) => {
    if (visit?.hospital?.id && visit.hospital.name) {
      hospitals.set(visit.hospital.id, visit.hospital);
    }
  });

  return [
    { value: 0, label: 'すべての病院' },
    ...Array.from(hospitals.values())
      .filter(hospital => hospital && hospital.id && hospital.name)
      .map(hospital => ({
        value: hospital.id,
        label: hospital.name,
      })),
  ];
});

const bloodTestOptions = [
  { value: '', label: 'すべて' },
  { value: true, label: '血液検査あり' },
  { value: false, label: '血液検査なし' },
];

const filteredAndSortedVisits = computed(() => {
  // Input validation
  if (!props.visits || !Array.isArray(props.visits)) {
    return [];
  }

  let filtered = [...props.visits]; // Create a copy to avoid mutating props

  // Filter by search query with null safety
  if (searchQuery.value && typeof searchQuery.value === 'string') {
    const query = searchQuery.value.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter((visit) => {
        if (!visit) return false;

        try {
          const hospitalName = visit.hospital?.name?.toLowerCase() || '';
          const doctorName = visit.doctor?.name?.toLowerCase() || '';
          const notes = visit.notes?.toLowerCase() || '';
          const treatmentNames = visit.treatments?.map(t => t?.treatment?.name?.toLowerCase() || '').join(' ') || '';

          return hospitalName.includes(query)
            || doctorName.includes(query)
            || notes.includes(query)
            || treatmentNames.includes(query);
        }
        catch (error) {
          console.warn('Error filtering visit:', error);
          return false;
        }
      });
    }
  }

  // Filter by cat with validation
  if (selectedCatId.value && typeof selectedCatId.value === 'number') {
    filtered = filtered.filter(visit => visit?.catId === selectedCatId.value);
  }

  // Filter by hospital with validation
  if (selectedHospitalId.value && typeof selectedHospitalId.value === 'number') {
    filtered = filtered.filter(visit => visit?.hospitalId === selectedHospitalId.value);
  }

  // Filter by blood test with validation
  if (hasBloodTestFilter.value !== '' && hasBloodTestFilter.value !== null && hasBloodTestFilter.value !== undefined) {
    const filterValue = hasBloodTestFilter.value === true || String(hasBloodTestFilter.value) === 'true';
    filtered = filtered.filter(visit => visit?.hasBloodTest === filterValue);
  }

  // Sort with error handling
  try {
    filtered.sort((a, b) => {
      if (!a || !b) return 0;

      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortBy.value) {
        case 'visitDate':
          aValue = new Date(a.visitDate || 0);
          bValue = new Date(b.visitDate || 0);
          break;
        case 'hospitalName':
          aValue = a.hospital?.name || '';
          bValue = b.hospital?.name || '';
          break;
        case 'cost':
          aValue = a.cost || 0;
          bValue = b.cost || 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        default:
          aValue = new Date(a.visitDate || 0);
          bValue = new Date(b.visitDate || 0);
      }

      if (aValue < bValue) {
        return sortOrder.value === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder.value === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  catch (error) {
    console.warn('Error sorting visits:', error);
  }

  return filtered;
});

const paginatedVisits = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredAndSortedVisits.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredAndSortedVisits.value.length / itemsPerPage.value);
});

const showPagination = computed(() => {
  return filteredAndSortedVisits.value.length > itemsPerPage.value;
});

// Methods
const handleSelectVisit = (visit: VeterinaryVisitWithRelations) => {
  try {
    if (!visit || !visit.id) {
      console.warn('Invalid visit data for select:', visit);
      return;
    }
    // 行クリックは編集ではなく参照用の詳細表示
    emit('view', visit);
  }
  catch (error) {
    console.error('Error handling visit selection:', error);
  }
};

const handleEditVisit = (visit: VeterinaryVisitWithRelations) => {
  try {
    if (!visit || !visit.id) {
      console.warn('Invalid visit data for edit:', visit);
      return;
    }
    emit('edit', visit);
  }
  catch (error) {
    console.error('Error handling visit edit:', error);
  }
};

const handleViewVisit = (visit: VeterinaryVisitWithRelations) => {
  try {
    if (!visit || !visit.id) {
      console.warn('Invalid visit data for view:', visit);
      return;
    }
    emit('view', visit);
  }
  catch (error) {
    console.error('Error handling visit view:', error);
  }
};

const handleDeleteVisit = (visit: VeterinaryVisitWithRelations) => {
  try {
    if (!visit || !visit.id) {
      console.warn('Invalid visit data for delete:', visit);
      return;
    }
    visitToDelete.value = visit;
    showDeleteConfirmation.value = true;
  }
  catch (error) {
    console.error('Error handling visit delete:', error);
  }
};

const handleCatFilterChange = () => {
  try {
    const value = selectedCatId.value;
    if (typeof value === 'number' || value === undefined) {
      emit('catFilterChanged', value);
    }
    else {
      console.warn('Invalid cat filter value:', value);
      emit('catFilterChanged', undefined);
    }
  }
  catch (error) {
    console.warn('Error handling cat filter change:', error);
    emit('catFilterChanged', undefined);
  }
};

const handleBloodTestFilterChange = () => {
  try {
    const value = hasBloodTestFilter.value;

    // Convert string values to boolean for proper filtering
    if (value === true || String(value) === 'true') {
      emit('bloodTestFilterChanged', true);
    }
    else if (value === false || String(value) === 'false') {
      emit('bloodTestFilterChanged', false);
    }
    else {
      emit('bloodTestFilterChanged', value);
    }
  }
  catch (error) {
    console.warn('Error handling blood test filter change:', error);
    emit('bloodTestFilterChanged', '');
  }
};

const confirmDelete = () => {
  if (visitToDelete.value) {
    emit('delete', visitToDelete.value);
    showDeleteConfirmation.value = false;
    visitToDelete.value = null;
  }
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  visitToDelete.value = null;
};

const handleAddVisit = () => {
  emit('add');
};

const formatDate = (date: Date | string): string => {
  try {
    if (!date) return '不明';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '不明';

    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  catch (error) {
    console.warn('Error formatting date:', error);
    return '不明';
  }
};

const formatDateTime = (date: Date | string): string => {
  try {
    if (!date) return '不明';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '不明';

    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  catch (error) {
    console.warn('Error formatting datetime:', error);
    return '不明';
  }
};

const formatCurrency = (amount: number): string => {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '¥0';
    }

    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  }
  catch (error) {
    console.warn('Error formatting currency:', error);
    return '¥0';
  }
};

const getCatName = (catId: number): string => {
  // Input validation
  if (!catId || typeof catId !== 'number') {
    return '不明';
  }

  // First try to find in props.cats with null safety
  if (props.cats && Array.isArray(props.cats)) {
    const cat = props.cats.find(c => c?.id === catId);
    if (cat?.name && typeof cat.name === 'string') {
      return cat.name;
    }
  }

  // Fallback to visit.cat if available with null safety
  if (props.visits && Array.isArray(props.visits)) {
    const visit = props.visits.find(v => v?.catId === catId);
    if (visit?.cat?.name && typeof visit.cat.name === 'string') {
      return visit.cat.name;
    }
  }

  return '不明';
};

const getCatAvatar = (catId: number): string | null => {
  if (props.cats && Array.isArray(props.cats)) {
    const cat = props.cats.find(c => c?.id === catId);
    if (cat?.photoUrl) return cat.photoUrl;
  }
  if (props.visits && Array.isArray(props.visits)) {
    const visit = props.visits.find(v => v?.catId === catId);
    if (visit?.cat?.photoUrl) return visit.cat.photoUrl;
  }
  return null;
};

const toggleSort = (field: typeof sortBy.value) => {
  // 無限再帰を避けるため、状態変更を最小限にする
  let newOrder: 'asc' | 'desc';

  if (sortBy.value === field) {
    // 同じフィールドの場合は順序を切り替え
    newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc';
  }
  else {
    // 新しいフィールドの場合は常にdescから開始
    newOrder = 'desc';
  }

  // バッチで状態を更新して再レンダリングを最小化
  nextTick(() => {
    if (sortBy.value !== field) {
      sortBy.value = field;
    }
    if (sortOrder.value !== newOrder) {
      sortOrder.value = newOrder;
    }
    emit('sortChanged', field, newOrder);
  });
};

const handleSearchInput = () => {
  try {
    const value = searchQuery.value;
    if (typeof value === 'string' || value === null || value === undefined) {
      emit('search', value || '');
    }
    else {
      console.warn('Invalid search query value:', value);
      emit('search', '');
    }
  }
  catch (error) {
    console.warn('Error handling search input:', error);
    emit('search', '');
  }
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedCatId.value = undefined;
  selectedHospitalId.value = undefined;
  hasBloodTestFilter.value = '';
  currentPage.value = 1;
};

const goToPage = (page: number) => {
  currentPage.value = page;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};
</script>

<template>
  <div class="veterinary-visit-list">
    <!-- Header -->
    <div class="list-header">
      <h2 class="list-title">
        通院記録一覧
      </h2>
      <button
        v-if="showActions"
        class="btn btn--primary"
        @click="handleAddVisit"
      >
        <svg
          class="btn-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        新規記録
      </button>
    </div>

    <!-- Filters -->
    <div class="list-filters">
      <div class="filter-row">
        <div class="filter-group">
          <input
            v-model="searchQuery"
            type="text"
            class="filter-input"
            data-testid="search-input"
            placeholder="病院名、先生名、メモ、処方内容で検索..."
            @input="handleSearchInput"
          >
        </div>

        <div class="filter-group">
          <select
            v-model="selectedCatId"
            class="filter-select"
            data-testid="cat-filter"
            @change="handleCatFilterChange"
          >
            <option
              v-for="option in catOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <select
            v-model="selectedHospitalId"
            class="filter-select"
          >
            <option
              v-for="option in hospitalOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <select
            v-model="hasBloodTestFilter"
            class="filter-select"
            data-testid="blood-test-filter"
            @change="handleBloodTestFilterChange"
          >
            <option
              v-for="option in bloodTestOptions"
              :key="String(option.value)"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <button
          class="btn btn--secondary btn--small"
          @click="clearFilters"
        >
          クリア
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-container"
    >
      <div
        class="loading-spinner"
        data-testid="loading-spinner"
      />
      <p class="loading-text">
        読み込み中...
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredAndSortedVisits.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 class="empty-title">
        {{ searchQuery || selectedCatId || selectedHospitalId || hasBloodTestFilter !== ''
          ? '検索結果がありません'
          : '通院記録がありません' }}
      </h3>
      <p
        class="empty-description"
        :data-testid="searchQuery || selectedCatId || selectedHospitalId || hasBloodTestFilter !== '' ? 'no-search-results' : 'empty-state'"
      >
        {{ searchQuery || selectedCatId || selectedHospitalId || hasBloodTestFilter !== ''
          ? '検索条件に一致する記録が見つかりませんでした'
          : '通院記録がありません' }}
      </p>
      <button
        v-if="showActions && !searchQuery && !selectedCatId && !selectedHospitalId && hasBloodTestFilter === ''"
        class="btn btn--primary"
        @click="handleAddVisit"
      >
        最初の記録を追加
      </button>
    </div>

    <!-- Visit List -->
    <div
      v-else
      :class="getResponsiveClasses('visit-list')"
      data-testid="visit-list"
      role="list"
    >
      <!-- Table Header -->
      <div class="table-header">
        <button
          class="header-cell header-cell--sortable"
          :class="{ 'header-cell--active': sortBy === 'visitDate' }"
          data-testid="sort-date-button"
          @click="toggleSort('visitDate')"
        >
          診察日時
          <svg
            v-if="sortBy === 'visitDate'"
            class="sort-icon"
            :class="{ 'sort-icon--desc': sortOrder === 'desc' }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        <div class="header-cell">
          猫
        </div>

        <button
          class="header-cell header-cell--sortable"
          :class="{ 'header-cell--active': sortBy === 'hospitalName' }"
          @click="toggleSort('hospitalName')"
        >
          病院・先生
          <svg
            v-if="sortBy === 'hospitalName'"
            class="sort-icon"
            :class="{ 'sort-icon--desc': sortOrder === 'desc' }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        <div class="header-cell">
          処方内容
        </div>

        <button
          class="header-cell header-cell--sortable"
          :class="{ 'header-cell--active': sortBy === 'cost' }"
          data-testid="sort-cost-button"
          @click="toggleSort('cost')"
        >
          費用
          <svg
            v-if="sortBy === 'cost'"
            class="sort-icon"
            :class="{ 'sort-icon--desc': sortOrder === 'desc' }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        <div class="header-cell">
          詳細
        </div>

        <div
          v-if="showActions"
          class="header-cell header-cell--actions"
        >
          操作
        </div>
      </div>

      <!-- Table Body -->
      <div class="table-body">
        <div
          v-for="visit in paginatedVisits"
          :key="visit.id"
          :class="getResponsiveClasses('table-row')"
          :data-testid="`visit-item-${visit.id}`"
          role="listitem"
          :aria-label="`${getCatName(visit.catId)}の通院記録 ${formatDate(visit.visitDate)}`"
          @click="handleSelectVisit(visit)"
        >
          <div class="table-cell">
            <div class="visit-date">
              <span class="visit-date__day">{{ formatDate(visit.visitDate) }}</span>
            </div>
          </div>

          <div class="table-cell">
            <div class="cat-info">
              <div
                class="cat-avatar"
                :aria-label="getCatName(visit.catId)"
              >
                <img
                  v-if="getCatAvatar(visit.catId)"
                  :src="getCatAvatar(visit.catId)!"
                  :alt="getCatName(visit.catId)"
                  loading="lazy"
                >
                <span v-else>{{ getCatName(visit.catId).slice(0, 1) }}</span>
              </div>
            </div>
          </div>

          <div class="table-cell">
            <div class="hospital-info">
              <div class="hospital-name">
                {{ visit.hospital?.name || '病院未登録' }}
              </div>
              <div
                v-if="visit.doctor"
                class="doctor-name"
              >
                {{ visit.doctor.name }}
              </div>
            </div>
          </div>

          <div class="table-cell">
            <div class="treatments">
              <span
                v-for="treatment in visit.treatments.slice(0, 3)"
                :key="treatment.id"
                class="pill pill--treatment"
                :data-testid="`treatment-tag-${treatment.id}`"
              >
                {{ treatment.treatment?.name || 'Unknown Treatment' }}
              </span>
              <span
                v-if="visit.treatments.length > 3"
                class="pill pill--muted"
              >
                +{{ visit.treatments.length - 3 }}
              </span>
            </div>
          </div>

          <div class="table-cell">
            <div class="cost">
              {{ (visit.cost || 0).toLocaleString() }}円
            </div>
          </div>

          <div class="table-cell">
            <div class="visit-details">
              <span
                v-if="visit.hasBloodTest"
                class="icon-chip icon-chip--alert"
                data-testid="blood-test-badge"
                aria-label="血液検査実施"
                title="血液検査あり"
              >
                🩸
              </span>
              <span
                v-if="visit.notes"
                class="note-chip"
                :title="visit.notes"
              >
                📝 {{ visit.notes }}
              </span>
            </div>

            <!-- Mobile collapsed details -->
            <div
              v-if="isMobile"
              class="collapsed-details"
              data-testid="collapsed-details"
            >
              <div class="collapsed-summary">
                詳細を表示
              </div>
            </div>
          </div>

          <div
            v-if="showActions"
            class="table-cell table-cell--actions"
            @click.stop
          >
            <button
              class="action-btn action-btn--edit"
              :data-testid="`edit-button-${visit.id}`"
              aria-label="編集"
              tabindex="0"
              @click="handleEditVisit(visit)"
              @keydown.enter="handleEditVisit(visit)"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              class="action-btn action-btn--delete"
              :data-testid="`delete-button-${visit.id}`"
              aria-label="削除"
              tabindex="0"
              @click="handleDeleteVisit(visit)"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <button
              class="action-btn action-btn--view"
              :data-testid="`view-button-${visit.id}`"
              aria-label="詳細表示"
              tabindex="0"
              @click="handleViewVisit(visit)"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="showPagination"
        class="pagination"
        data-testid="pagination"
      >
        <button
          class="pagination-btn"
          :disabled="currentPage === 1"
          data-testid="prev-page-button"
          @click="prevPage"
        >
          前へ
        </button>

        <div class="pagination-info">
          {{ currentPage }} / {{ totalPages }}
        </div>

        <button
          class="pagination-btn"
          :disabled="currentPage === totalPages"
          data-testid="next-page-button"
          @click="nextPage"
        >
          次へ
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDeleteConfirmation"
      title="通院記録を削除"
      :message="`「${visitToDelete?.hospital.name}」での記録を削除しますか？この操作は取り消せません。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.veterinary-visit-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .list-header {
    padding: 2rem;
  }

  .list-title {
    font-size: 1.5rem;
  }

  .btn {
    padding: 1rem 2rem;
    font-size: 1rem;
  }

  .btn-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .list-filters {
    padding: 1.5rem 2rem;
  }

  .filter-row {
    gap: 1.5rem;
  }

  .filter-input,
  .filter-select {
    padding: 0.875rem 1rem;
    font-size: 1rem;
  }

  .btn--small {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .table-header {
    padding: 1.5rem 2rem;
    font-size: 1rem;
  }

  .table-row {
    padding: 1.5rem 2rem;
  }

  .table-cell {
    min-height: 3rem;
  }

  .visit-date {
    font-size: 1rem;
  }

  .cat-info {
    font-size: 1rem;
  }

  .hospital-name {
    font-size: 1rem;
  }

  .doctor-name {
    font-size: 0.9rem;
  }

  .pill {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

  .cost {
    font-size: 1rem;
  }

  .action-btn {
    width: 2.5rem;
    height: 2.5rem;
  }

  .action-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .loading-container,
  .empty-state {
    padding: 4rem 2rem;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
  }

  .empty-icon {
    width: 4rem;
    height: 4rem;
  }

  .empty-title {
    font-size: 1.5rem;
  }

  .empty-description {
    font-size: 1.1rem;
    max-width: 500px;
  }
}

/* Large desktop optimizations */
@media (min-width: 1440px) {
  .list-header {
    padding: 2.5rem;
  }

  .list-title {
    font-size: 1.75rem;
  }

  .list-filters {
    padding: 2rem 2.5rem;
  }

  .filter-row {
    gap: 2rem;
  }

  .table-header {
    padding: 2rem 2.5rem;
    grid-template-columns: 1.4fr 0.9fr 1.5fr 1.8fr 0.9fr 1.1fr 120px;
    gap: 1.5rem;
  }

  .table-row {
    padding: 2rem 2.5rem;
    grid-template-columns: 1.4fr 0.9fr 1.5fr 1.8fr 0.9fr 1.1fr 120px;
    gap: 1.5rem;
  }

  .table-body {
    max-height: 700px;
  }

  .action-btn {
    width: 3rem;
    height: 3rem;
  }

  .action-btn svg {
    width: 1.5rem;
    height: 1.5rem;
  }
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.list-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.list-filters {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.filter-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-input,
.filter-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #666;
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  color: #ccc;
  margin-bottom: 1rem;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #666;
}

.empty-description {
  margin: 0 0 1.5rem 0;
  color: #888;
  max-width: 400px;
}

.visit-list {
  overflow-x: auto;
}

.table-header {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr 1.5fr 1.8fr 0.9fr 1.1fr 100px;
  gap: 1.25rem;
  padding: 1.05rem 1.4rem;
  background-color: #f8f9fa;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
  color: #4b5563;
  font-size: 0.78rem;
}

.header-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  font-weight: 600;
  color: #4b5563;
  font-size: 0.78rem;
  text-align: left;
  cursor: default;
}

.header-cell--sortable {
  cursor: pointer;
  transition: color 0.2s;
}

.header-cell--sortable:hover {
  color: #4caf50;
}

.header-cell--active {
  color: #4caf50;
}

.header-cell--actions {
  justify-content: center;
}

.sort-icon {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s;
}

.sort-icon--desc {
  transform: rotate(180deg);
}

.table-body {
  max-height: 600px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr 1.5fr 1.8fr 0.9fr 1.1fr 100px;
  gap: 1.25rem;
  padding: 1.1rem 1.4rem;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.table-row:hover {
  background-color: #f8fff8;
  border-color: #4caf50;
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
}

.table-cell--actions {
  justify-content: center;
  gap: 0.5rem;
}

.visit-date {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
}

.visit-date__day {
  font-size: 0.9rem;
  white-space: nowrap;
}

.visit-date__meta {
  font-size: 0.7rem;
  color: #9ca3af;
  white-space: nowrap;
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.hospital-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hospital-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doctor-name {
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.treatments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cost {
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
  white-space: nowrap;
}

.visit-details {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.note-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem;
  background: #f3f4f6;
  color: #374151;
  border-radius: 999px;
  font-size: 0.8rem;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.74rem;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  background: #f8fafc;
  color: #1f2937;
}

.pill--cat {
  background: #ecfdf3;
  color: #166534;
  border-color: #bbf7d0;
}

.pill--treatment {
  background: #eef2ff;
  color: #4338ca;
  border-color: #c7d2fe;
}

.pill--muted {
  background: #f3f4f6;
  color: #6b7280;
  border-color: #e5e7eb;
}

.pill--alert {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecdd3;
}

.cat-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  overflow: hidden;
  background: #ecfdf3;
  color: #166534;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  border: 1px solid #bbf7d0;
}

.cat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  font-size: 1.1rem;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecdd3;
}

.icon-chip--alert {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecdd3;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn svg {
  width: 1rem;
  height: 1rem;
}

.action-btn--edit {
  background-color: #e3f2fd;
  color: #1976d2;
}

.action-btn--edit:hover {
  background-color: #bbdefb;
}

.action-btn--delete {
  background-color: #ffebee;
  color: #c62828;
}

.action-btn--delete:hover {
  background-color: #ffcdd2;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn--primary {
  background-color: #4caf50;
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: #388e3c;
}

.btn--secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn--secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.btn--small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #4caf50;
  color: white;
  border-color: #4caf50;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-weight: 500;
  color: #666;
}

.collapsed-details {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #666;
  cursor: pointer;
}

.collapsed-summary {
  text-align: center;
}

/* Tablet responsive */
@media (max-width: 1024px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr 0.8fr 1.2fr 1.2fr 0.8fr 0.8fr 80px;
    gap: 0.5rem;
  }

  .list-header,
  .list-filters,
  .table-row {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .filter-input,
  .filter-select {
    font-size: 0.9rem;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .veterinary-visit-list {
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
  }

  .list-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .list-title {
    font-size: 1.1rem;
    text-align: center;
  }

  .btn {
    width: 100%;
    justify-content: center;
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
    min-height: 48px;
    border-radius: 8px;
  }

  .btn-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* Mobile filters */
  .list-filters {
    padding: 1rem;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filter-group {
    min-width: auto;
    width: 100%;
  }

  .filter-input,
  .filter-select {
    padding: 0.875rem 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .filter-input:focus,
  .filter-select:focus {
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  }

  .btn--small {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
    min-height: 44px;
  }

  /* Mobile table - card layout */
  .table-header {
    display: none;
  }

  .table-body {
    max-height: none;
    padding: 0 1rem 1rem 1rem;
  }

  .table-row {
    display: block;
    padding: 1.25rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #e0e0e0;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .table-row:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .table-row:active {
    transform: scale(0.98);
  }

  .table-row:last-child {
    margin-bottom: 0;
  }

  .table-cell {
    display: block;
    min-height: auto;
    margin-bottom: 0.75rem;
    padding: 0;
  }

  .table-cell:last-child {
    margin-bottom: 0;
  }

  .table-cell--actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 2px solid #e0e0e0;
    gap: 0.75rem;
  }

  /* Mobile card content styling */
  .visit-date {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .visit-date::before {
    content: '📅 ';
    margin-right: 0.5rem;
  }

  .cat-info {
    font-size: 1rem;
    font-weight: 600;
    color: #4caf50;
    display: flex;
    align-items: center;
  }

  .cat-info::before {
    content: '🐱 ';
    margin-right: 0.5rem;
  }

  .hospital-info {
    gap: 0.5rem;
  }

  .hospital-name {
    font-size: 1rem;
    font-weight: 500;
    color: #333;
    display: flex;
    align-items: center;
  }

  .hospital-name::before {
    content: '🏥 ';
    margin-right: 0.5rem;
  }

  .doctor-name {
    font-size: 0.9rem;
    color: #666;
    margin-left: 1.5rem;
    display: flex;
    align-items: center;
  }

  .doctor-name::before {
    content: '👨‍⚕️ ';
    margin-right: 0.5rem;
  }

  .treatments {
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }

  .pill {
    padding: 0.5rem 0.85rem;
    font-size: 0.85rem;
    border-radius: 16px;
  }

  .cost {
    font-size: 1.1rem;
    font-weight: 700;
    color: #333;
    display: flex;
    align-items: center;
  }

  .cost::before {
    content: '💰 ';
    margin-right: 0.5rem;
  }

  .visit-details {
    gap: 0.75rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .note-chip {
    max-width: 100%;
    font-size: 0.9rem;
  }

  /* Mobile action buttons */
  .action-btn {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 8px;
  }

  .action-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .action-btn:active {
    transform: scale(0.9);
  }

  /* Mobile loading and empty states */
  .loading-container,
  .empty-state {
    padding: 3rem 1rem;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
  }

  .empty-icon {
    width: 3rem;
    height: 3rem;
  }

  .empty-title {
    font-size: 1.1rem;
  }

  .empty-description {
    font-size: 1rem;
    max-width: none;
  }
}

/* Small mobile responsive */
@media (max-width: 480px) {
  .list-header {
    padding: 0.75rem;
  }

  .list-title {
    font-size: 1rem;
  }

  .btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
  }

  .list-filters {
    padding: 0.75rem;
  }

  .filter-input,
  .filter-select {
    padding: 0.75rem 0.875rem;
    font-size: 0.9rem;
  }

  .table-body {
    padding: 0 0.75rem 0.75rem 0.75rem;
  }

  .table-row {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .table-cell {
    margin-bottom: 0.625rem;
  }

  .visit-date {
    font-size: 1rem;
  }

  .cat-info,
  .hospital-name,
  .cost {
    font-size: 0.9rem;
  }

  .doctor-name {
    font-size: 0.8rem;
  }

  .pill {
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
  }

  .action-btn {
    width: 2.25rem;
    height: 2.25rem;
  }

  .action-btn svg {
    width: 1rem;
    height: 1rem;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .btn,
  .filter-input,
  .filter-select,
  .action-btn {
    min-height: 44px;
  }

  .table-row {
    cursor: pointer;
  }

  .table-row:hover {
    transform: none;
  }

  .table-row:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  .action-btn:hover {
    transform: none;
  }

  .action-btn:active {
    transform: scale(0.9);
    transition: transform 0.1s ease;
  }

  .btn:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .veterinary-visit-list,
  .table-row {
    border: 2px solid #000;
  }

  .filter-input,
  .filter-select {
    border: 2px solid #000;
  }

  .btn--primary {
    background: #000;
    border-color: #000;
  }

  .btn--secondary {
    background: #fff;
    border-color: #000;
    color: #000;
  }

  .action-btn--edit {
    background: #fff;
    border: 2px solid #000;
    color: #000;
  }

  .action-btn--delete {
    background: #fff;
    border: 2px solid #000;
    color: #000;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .table-row:hover,
  .table-row:active,
  .action-btn:active,
  .btn:active {
    transform: none;
  }

  .loading-spinner {
    animation: none;
  }

  * {
    transition: none !important;
  }
}
</style>
