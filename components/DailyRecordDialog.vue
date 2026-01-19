<script setup lang="ts">
import type { DailyCalendarData } from '~/types/daily-calendar';
import type { Cat, Food } from '~/types/cat-meal';
import type { Medication } from '~/types/medication';

interface Props {
  isOpen: boolean;
  date: string;
  dayData: DailyCalendarData | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'refresh'): void;
  (e: 'showMessage', message: string, type: 'success' | 'error'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const activeTab = ref<'meal' | 'excretion' | 'medication' | 'memo' | 'signal'>(
  'meal'
);
const cats = ref<Cat[]>([]);
const foods = ref<Food[]>([]);
const medications = ref<Medication[]>([]);
const selectedCatId = ref<number | null>(null);

// Daily note form
const selectedMedicationId = ref<number | null>(null);
const memo = ref('');

// Health signal form
const signalColor = ref<'GREEN' | 'YELLOW' | 'RED' | 'PRISMATIC' | null>(null);
const signalNote = ref('');

// Meal form
const mealFoodId = ref<number | null>(null);
const mealQuantity = ref<number | null>(null);
const mealTime = ref('');

// Excretion form
const excretionType = ref<'URINE' | 'FECES'>('URINE');
const excretionTime = ref('');

// Loading states
const isLoadingCats = ref(false);
const isLoadingFoods = ref(false);
const isLoadingMedications = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);

// Computed
const formattedDate = computed(() => {
  if (!props.date) return '';
  const d = new Date(props.date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
});

// Computed - selected food info for auto-calculation
const selectedFood = computed(() => {
  if (!mealFoodId.value) return null;
  return foods.value.find((f) => f.id === mealFoodId.value) || null;
});

// Watch quantity and food to calculate calories
watch([mealQuantity, mealFoodId], () => {
  // Auto-calculate calories if food is selected
  // This will be used when submitting the form
});

// Methods
const fetchCats = async () => {
  isLoadingCats.value = true;
  try {
    const data = await $fetch<Cat[]>('/api/cats');
    cats.value = data;
    if (data.length > 0 && !selectedCatId.value) {
      selectedCatId.value = data[0]?.id ?? null;
    }
  } catch (err) {
    console.error('猫データ取得エラー:', err);
  } finally {
    isLoadingCats.value = false;
  }
};

const fetchFoods = async () => {
  isLoadingFoods.value = true;
  try {
    const data = await $fetch<Food[]>('/api/foods');
    foods.value = data;
  } catch (err) {
    console.error('フードデータ取得エラー:', err);
  } finally {
    isLoadingFoods.value = false;
  }
};

const fetchMedications = async () => {
  isLoadingMedications.value = true;
  try {
    const data = await $fetch<{ medications: Medication[] }>(
      '/api/medications'
    );
    medications.value = data.medications;
  } catch (err) {
    console.error('薬データ取得エラー:', err);
  } finally {
    isLoadingMedications.value = false;
  }
};

const resetFormFields = () => {
  // Reset meal form
  mealFoodId.value = null;
  mealQuantity.value = null;

  // Reset excretion form
  excretionType.value = 'URINE';

  // Set default time to current time
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  mealTime.value = timeStr;
  excretionTime.value = timeStr;
};

const loadDayData = () => {
  // Always reset form fields when dialog opens
  resetFormFields();

  if (!props.dayData) {
    // No day data, reset medication and memo as well
    selectedMedicationId.value = null;
    memo.value = '';
    signalColor.value = null;
    signalNote.value = '';
    return;
  }

  const note = props.dayData.dailyNote;
  if (note) {
    selectedMedicationId.value = note.medicationId || null;
    memo.value = note.memo || '';
  } else {
    selectedMedicationId.value = null;
    memo.value = '';
  }

  // Load health signal data
  signalColor.value = props.dayData.signalColor || null;
  signalNote.value = props.dayData.signalNote || '';
};

const handleClose = () => {
  emit('close');
};

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
};

const saveDailyNote = async () => {
  if (!selectedCatId.value) return;

  try {
    await $fetch('/api/daily-notes', {
      method: 'POST',
      body: {
        catId: selectedCatId.value,
        date: props.date,
        medicationId: selectedMedicationId.value,
        emergencyMedication: selectedMedicationId.value ? true : false,
        memo: memo.value || null,
      },
    });

    console.log('✅ デイリーノート保存成功');
  } catch (err) {
    console.error('❌ デイリーノート保存エラー:', err);
    throw err;
  }
};

const saveMeal = async () => {
  if (!selectedCatId.value || !mealFoodId.value) {
    emit('showMessage', '猫とフードを選択してください', 'error');
    return;
  }

  if (!mealQuantity.value || mealQuantity.value <= 0) {
    emit('showMessage', '量を入力してください', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const [hours = '0', minutes = '0'] = mealTime.value.split(':');
    // Create date string in YYYY-MM-DDTHH:mm:ss format (local time)
    const localDateTime = `${props.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    // Calculate calories
    const calories = selectedFood.value
      ? mealQuantity.value * selectedFood.value.caloriesPerGram
      : 0;

    await $fetch('/api/meals', {
      method: 'POST',
      body: {
        catId: selectedCatId.value,
        foodId: mealFoodId.value,
        quantity: mealQuantity.value,
        calories,
        mealTime: localDateTime,
      },
    });

    emit('showMessage', '食事記録を保存しました', 'success');
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error('食事記録保存エラー:', err);
    emit('showMessage', '食事記録の保存に失敗しました', 'error');
  } finally {
    isSaving.value = false;
  }
};

const saveExcretion = async () => {
  if (!selectedCatId.value) {
    emit('showMessage', '猫を選択してください', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const [hours = '0', minutes = '0'] = excretionTime.value.split(':');
    // Create date string in YYYY-MM-DDTHH:mm:ss format (local time)
    const localDateTime = `${props.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    await $fetch('/api/excretion-records', {
      method: 'POST',
      body: {
        catId: selectedCatId.value,
        type: excretionType.value,
        recordedAt: localDateTime,
      },
    });

    emit('showMessage', '排泄記録を保存しました', 'success');
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error('排泄記録保存エラー:', err);
    emit('showMessage', '排泄記録の保存に失敗しました', 'error');
  } finally {
    isSaving.value = false;
  }
};

const saveMedication = async () => {
  if (!selectedCatId.value) {
    emit('showMessage', '猫を選択してください', 'error');
    return;
  }

  if (!selectedMedicationId.value) {
    emit('showMessage', '頓服薬を選択してください', 'error');
    return;
  }

  isSaving.value = true;
  try {
    await saveDailyNote();
    emit('showMessage', '頓服薬を保存しました', 'success');
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error('保存エラー:', err);
    emit('showMessage', '頓服薬の保存に失敗しました', 'error');
  } finally {
    isSaving.value = false;
  }
};

const saveMemo = async () => {
  if (!selectedCatId.value) {
    emit('showMessage', '猫を選択してください', 'error');
    return;
  }

  isSaving.value = true;
  try {
    await saveDailyNote();
    emit('showMessage', 'メモを保存しました', 'success');
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error('保存エラー:', err);
    emit('showMessage', 'メモの保存に失敗しました', 'error');
  } finally {
    isSaving.value = false;
  }
};

const saveHealthSignal = async () => {
  if (!selectedCatId.value) {
    emit('showMessage', '猫を選択してください', 'error');
    return;
  }

  if (!signalColor.value) {
    emit('showMessage', 'シグナルカラーを選択してください', 'error');
    return;
  }

  isSaving.value = true;
  try {
    await $fetch('/api/health-signals', {
      method: 'POST',
      body: {
        catId: selectedCatId.value,
        date: props.date,
        color: signalColor.value,
        note: signalNote.value || null,
      },
    });

    emit('showMessage', '健康シグナルを保存しました', 'success');
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error('健康シグナル保存エラー:', err);
    emit('showMessage', '健康シグナルの保存に失敗しました', 'error');
  } finally {
    isSaving.value = false;
  }
};

const deleteMedication = async () => {
  if (!props.dayData?.dailyNote?.id) {
    emit('showMessage', '削除する頓服薬がありません', 'error');
    return;
  }

  isDeleting.value = true;
  try {
    await $fetch(`/api/daily-notes/${props.dayData.dailyNote.id}`, {
      method: 'PUT',
      body: {
        medicationId: null,
        emergencyMedication: false,
      },
    });

    emit('showMessage', '頓服薬を削除しました', 'success');
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error('頓服薬削除エラー:', err);
    emit('showMessage', '頓服薬の削除に失敗しました', 'error');
  } finally {
    isDeleting.value = false;
  }
};

const deleteMemo = async () => {
  if (!props.dayData?.dailyNote?.id) {
    emit('showMessage', '削除するメモがありません', 'error');
    return;
  }

  isDeleting.value = true;
  try {
    await $fetch(`/api/daily-notes/${props.dayData.dailyNote.id}`, {
      method: 'PUT',
      body: {
        memo: null,
      },
    });

    emit('showMessage', 'メモを削除しました', 'success');
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error('メモ削除エラー:', err);
    emit('showMessage', 'メモの削除に失敗しました', 'error');
  } finally {
    isDeleting.value = false;
  }
};

const deleteHealthSignal = async () => {
  if (!props.dayData?.signalColor) {
    emit('showMessage', '削除する健康シグナルがありません', 'error');
    return;
  }

  isDeleting.value = true;
  try {
    // Get the health signal ID by fetching it first
    const signals = await $fetch<{ id: number }[]>('/api/health-signals', {
      params: {
        catId: selectedCatId.value,
        startDate: props.date,
        endDate: props.date,
      },
    });

    if (signals && signals.length > 0 && signals[0]) {
      await $fetch(`/api/health-signals/${signals[0].id}`, {
        method: 'DELETE',
      });
    }

    emit('showMessage', '健康シグナルを削除しました', 'success');
    emit('refresh');
    emit('close');
  } catch (err) {
    console.error('健康シグナル削除エラー:', err);
    emit('showMessage', '健康シグナルの削除に失敗しました', 'error');
  } finally {
    isDeleting.value = false;
  }
};

// Watch props changes
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      fetchCats();
      fetchFoods();
      fetchMedications();
      loadDayData();
    }
  }
);

watch(
  () => props.dayData,
  () => {
    if (props.isOpen) {
      loadDayData();
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleBackdropClick">
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">{{ formattedDate }}の記録</h2>
            <button type="button" class="modal-close" @click="handleClose">
              ✕
            </button>
          </div>

          <!-- Cat Selector -->
          <div class="cat-selector">
            <label class="cat-label">猫を選択:</label>
            <select v-model="selectedCatId" class="cat-select">
              <option v-for="cat in cats" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeTab === 'meal' }"
              @click="activeTab = 'meal'"
            >
              🍽️ 食事
            </button>
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeTab === 'excretion' }"
              @click="activeTab = 'excretion'"
            >
              💧 排泄
            </button>
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeTab === 'medication' }"
              @click="activeTab = 'medication'"
            >
              💊 頓服薬
            </button>
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeTab === 'memo' }"
              @click="activeTab = 'memo'"
            >
              📝 メモ
            </button>
            <button
              type="button"
              class="tab"
              :class="{ 'tab--active': activeTab === 'signal' }"
              @click="activeTab = 'signal'"
            >
              🚦 健康シグナル
            </button>
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Meal Tab -->
            <div v-if="activeTab === 'meal'" class="tab-panel">
              <div class="form-group">
                <label class="form-label">フード</label>
                <select
                  v-model="mealFoodId"
                  class="form-select"
                  :disabled="isLoadingFoods"
                >
                  <option :value="null">
                    {{ isLoadingFoods ? '読み込み中...' : 'フードを選択' }}
                  </option>
                  <option v-for="food in foods" :key="food.id" :value="food.id">
                    {{ food.name }} ({{
                      food.type === 'DRY' ? 'ドライ' : 'ウェット'
                    }})
                    {{ food.brand ? `- ${food.brand}` : '' }}
                  </option>
                </select>
                <div v-if="selectedFood" class="food-info">
                  <small class="food-info-text">
                    カロリー: {{ selectedFood.caloriesPerGram }}kcal/g
                    {{
                      mealQuantity && mealQuantity > 0
                        ? `(${Math.round(mealQuantity * selectedFood.caloriesPerGram)}kcal)`
                        : ''
                    }}
                  </small>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">量 (g)</label>
                <input
                  v-model.number="mealQuantity"
                  type="number"
                  class="form-input"
                  placeholder="20"
                  min="0"
                  step="1"
                />
              </div>

              <div class="form-group">
                <label class="form-label">時刻</label>
                <input v-model="mealTime" type="time" class="form-input" />
              </div>

              <div class="form-actions">
                <button
                  type="button"
                  class="btn btn--secondary"
                  @click="handleClose"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  class="btn btn--primary"
                  :disabled="isSaving"
                  @click="saveMeal"
                >
                  {{ isSaving ? '保存中...' : '食事を記録' }}
                </button>
              </div>
            </div>

            <!-- Excretion Tab -->
            <div v-if="activeTab === 'excretion'" class="tab-panel">
              <div class="form-group">
                <label class="form-label">種類</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input
                      v-model="excretionType"
                      type="radio"
                      value="URINE"
                      class="radio-input"
                    />
                    <span class="radio-text">💧 おしっこ</span>
                  </label>
                  <label class="radio-label">
                    <input
                      v-model="excretionType"
                      type="radio"
                      value="FECES"
                      class="radio-input"
                    />
                    <span class="radio-text">💩 うんち</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">時刻</label>
                <input v-model="excretionTime" type="time" class="form-input" />
              </div>

              <div class="form-actions">
                <button
                  type="button"
                  class="btn btn--secondary"
                  @click="handleClose"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  class="btn btn--primary"
                  :disabled="isSaving"
                  @click="saveExcretion"
                >
                  {{ isSaving ? '保存中...' : '排泄を記録' }}
                </button>
              </div>
            </div>

            <!-- Medication Tab -->
            <div v-if="activeTab === 'medication'" class="tab-panel">
              <div class="form-group">
                <label class="form-label">頓服薬</label>
                <select
                  v-model="selectedMedicationId"
                  class="form-select"
                  :disabled="isLoadingMedications"
                >
                  <option :value="null">
                    {{
                      isLoadingMedications
                        ? '読み込み中...'
                        : '頓服薬を選択してください'
                    }}
                  </option>
                  <option
                    v-for="med in medications"
                    :key="med.id"
                    :value="med.id"
                  >
                    {{ med.name }}
                    {{ med.dosage ? `(${med.dosage})` : '' }}
                  </option>
                </select>
              </div>

              <div class="form-actions">
                <button
                  type="button"
                  class="btn btn--secondary"
                  @click="handleClose"
                >
                  キャンセル
                </button>
                <button
                  v-if="dayData?.hasEmergencyMedication"
                  type="button"
                  class="btn btn--danger"
                  :disabled="isDeleting"
                  @click="deleteMedication"
                >
                  {{ isDeleting ? '削除中...' : '削除' }}
                </button>
                <button
                  type="button"
                  class="btn btn--primary"
                  :disabled="isSaving || !selectedMedicationId"
                  @click="saveMedication"
                >
                  {{ isSaving ? '保存中...' : '頓服薬を保存' }}
                </button>
              </div>
            </div>

            <!-- Memo Tab -->
            <div v-if="activeTab === 'memo'" class="tab-panel">
              <div class="form-group">
                <label class="form-label">メモ・特記事項</label>
                <textarea
                  v-model="memo"
                  class="form-textarea"
                  rows="6"
                  placeholder="この日の特記事項やメモを入力してください..."
                />
              </div>

              <div class="form-actions">
                <button
                  type="button"
                  class="btn btn--secondary"
                  @click="handleClose"
                >
                  キャンセル
                </button>
                <button
                  v-if="dayData?.hasMemo"
                  type="button"
                  class="btn btn--danger"
                  :disabled="isDeleting"
                  @click="deleteMemo"
                >
                  {{ isDeleting ? '削除中...' : '削除' }}
                </button>
                <button
                  type="button"
                  class="btn btn--primary"
                  :disabled="isSaving"
                  @click="saveMemo"
                >
                  {{ isSaving ? '保存中...' : 'メモを保存' }}
                </button>
              </div>
            </div>

            <!-- Health Signal Tab -->
            <div v-if="activeTab === 'signal'" class="tab-panel">
              <div class="form-group">
                <label class="form-label">健康シグナルカラー *</label>
                <div class="signal-color-buttons">
                  <button
                    type="button"
                    class="signal-button signal-button--prismatic"
                    :class="{
                      'signal-button--active': signalColor === 'PRISMATIC',
                    }"
                    @click="signalColor = 'PRISMATIC'"
                  >
                    <span class="signal-icon">✨</span>
                    <span class="signal-text">最高</span>
                  </button>
                  <button
                    type="button"
                    class="signal-button signal-button--green"
                    :class="{
                      'signal-button--active': signalColor === 'GREEN',
                    }"
                    @click="signalColor = 'GREEN'"
                  >
                    <span class="signal-icon">🟢</span>
                    <span class="signal-text">正常</span>
                  </button>
                  <button
                    type="button"
                    class="signal-button signal-button--yellow"
                    :class="{
                      'signal-button--active': signalColor === 'YELLOW',
                    }"
                    @click="signalColor = 'YELLOW'"
                  >
                    <span class="signal-icon">🟡</span>
                    <span class="signal-text">注意</span>
                  </button>
                  <button
                    type="button"
                    class="signal-button signal-button--red"
                    :class="{ 'signal-button--active': signalColor === 'RED' }"
                    @click="signalColor = 'RED'"
                  >
                    <span class="signal-icon">🔴</span>
                    <span class="signal-text">警告</span>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">補足メモ</label>
                <textarea
                  v-model="signalNote"
                  class="form-textarea"
                  rows="4"
                  placeholder="気になる症状や詳細を記録してください..."
                />
              </div>

              <div class="form-actions">
                <button
                  type="button"
                  class="btn btn--secondary"
                  @click="handleClose"
                >
                  キャンセル
                </button>
                <button
                  v-if="dayData?.signalColor"
                  type="button"
                  class="btn btn--danger"
                  :disabled="isDeleting"
                  @click="deleteHealthSignal"
                >
                  {{ isDeleting ? '削除中...' : '削除' }}
                </button>
                <button
                  type="button"
                  class="btn btn--primary"
                  :disabled="isSaving || !signalColor"
                  @click="saveHealthSignal"
                >
                  {{ isSaving ? '保存中...' : '健康シグナルを保存' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

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

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  color: #666;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #e0e0e0;
  color: #333;
}

.cat-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.cat-label {
  font-weight: 600;
  color: #666;
}

.cat-select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.tabs {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background: #f8f9fa;
}

.tab {
  flex: 1;
  padding: 1rem;
  border: none;
  background: transparent;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
}

.tab:hover {
  background: #e8f5e9;
  color: #4caf50;
}

.tab--active {
  color: #4caf50;
  border-bottom-color: #4caf50;
  background: white;
}

.tab-content {
  padding: 2rem;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.form-input,
.form-select,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.food-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #e8f5e9;
  border-radius: 4px;
}

.food-info-text {
  color: #2e7d32;
  font-size: 0.9rem;
  font-weight: 500;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-label:hover {
  border-color: #4caf50;
  background: #e8f5e9;
}

.radio-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-input:checked + .radio-text {
  font-weight: 600;
  color: #4caf50;
}

.radio-text {
  font-size: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.checkbox-label:hover {
  background: #e8f5e9;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

/* Signal Color Buttons */
.signal-color-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.signal-button {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1rem;
  border: 3px solid transparent;
  border-radius: 12px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.3s ease;
}

.signal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Prismatic Button */
@keyframes rainbow-flow-button {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.signal-button--prismatic {
  border: 3px solid transparent;
  border-image: linear-gradient(
      90deg,
      #ff0000,
      #ff9a00,
      #d0de21,
      #4fdc4a,
      #3fdad8,
      #2fc9e2,
      #1c7fee,
      #5f15f2,
      #ba0cf8,
      #fb07d9,
      #ff0000
    )
    1;
  position: relative;
  overflow: hidden;
}

.signal-button--prismatic:hover {
  background: linear-gradient(
    90deg,
    rgba(255, 0, 0, 0.1) 0%,
    rgba(255, 154, 0, 0.1) 14%,
    rgba(208, 222, 33, 0.1) 28%,
    rgba(79, 220, 74, 0.1) 42%,
    rgba(47, 201, 226, 0.1) 56%,
    rgba(95, 21, 242, 0.1) 70%,
    rgba(186, 12, 248, 0.1) 84%,
    rgba(255, 0, 0, 0.1) 100%
  );
  background-size: 200% 100%;
  animation: rainbow-flow-button 3s ease infinite;
  box-shadow: 0 4px 20px rgba(186, 12, 248, 0.3);
}

.signal-button--prismatic.signal-button--active {
  background: linear-gradient(
    90deg,
    rgba(255, 0, 0, 0.2) 0%,
    rgba(255, 154, 0, 0.2) 10%,
    rgba(208, 222, 33, 0.2) 20%,
    rgba(79, 220, 74, 0.2) 30%,
    rgba(63, 218, 216, 0.2) 40%,
    rgba(47, 201, 226, 0.2) 50%,
    rgba(28, 127, 238, 0.2) 60%,
    rgba(95, 21, 242, 0.2) 70%,
    rgba(186, 12, 248, 0.2) 80%,
    rgba(251, 7, 217, 0.2) 90%,
    rgba(255, 0, 0, 0.2) 100%
  );
  background-size: 200% 100%;
  animation: rainbow-flow-button 3s ease infinite;
  box-shadow:
    0 0 0 4px rgba(186, 12, 248, 0.2),
    0 0 20px rgba(186, 12, 248, 0.3);
}

.signal-button--green {
  border-color: rgba(76, 175, 80, 0.3);
}

.signal-button--green:hover {
  background: rgba(76, 175, 80, 0.1);
  border-color: #4caf50;
}

.signal-button--green.signal-button--active {
  background: linear-gradient(
    135deg,
    rgba(76, 175, 80, 0.2) 0%,
    rgba(129, 199, 132, 0.15) 100%
  );
  border-color: #4caf50;
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.1);
}

.signal-button--yellow {
  border-color: rgba(255, 193, 7, 0.3);
}

.signal-button--yellow:hover {
  background: rgba(255, 193, 7, 0.15);
  border-color: #ffc107;
}

.signal-button--yellow.signal-button--active {
  background: linear-gradient(
    135deg,
    rgba(255, 193, 7, 0.25) 0%,
    rgba(255, 224, 130, 0.2) 100%
  );
  border-color: #ffc107;
  box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.1);
}

.signal-button--red {
  border-color: rgba(244, 67, 54, 0.3);
}

.signal-button--red:hover {
  background: rgba(244, 67, 54, 0.1);
  border-color: #f44336;
}

.signal-button--red.signal-button--active {
  background: linear-gradient(
    135deg,
    rgba(244, 67, 54, 0.2) 0%,
    rgba(239, 154, 154, 0.15) 100%
  );
  border-color: #f44336;
  box-shadow: 0 0 0 4px rgba(244, 67, 54, 0.1);
}

.signal-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.signal-text {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.checkbox-text {
  font-size: 1rem;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background-color: #4caf50;
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: #45a049;
}

.btn--secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn--secondary:hover {
  background-color: #e0e0e0;
}

.btn--danger {
  background-color: #f44336;
  color: white;
}

.btn--danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .modal-container {
    max-width: 100%;
    max-height: 85vh;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .modal-header {
    padding: 1.25rem 1.5rem;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .cat-selector {
    padding: 1rem 1.5rem;
    flex-direction: column;
    align-items: stretch;
  }

  .tabs {
    overflow-x: auto;
  }

  .tab {
    padding: 0.75rem 0.5rem;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .tab-content {
    padding: 1.5rem;
  }

  .radio-group {
    flex-direction: column;
  }

  /* スマホ用: 健康シグナルボタンを横一列に */
  .signal-color-buttons {
    flex-wrap: nowrap;
    gap: 0.5rem;
  }

  .signal-button {
    min-width: 60px;
    flex: 1;
    padding: 0.75rem 0.25rem;
    gap: 0.25rem;
  }

  .signal-icon {
    font-size: 1.5rem;
  }

  .signal-text {
    font-size: 0.75rem;
  }

  /* スマホ用: アクションボタンを小さく */
  .btn {
    padding: 0.625rem 1rem;
    font-size: 0.9rem;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-container,
  .modal-leave-active .modal-container {
    transition: none;
  }
}
</style>
