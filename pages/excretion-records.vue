<template>
  <div
    class="excretion-records-page"
    role="main"
  >
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          排泄記録管理
        </h1>
        <p class="page-description">
          猫の排泄記録を管理し、健康状態を把握できます
        </p>
      </div>
      <div class="header-actions">
        <button
          data-testid="add-record-button"
          class="add-record-button"
          aria-label="新しい排泄記録を追加"
          @click="showAddModal = true"
        >
          <span class="add-icon">+</span>
          新規記録
        </button>
      </div>
    </div>

    <!-- View Toggle -->
    <div
      class="view-toggle"
      role="tablist"
      aria-label="表示方法を選択"
    >
      <button
        data-testid="list-tab"
        class="toggle-button"
        :class="{ 'toggle-button--active': currentView === 'list' }"
        role="tab"
        :aria-selected="currentView === 'list'"
        :aria-controls="currentView === 'list' ? 'list-panel' : undefined"
        :tabindex="currentView === 'list' ? 0 : -1"
        @click="setView('list')"
      >
        <span
          class="toggle-icon"
          aria-hidden="true"
        >📋</span>
        一覧表示
      </button>
      <button
        data-testid="calendar-tab"
        class="toggle-button"
        :class="{ 'toggle-button--active': currentView === 'calendar' }"
        role="tab"
        :aria-selected="currentView === 'calendar'"
        :aria-controls="currentView === 'calendar' ? 'calendar-panel' : undefined"
        :tabindex="currentView === 'calendar' ? 0 : -1"
        @click="setView('calendar')"
      >
        <span
          class="toggle-icon"
          aria-hidden="true"
        >📅</span>
        カレンダー表示
      </button>
    </div>

    <!-- Error State -->
    <div
      v-if="error && !loading"
      class="error-banner"
    >
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ error }}</span>
      </div>
      <button
        class="error-retry-button"
        @click="handleRetry"
      >
        再試行
      </button>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- List View -->
      <div
        v-if="currentView === 'list'"
        id="list-panel"
        class="list-view"
        role="tabpanel"
        aria-labelledby="list-tab"
      >
        <ExcretionRecordList
          :records="records as ExcretionRecord[]"
          :cats="cats"
          :loading="loading"
          :total="total"
          :has-more="hasMore"
          :show-filters="true"
          :show-pagination="true"
          @filter="handleFilter"
          @load-more="handleLoadMore"
          @edit="handleEdit"
          @delete="handleDelete"
          @add="showAddModal = true"
        />
      </div>

      <!-- Calendar View -->
      <div
        v-if="currentView === 'calendar'"
        id="calendar-panel"
        class="calendar-view"
        role="tabpanel"
        aria-labelledby="calendar-tab"
      >
        <ExcretionCalendar
          :cats="cats as any"
          :cat-id="selectedCatId"
          @date-selected="handleDateSelected"
          @month-changed="handleMonthChanged"
          @cat-changed="handleCatChanged"
        />
      </div>
    </div>

    <!-- Add Record Modal -->
    <div
      v-if="showAddModal"
      class="modal-overlay"
      @click="closeAddModal"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h2 class="modal-title">
            新規排泄記録
          </h2>
          <button
            class="modal-close-button"
            @click="closeAddModal"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <ExcretionRecordForm
            :cats="cats"
            :loading="formLoading"
            @submit="handleAdd"
            @cancel="closeAddModal"
          />
        </div>
      </div>
    </div>

    <!-- Edit Record Modal -->
    <div
      v-if="showEditModal && editingRecord"
      class="modal-overlay"
      @click="closeEditModal"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h2 class="modal-title">
            排泄記録編集
          </h2>
          <button
            class="modal-close-button"
            @click="closeEditModal"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <ExcretionRecordForm
            :cats="cats"
            :initial-data="editingRecord"
            :loading="formLoading"
            @submit="handleUpdate"
            @cancel="closeEditModal"
          />
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmationDialog
      :is-open="showDeleteModal"
      :title="'排泄記録を削除'"
      :message="deleteConfirmMessage"
      :confirm-text="'削除'"
      :cancel-text="'キャンセル'"
      :loading="formLoading"
      :danger="true"
      @confirm="handleDeleteConfirm"
      @cancel="closeDeleteModal"
    />

    <!-- Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import type { Cat } from '~/types/cat-meal';
import type { ExcretionRecord, ExcretionRecordInput, ExcretionRecordFilter } from '~/types/excretion';

// 遅延読み込みコンポーネント（パフォーマンス最適化）
const ExcretionRecordList = defineAsyncComponent(() => import('~/components/ExcretionRecordList.vue'));
const ExcretionCalendar = defineAsyncComponent(() => import('~/components/ExcretionCalendar.vue'));
const ExcretionRecordForm = defineAsyncComponent(() => import('~/components/ExcretionRecordForm.vue'));
const ConfirmationDialog = defineAsyncComponent(() => import('~/components/ConfirmationDialog.vue'));
const ToastContainer = defineAsyncComponent(() => import('~/components/ToastContainer.vue'));

// Meta
definePageMeta({
  title: '排泄記録管理',
  middleware: 'auth',
});

// Composables
const { records, loading, error, total, hasMore, fetchRecords, createRecord, updateRecord, deleteRecord } = useExcretionRecords();
const { success: showSuccessToast, error: showErrorToast } = useToast();
const { measure, measureComponentRender } = usePerformanceMonitor();

// State
const currentView = ref<'list' | 'calendar'>('list');
const cats = ref<Cat[]>([]);
const selectedCatId = ref<number | undefined>(undefined);

// Modal states
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const editingRecord = ref<ExcretionRecord | null>(null);
const deletingRecord = ref<ExcretionRecord | null>(null);
const formLoading = ref(false);

// Computed
const deleteConfirmMessage = computed(() => {
  if (!deletingRecord.value) return '';
  const record = deletingRecord.value;
  const cat = cats.value.find(c => c.id === record.catId);
  const catName = cat?.name || '不明な猫';
  const typeLabel = record.type === 'URINE' ? 'おしっこ' : 'うんち';
  const dateStr = new Date(record.recordedAt).toLocaleDateString('ja-JP');
  return `${catName}の${typeLabel}記録（${dateStr}）を削除しますか？この操作は取り消せません。`;
});

// Methods
const setView = (view: 'list' | 'calendar') => {
  currentView.value = view;

  // Save view preference to localStorage
  if (import.meta.client) {
    localStorage.setItem('excretion-records-view', view);
  }
};

const loadCats = async () => {
  try {
    const response = await measure(
      'load-cats',
      () => $fetch<{ cats: Cat[] }>('/api/cats'),
      { operation: 'fetch-cats' },
    );
    cats.value = response.cats;
  }
  catch (err) {
    showErrorToast({ message: '猫データの読み込みに失敗しました' });
  }
};

const loadInitialData = async () => {
  await Promise.all([
    loadCats(),
    fetchRecords({ limit: 20 }),
  ]);
};

const handleFilter = async (filter: ExcretionRecordFilter) => {
  try {
    await measure(
      'filter-records',
      () => fetchRecords(filter),
      { filter, recordCount: records.value.length },
    );
  }
  catch (err) {
    showErrorToast({ message: 'フィルタリングに失敗しました' });
  }
};

const handleLoadMore = async () => {
  try {
    const { loadMore } = useExcretionRecords();
    await loadMore();
  }
  catch (err) {
    showErrorToast({ message: '追加データの読み込みに失敗しました' });
  }
};

const handleAdd = async (data: ExcretionRecordInput) => {
  formLoading.value = true;
  try {
    await createRecord(data);
    showSuccessToast({ message: '排泄記録を追加しました' });
    closeAddModal();
  }
  catch (err) {
    showErrorToast({ message: '排泄記録の追加に失敗しました' });
  }
  finally {
    formLoading.value = false;
  }
};

const handleEdit = (record: ExcretionRecord) => {
  editingRecord.value = {
    ...record,
    recordedAt: new Date(record.recordedAt),
  };
  showEditModal.value = true;
};

const handleUpdate = async (data: ExcretionRecordInput) => {
  if (!editingRecord.value) return;

  formLoading.value = true;
  try {
    await updateRecord(editingRecord.value.id, data);
    showSuccessToast({ message: '排泄記録を更新しました' });
    closeEditModal();
  }
  catch (err) {
    showErrorToast({ message: '排泄記録の更新に失敗しました' });
  }
  finally {
    formLoading.value = false;
  }
};

const handleDelete = (record: ExcretionRecord) => {
  deletingRecord.value = record;
  showDeleteModal.value = true;
};

const handleDeleteConfirm = async () => {
  if (!deletingRecord.value) return;

  formLoading.value = true;
  try {
    await deleteRecord(deletingRecord.value.id);
    showSuccessToast({ message: '排泄記録を削除しました' });
    closeDeleteModal();
  }
  catch (err) {
    showErrorToast({ message: '排泄記録の削除に失敗しました' });
  }
  finally {
    formLoading.value = false;
  }
};

const handleDateSelected = (_date: string, _records: ExcretionRecord[]) => {
  // Handle date selection from calendar
  // Implementation will be added when needed
};

const handleMonthChanged = (_year: number, _month: number) => {
  // Handle month change from calendar
  // Implementation will be added when needed
};

const handleCatChanged = (catId: number) => {
  selectedCatId.value = catId;
};

const handleRetry = async () => {
  await loadInitialData();
};

// Modal handlers
const closeAddModal = () => {
  showAddModal.value = false;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingRecord.value = null;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  deletingRecord.value = null;
};

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  // ESC to close modals
  if (event.key === 'Escape') {
    if (showAddModal.value) closeAddModal();
    if (showEditModal.value) closeEditModal();
    if (showDeleteModal.value) closeDeleteModal();
  }

  // Ctrl/Cmd + N to add new record
  if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
    event.preventDefault();
    showAddModal.value = true;
  }

  // 1/2 to switch views
  if (event.key === '1') {
    setView('list');
  }
  if (event.key === '2') {
    setView('calendar');
  }
};

// Lifecycle
onMounted(async () => {
  // Load saved view preference
  if (import.meta.client) {
    const savedView = localStorage.getItem('excretion-records-view') as 'list' | 'calendar';
    if (savedView) {
      currentView.value = savedView;
    }
  }

  // Load initial data
  await loadInitialData();

  // Add keyboard event listeners
  if (import.meta.client) {
    document.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', handleKeydown);
  }
});

// SEO
useHead({
  title: '排泄記録管理',
  meta: [
    {
      name: 'description',
      content: '飼い猫の排泄記録を管理し、健康状態を把握するためのページです。',
    },
  ],
});
</script>

<style scoped>
.excretion-records-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 1rem;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #333;
}

.page-description {
  margin: 0;
  color: #666;
  font-size: 1rem;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.add-record-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  background: #4caf50;
  color: white;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-record-button:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
}

.add-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

/* View Toggle */
.view-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: fit-content;
}

.toggle-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button:hover {
  background: #f8f9fa;
  color: #333;
}

.toggle-button--active {
  background: #4caf50;
  color: white;
}

.toggle-icon {
  font-size: 1rem;
}

/* Error Banner */
.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem 1.5rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.error-icon {
  font-size: 1.2rem;
}

.error-message {
  font-weight: 500;
}

.error-retry-button {
  padding: 0.5rem 1rem;
  border: 1px solid #c33;
  border-radius: 4px;
  background: white;
  color: #c33;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-retry-button:hover {
  background: #c33;
  color: white;
}

/* Main Content */
.main-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.list-view,
.calendar-view {
  padding: 2rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.modal-close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.2s ease;
}

.modal-close-button:hover {
  color: #333;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .excretion-records-page {
    padding: 0.5rem;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .header-actions {
    justify-content: center;
  }

  .view-toggle {
    width: 100%;
    justify-content: center;
  }

  .toggle-button {
    flex: 1;
    justify-content: center;
  }

  .list-view,
  .calendar-view {
    padding: 1rem;
  }

  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-header {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.5rem;
  }

  .page-description {
    font-size: 0.9rem;
  }

  .add-record-button {
    width: 100%;
    justify-content: center;
  }

  .error-banner {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .view-toggle {
    margin-bottom: 1rem;
  }
}

/* Animation */
.modal-overlay {
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  animation: slideUp 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Focus management */
.modal-content:focus {
  outline: none;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .page-header,
  .main-content,
  .view-toggle {
    border: 2px solid #333;
  }

  .toggle-button--active {
    border: 2px solid #fff;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .add-record-button,
  .toggle-button,
  .error-retry-button,
  .modal-close-button {
    transition: none;
  }

  .add-record-button:hover {
    transform: none;
  }

  .modal-overlay,
  .modal-content {
    animation: none;
  }
}
</style>
