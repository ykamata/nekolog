<script setup lang="ts">
import type { ExcretionRecord } from '~/types/excretion';
import { ExcretionType, ExcretionTypeLabels } from '~/types/excretion';

interface Props {
  record: ExcretionRecord;
  showActions?: boolean;
  loading?: boolean;
}

interface Emits {
  (e: 'edit', record: ExcretionRecord): void;
  (e: 'delete', record: ExcretionRecord): void;
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  loading: false,
});

const emit = defineEmits<Emits>();

// State for confirmation dialog
const showDeleteConfirmation = ref(false);

// Computed properties
const typeLabel = computed(() => ExcretionTypeLabels[props.record.type]);

const typeIcon = computed(() => {
  return props.record.type === ExcretionType.URINE ? '💧' : '💩';
});

const typeColor = computed(() => {
  return props.record.type === ExcretionType.URINE ? '#2196f3' : '#8b4513';
});

const formattedDateTime = computed(() => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).format(new Date(props.record.recordedAt));
});

const formattedTime = computed(() => {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(props.record.recordedAt));
});

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(props.record.recordedAt));
});

const hasNotes = computed(() => {
  return props.record.notes && props.record.notes.trim().length > 0;
});

// Methods
const handleEdit = () => {
  emit('edit', props.record);
};

const handleDelete = () => {
  showDeleteConfirmation.value = true;
};

const confirmDelete = () => {
  emit('delete', props.record);
  showDeleteConfirmation.value = false;
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
};

// Calculate relative time
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'たった今';
  }
  else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  }
  else if (diffHours < 24) {
    return `${diffHours}時間前`;
  }
  else if (diffDays < 7) {
    return `${diffDays}日前`;
  }
  else {
    return formattedDate.value;
  }
};

const relativeTime = computed(() => getRelativeTime(new Date(props.record.recordedAt)));
</script>

<template>
  <article
    class="excretion-record-card"
    role="article"
    :aria-labelledby="`record-${record.id}-title`"
  >
    <div class="card-header">
      <div class="type-info">
        <div
          class="type-icon"
          :style="{ color: typeColor }"
        >
          {{ typeIcon }}
        </div>
        <div class="type-details">
          <div
            :id="`record-${record.id}-title`"
            class="type-label"
          >
            {{ typeLabel }}
          </div>
          <div class="cat-name">
            {{ record.cat?.name || '不明な猫' }}
          </div>
        </div>
      </div>
      <div class="time-info">
        <div class="formatted-time">
          <time :datetime="new Date(record.recordedAt).toISOString()">{{ formattedTime }}</time>
        </div>
        <div
          class="relative-time"
          aria-label="記録からの経過時間"
        >
          {{ relativeTime }}
        </div>
      </div>
    </div>

    <div class="card-body">
      <div class="datetime-display">
        <div class="datetime-label">
          記録日時
        </div>
        <div class="datetime-value">
          {{ formattedDateTime }}
        </div>
      </div>

      <div
        v-if="hasNotes"
        class="notes-section"
      >
        <div class="notes-label">
          <span class="notes-icon">📝</span>
          メモ
        </div>
        <div class="notes-content">
          {{ record.notes }}
        </div>
      </div>
    </div>

    <div
      v-if="showActions"
      class="card-actions"
    >
      <button
        data-testid="edit-record-button"
        class="action-button edit-button"
        :disabled="loading"
        :aria-label="`${record.cat?.name || '猫'}の${typeLabel}記録を編集`"
        @click="handleEdit"
      >
        <span
          class="action-icon"
          aria-hidden="true"
        >✏️</span>
        編集
      </button>
      <button
        data-testid="delete-record-button"
        class="action-button delete-button"
        :disabled="loading"
        :aria-label="`${record.cat?.name || '猫'}の${typeLabel}記録を削除`"
        @click="handleDelete"
      >
        <span
          class="action-icon"
          aria-hidden="true"
        >🗑️</span>
        削除
      </button>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      data-testid="confirmation-dialog"
      :is-open="showDeleteConfirmation"
      :title="`排泄記録を削除`"
      :message="`${record.cat?.name || '猫'}の${typeLabel}記録（${formattedDateTime}）を削除しますか？この操作は取り消せません。`"
      confirm-text="削除"
      cancel-text="キャンセル"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </article>
</template>

<style scoped>
.excretion-record-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.excretion-record-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #cbd5e0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
}

.type-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.type-icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid currentColor;
}

.type-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.type-label {
  font-weight: 600;
  color: #333;
  font-size: 1rem;
}

.cat-name {
  font-size: 0.8rem;
  color: #666;
}

.time-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.formatted-time {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
}

.relative-time {
  font-size: 0.8rem;
  color: #666;
}

.card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.datetime-display {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.datetime-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.datetime-value {
  color: #333;
  font-size: 0.9rem;
}

.notes-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

.notes-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.notes-icon {
  font-size: 0.9rem;
}

.notes-content {
  color: #333;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e2e8f0;
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #666;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.edit-button:hover:not(:disabled) {
  border-color: #4caf50;
  color: #4caf50;
  background: #f8fff8;
}

.delete-button:hover:not(:disabled) {
  border-color: #f44336;
  color: #f44336;
  background: #fff8f8;
}

.action-icon {
  font-size: 0.9rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .time-info {
    align-items: flex-start;
    width: 100%;
  }

  .type-info {
    width: 100%;
  }

  .card-actions {
    flex-direction: column;
  }

  .action-button {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .excretion-record-card {
    border-radius: 4px;
  }

  .card-header,
  .card-body,
  .card-actions {
    padding: 0.75rem;
  }

  .type-icon {
    width: 2rem;
    height: 2rem;
    font-size: 1.2rem;
  }

  .formatted-time {
    font-size: 1rem;
  }
}
</style>
