<template>
  <div class="veterinary-hospital-form">
    <!-- フォームヘッダー -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-2">
        {{ formTitle }}
      </h2>
      <p class="text-sm text-gray-600">
        {{ isEditMode ? '病院情報を編集してください' : '新しい病院を登録してください' }}
      </p>
    </div>

    <!-- エラー表示 -->
    <div
      v-if="submitError"
      class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md"
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
            {{ submitError }}
          </p>
        </div>
      </div>
    </div>

    <!-- フォーム -->
    <form
      class="space-y-6"
      @submit.prevent="handleSubmit"
    >
      <!-- 病院名 -->
      <div>
        <label
          for="name"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          病院名 <span class="text-red-500">*</span>
        </label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          required
          :class="[
            'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            errors.name ? 'border-red-300' : 'border-gray-300',
          ]"
          placeholder="病院名を入力してください"
          @blur="validateField('name')"
        >
        <p
          v-if="errors.name"
          class="mt-1 text-sm text-red-600"
        >
          {{ errors.name }}
        </p>
      </div>

      <!-- 住所 -->
      <div>
        <label
          for="address"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          住所
        </label>
        <input
          id="address"
          v-model="formData.address"
          type="text"
          :class="[
            'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            errors.address ? 'border-red-300' : 'border-gray-300',
          ]"
          placeholder="住所を入力してください"
          @blur="validateField('address')"
        >
        <p
          v-if="errors.address"
          class="mt-1 text-sm text-red-600"
        >
          {{ errors.address }}
        </p>
      </div>

      <!-- 電話番号 -->
      <div>
        <label
          for="phone"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          電話番号
        </label>
        <input
          id="phone"
          v-model="formData.phone"
          type="tel"
          :class="[
            'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            errors.phone ? 'border-red-300' : 'border-gray-300',
          ]"
          placeholder="電話番号を入力してください"
          @blur="validateField('phone')"
        >
        <p
          v-if="errors.phone"
          class="mt-1 text-sm text-red-600"
        >
          {{ errors.phone }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          数字、ハイフン、括弧のみ使用できます
        </p>
      </div>

      <!-- メモ -->
      <div>
        <label
          for="memo"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          メモ
        </label>
        <textarea
          id="memo"
          v-model="formData.memo"
          rows="3"
          :class="[
            'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            errors.memo ? 'border-red-300' : 'border-gray-300',
          ]"
          placeholder="メモを入力してください"
          @blur="validateField('memo')"
        />
        <p
          v-if="errors.memo"
          class="mt-1 text-sm text-red-600"
        >
          {{ errors.memo }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          {{ formData.memo?.length || 0 }}/500文字
        </p>
      </div>

      <!-- ボタン -->
      <div class="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          :disabled="isSubmitting || !isFormValid"
          :class="[
            'flex-1 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
            isSubmitting || !isFormValid
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
          ]"
        >
          <span
            v-if="isSubmitting"
            class="flex items-center justify-center"
          >
            <svg
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            保存中...
          </span>
          <span v-else>
            {{ isEditMode ? '更新' : '登録' }}
          </span>
        </button>

        <button
          type="button"
          :disabled="isSubmitting"
          class="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleCancel"
        >
          キャンセル
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { VeterinaryHospital, VeterinaryHospitalInput } from '~/types/veterinary-master';
import { veterinaryHospitalSchema, VETERINARY_ERROR_MESSAGES } from '~/lib/validations/veterinary-master';

// Props
interface Props {
  hospital?: VeterinaryHospital;
  mode: 'create' | 'edit';
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
});

// Emits
interface Emits {
  save: [hospital: VeterinaryHospitalInput];
  cancel: [];
}

const emit = defineEmits<Emits>();

// リアクティブデータ
const formData = ref<VeterinaryHospitalInput>({
  name: '',
  address: '',
  phone: '',
  memo: '',
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);

// エラーハンドリング用
const { parseError, formatValidationErrors } = useVeterinaryMasterError();

// 計算プロパティ
const isEditMode = computed(() => props.mode === 'edit');
const formTitle = computed(() => isEditMode.value ? '病院情報編集' : '病院登録');

const isFormValid = computed(() => {
  return formData.value.name.trim().length > 0 && Object.keys(errors.value).length === 0;
});

// フォームデータの初期化
const initializeForm = () => {
  if (props.hospital && isEditMode.value) {
    formData.value = {
      name: props.hospital.name,
      address: props.hospital.address || '',
      phone: props.hospital.phone || '',
      memo: props.hospital.memo || '',
    };
  }
  else {
    formData.value = {
      name: '',
      address: '',
      phone: '',
      memo: '',
    };
  }
  errors.value = {};
  submitError.value = null;
};

// バリデーション
const validateField = (field: keyof VeterinaryHospitalInput) => {
  try {
    const fieldSchema = veterinaryHospitalSchema.pick({ [field]: true });
    fieldSchema.parse({ [field]: formData.value[field] });
    delete errors.value[field];
  }
  catch (error: any) {
    if (error.errors && error.errors[0]) {
      errors.value[field] = error.errors[0].message;
    }
  }
};

const validateForm = () => {
  try {
    veterinaryHospitalSchema.parse(formData.value);
    errors.value = {};
    return true;
  }
  catch (error: any) {
    const newErrors: Record<string, string> = {};
    if (error.errors) {
      error.errors.forEach((err: any) => {
        if (err.path && err.path[0]) {
          newErrors[err.path[0]] = err.message;
        }
      });
    }
    errors.value = newErrors;

    // 最初のエラーをsubmitErrorにも設定
    const firstError = Object.values(newErrors)[0];
    if (firstError) {
      submitError.value = firstError;
    }

    return false;
  }
};

// イベントハンドラー
const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;
  submitError.value = null;

  try {
    // 空文字をundefinedに変換
    const cleanedData: VeterinaryHospitalInput = {
      name: formData.value.name.trim(),
      address: formData.value.address?.trim() || undefined,
      phone: formData.value.phone?.trim() || undefined,
      memo: formData.value.memo?.trim() || undefined,
    };

    emit('save', cleanedData);
  }
  catch (error: any) {
    submitError.value = error.message || '保存に失敗しました';
  }
  finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
};

// ウォッチャー
watch(() => props.hospital, initializeForm, { immediate: true });
watch(() => props.mode, initializeForm);

// 初期化
onMounted(() => {
  initializeForm();
});
</script>

<style scoped>
.veterinary-hospital-form {
  @apply max-w-2xl mx-auto;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .veterinary-hospital-form {
    @apply px-4;
  }
}
</style>
