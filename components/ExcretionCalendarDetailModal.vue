<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    @click.self="handleClose"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">
          {{ formattedDate }}の排泄記録
        </h2>
        <button
          type="button"
          class="modal-close-btn"
          @click="handleClose"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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

      <div class="modal-body">
        <!-- Add New Record Button -->
        <div class="add-record-section">
          <button
            type="button"
            class="add-record-btn"
            @click="showAddForm = true"
          >
            <svg
              class="w-4 h-4"
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
            新しい記録を追加
          </button>
        </div>

        <!-- Add Record Form -->
        <div
          v-if="showAddForm"
          class="add-form-section"
        >
          <ExcretionRecordForm
            :cats="cats"
            :initial-date="selectedDate"
            @submit="handleAddRecord"
            @cancel="showAddForm = false"
          />
        </div>

        <!-- Records List -->
        <div class="records-section">
          <div
            v-if="loading"
            class="loading-state"
          >
            <div class="loading-spinner" />
            <p>記録を読み込み中...</p>
          </div>

          <div
            v-else-if="records.length === 0"
            class="empty-state"
          >
            <div class="empty-icon">
              📝
            </div>
            <p class="empty-message">
              この日の記録はありません
            </p>
            <p class="empty-description">
              上のボタンから新しい記録を追加できます
            </p>
          </div>

          <div
            v-else
            class="records-list"
          >
            <div
              v-for="record in sortedRecords"
              :key="record.id"
              class="record-item"
            >
              <!-- Edit Form -->
              <div
                v-if="editingRecordId === record.id"
                class="edit-form"
              >
                <ExcretionRecordForm
                  :cats="cats"
                  :initial-data="record"
                  @submit="handleUpdateRecord"
                  @cancel="cancelEdit"
                />
              </div>

              <!-- Record Display -->
              <div
                v-else
                class="record-display"
              >
                <ExcretionRecordCard
                  :record="record"
                  :show-cat-name="true"
                  @edit="startEdit(record.id)"
                  @delete="handleDeleteRecord(record.id)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div
          v-if="records.length > 0"
          class="summary-section"
        >
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-icon">💧</span>
              <span class="stat-text">おしっこ: {{ urineCount }}回</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">💩</span>
              <span class="stat-text">うんち: {{ fecesCount }}回</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">📝</span>
              <span class="stat-text">メモ付き: {{ notesCount }}件</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Dialog -->
  <ConfirmationDialog
    :is-open="showDeleteConfirmation"
    title="記録を削除"
    message="この排泄記録を削除しますか？この操作は取り消せません。"
    confirm-text="削除"
    cancel-text="キャンセル"
    type="danger"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  />
</template>

<script setup lang="ts">
import ExcretionRecordForm from './ExcretionRecordForm.vue';
import ExcretionRecordCard from './ExcretionRecordCard.vue';
import ConfirmationDialog from './ConfirmationDialog.vue';
import type { ExcretionRecord, ExcretionRecordInput } from '~/types/excretion';
import { ExcretionType } from '~/types/excretion';
import type { Cat } from '~/types/index';

interface Props {
  isOpen: boolean;
  selectedDate: string | null;
  records: ExcretionRecord[];
  cats: Cat[];
  loading?: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'recordAdded', record: ExcretionRecord): void;
  (e: 'recordUpdated', record: ExcretionRecord): void;
  (e: 'recordDeleted', recordId: number): void;
  (e: 'refresh'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

// Composables
const { createRecord, updateRecord, deleteRecord } = useExcretionRecords();
const { success: showSuccessToast, error: showErrorToast } = useToast();

// State
const showAddForm = ref(false);
const editingRecordId = ref<number | null>(null);
const showDeleteConfirmation = ref(false);
const recordToDelete = ref<number | null>(null);

// Computed
const formattedDate = computed(() => {
  if (!props.selectedDate) return '';

  const date = new Date(props.selectedDate);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
});

const sortedRecords = computed(() => {
  return [...props.records].sort((a, b) => {
    return new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime();
  });
});

const urineCount = computed(() => {
  return props.records.filter(record => record.type === ExcretionType.URINE).length;
});

const fecesCount = computed(() => {
  return props.records.filter(record => record.type === ExcretionType.FECES).length;
});

const notesCount = computed(() => {
  return props.records.filter(record => record.notes && record.notes.trim()).length;
});

// Methods
const handleClose = () => {
  showAddForm.value = false;
  editingRecordId.value = null;
  emit('close');
};

const handleAddRecord = async (data: ExcretionRecordInput) => {
  try {
    const record = await createRecord(data);
    showAddForm.value = false;
    emit('recordAdded', record);
    emit('refresh');
    showSuccessToast({ message: '排泄記録を追加しました' });
  }
  catch (error) {
    showErrorToast({ message: '記録の追加に失敗しました' });
  }
};

const startEdit = (recordId: number) => {
  editingRecordId.value = recordId;
  showAddForm.value = false;
};

const cancelEdit = () => {
  editingRecordId.value = null;
};

const handleUpdateRecord = async (data: ExcretionRecordInput) => {
  if (!editingRecordId.value) return;

  try {
    const record = await updateRecord(editingRecordId.value, data);
    editingRecordId.value = null;
    emit('recordUpdated', record);
    emit('refresh');
    showSuccessToast({ message: '排泄記録を更新しました' });
  }
  catch (error) {
    showErrorToast({ message: '記録の更新に失敗しました' });
  }
};

const handleDeleteRecord = (recordId: number) => {
  recordToDelete.value = recordId;
  showDeleteConfirmation.value = true;
};

const confirmDelete = async () => {
  if (!recordToDelete.value) return;

  try {
    await deleteRecord(recordToDelete.value);
    emit('recordDeleted', recordToDelete.value);
    emit('refresh');
    showSuccessToast({ message: '排泄記録を削除しました' });
  }
  catch (error) {
    showErrorToast({ message: '記録の削除に失敗しました' });
  }
  finally {
    showDeleteConfirmation.value = false;
    recordToDelete.value = null;
  }
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  recordToDelete.value = null;
};

// Watch for prop changes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    showAddForm.value = false;
    editingRecordId.value = null;
  }
});

watch(() => props.selectedDate, () => {
  showAddForm.value = false;
  editingRecordId.value = null;
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
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
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.modal-close-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  color: #374151;
  background-color: #f3f4f6;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.add-record-section {
  margin-bottom: 1.5rem;
}

.add-record-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-record-btn:hover {
  background-color: #2563eb;
}

.add-form-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.records-section {
  margin-bottom: 1.5rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-message {
  font-size: 1.125rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.empty-description {
  color: #6b7280;
  margin: 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.record-item {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
}

.edit-form {
  padding: 1rem;
  background-color: #f8fafc;
}

.record-display {
  /* ExcretionRecordCard will handle its own styling */
}

.summary-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
}

.summary-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
}

.stat-icon {
  font-size: 1.25rem;
}

.stat-text {
  font-weight: 500;
  color: #374151;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.125rem;
  }

  .add-record-btn {
    width: 100%;
    justify-content: center;
  }

  .summary-stats {
    flex-direction: column;
    align-items: stretch;
  }

  .stat-item {
    justify-content: center;
  }
}
</style>
