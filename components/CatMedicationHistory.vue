<script setup lang="ts">
import MedicationRecordList from './MedicationRecordList.vue';
import MedicationRecordForm from './MedicationRecordForm.vue';
import type {
  MedicationRecord,
  MedicationRecordInput,
  Medication,
} from '~/types/medication';

import { MedicationStatus } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

interface Props {
  cat: Cat;
  medications: Medication[];
  loading?: boolean;
}

interface Emits {
  (e: 'record-created', record: MedicationRecord): void;
  (e: 'record-updated', record: MedicationRecord): void;
  (e: 'record-deleted', recordId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

// State
const showRecordForm = ref(false);
const editingRecord = ref<MedicationRecord | null>(null);

// Methods
const handleAddRecord = () => {
  editingRecord.value = null;
  showRecordForm.value = true;
};

const handleEditRecord = (record: MedicationRecord) => {
  editingRecord.value = record;
  showRecordForm.value = true;
};

const handleDeleteRecord = (record: MedicationRecord) => {
  emit('record-deleted', record.id);
};

const handleSaveRecord = (recordInput: MedicationRecordInput) => {
  if (editingRecord.value) {
    // Update existing record
    const updatedRecord: MedicationRecord = {
      ...editingRecord.value,
      ...recordInput,
      updatedAt: new Date(),
    };
    emit('record-updated', updatedRecord);
  }
  else {
    // Create new record
    const newRecord: MedicationRecord = {
      id: `temp-${Date.now()}`, // Temporary ID, will be replaced by server
      ...recordInput,
      status: recordInput.status || MedicationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    emit('record-created', newRecord);
  }

  showRecordForm.value = false;
  editingRecord.value = null;
};

const handleCloseForm = () => {
  showRecordForm.value = false;
  editingRecord.value = null;
};

const handleFilterChange = (filter: any) => {
  // Filter changes are handled by the MedicationRecordList component
  // This is just for potential future use
};

// Helper function for date formatting
const formatDate = (date: Date): string => {
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  }
  catch {
    // Fallback for test environment
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
};
</script>

<template>
  <div class="cat-medication-history">
    <!-- Header with cat info -->
    <div class="cat-header">
      <div class="cat-info">
        <div class="cat-avatar">
          <img
            v-if="cat.photoUrl"
            :src="cat.photoUrl"
            :alt="cat.name"
            class="cat-photo"
          >
          <div
            v-else
            class="cat-photo-placeholder"
          >
            🐱
          </div>
        </div>
        <div class="cat-details">
          <h2 class="cat-name">
            {{ cat.name }}の薬管理
          </h2>
          <div class="cat-meta">
            <span
              v-if="cat.birthdate"
              class="cat-age"
            >
              生年月日: {{ formatDate(cat.birthdate) }}
            </span>
            <span
              v-if="cat.weight"
              class="cat-weight"
            >
              体重: {{ cat.weight }}kg
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Medication Records List -->
    <MedicationRecordList
      :cats="[cat]"
      :medications="medications"
      :selected-cat-id="cat.id"
      :loading="loading"
      @add="handleAddRecord"
      @edit="handleEditRecord"
      @delete="handleDeleteRecord"
      @filter-change="handleFilterChange"
    />

    <!-- Medication Record Form -->
    <MedicationRecordForm
      :is-open="showRecordForm"
      :medication-record="editingRecord || undefined"
      :cats="[cat]"
      :medications="medications"
      :selected-cat-id="cat.id"
      @save="handleSaveRecord"
      @close="handleCloseForm"
    />
  </div>
</template>

<style scoped>
.cat-medication-history {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.cat-header {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cat-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.cat-avatar {
  flex-shrink: 0;
}

.cat-photo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e0e0e0;
}

.cat-photo-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border: 3px solid #e0e0e0;
}

.cat-details {
  flex: 1;
}

.cat-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.cat-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.cat-age,
.cat-weight {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .cat-medication-history {
    padding: 0.5rem;
  }

  .cat-header {
    padding: 1rem;
  }

  .cat-info {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .cat-photo,
  .cat-photo-placeholder {
    width: 60px;
    height: 60px;
  }

  .cat-name {
    font-size: 1.25rem;
  }

  .cat-meta {
    justify-content: center;
    font-size: 0.8rem;
  }
}
</style>
