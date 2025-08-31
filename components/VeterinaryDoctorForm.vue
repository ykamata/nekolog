<template>
  <div class="veterinary-doctor-form">
    <!-- フォームヘッダー -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-2">
        {{ formTitle }}
      </h2>
      <p class="text-sm text-gray-600">
        {{ isEditMode ? '先生情報を編集してください' : '新しい先生を登録してください' }}
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
      <!-- 先生名 -->
      <div>
        <label
          for="name"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          先生名 <span class="text-red-500">*</span>
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
          placeholder="先生名を入力してください"
          @blur="validateField('name')"
        >
        <p
          v-if="errors.name"
          class="mt-1 text-sm text-red-600"
        >
          {{ errors.name }}
        </p>
      </div>

      <!-- 所属病院 -->
      <div>
        <label
          for="hospitalId"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          所属病院
        </label>
        <select
          id="hospitalId"
          v-model="formData.hospitalId"
          :class="[
            'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            errors.hospitalId ? 'border-red-300' : 'border-gray-300',
          ]"
          @blur="validateField('hospitalId')"
        >
          <option value="">
            病院を選択してください
          </option>
          <option
            v-for="hospital in hospitals"
            :key="hospital.id"
            :value="hospital.id"
          >
            {{ hospital.name }}
          </option>
        </select>
        <p
          v-if="errors.hospitalId"
          class="mt-1 text-sm text-red-600"
        >
          {{ errors.hospitalId }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          所属病院を選択しない場合は空欄のままにしてください
        </p>
      </div>

      <!-- 専門分野 -->
      <div>
        <label
          for="specialization"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          専門分野
        </label>
        <input
          id="specialization"
          v-model="formData.specialization"
          type="text"
          :class="[
            'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            errors.specialization ? 'border-red-300' : 'border-gray-300',
          ]"
          placeholder="専門分野を入力してください"
          @blur="validateField('specialization')"
        >
        <p
          v-if="errors.specialization"
          class="mt-1 text-sm text-red-600"
        >
          {{ errors.specialization }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          例: 内科、外科、皮膚科など
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
import type { VeterinaryDoctor, VeterinaryDoctorInput, VeterinaryHospital } from '~/types/veterinary-master';
import { VeterinaryDoctorInputSchema } from '~/lib/validations/veterinary-visit';

// Props
interface Props {
  doctor?: VeterinaryDoctor;
  mode: 'create' | 'edit';
  preselectedHospitalId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
});

// Emits
interface Emits {
  save: [doctor: VeterinaryDoctorInput];
  cancel: [];
}

const emit = defineEmits<Emits>();

// 病院一覧を取得
const { hospitals, fetchHospitals } = useVeterinaryHospitals();

// リアクティブデータ
const formData = ref<VeterinaryDoctorInput>({
  name: '',
  hospitalId: '',
  specialization: '',
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);

// 計算プロパティ
const isEditMode = computed(() => props.mode === 'edit');
const formTitle = computed(() => isEditMode.value ? '先生情報編集' : '先生登録');

const isFormValid = computed(() => {
  return formData.value.name.trim().length > 0 && Object.keys(errors.value).length === 0;
});

// フォームデータの初期化
const initializeForm = () => {
  if (props.doctor && isEditMode.value) {
    formData.value = {
      name: props.doctor.name,
      hospitalId: props.doctor.hospitalId || '',
      specialization: props.doctor.specialization || '',
    };
  }
  else {
    formData.value = {
      name: '',
      hospitalId: props.preselectedHospitalId || '',
      specialization: '',
    };
  }
  errors.value = {};
  submitError.value = null;
};

// バリデーション
const validateField = (field: keyof VeterinaryDoctorInput) => {
  try {
    const fieldSchema = VeterinaryDoctorInputSchema.pick({ [field]: true });
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
    VeterinaryDoctorInputSchema.parse(formData.value);
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
    const cleanedData: VeterinaryDoctorInput = {
      name: formData.value.name.trim(),
      hospitalId: formData.value.hospitalId?.trim() || undefined,
      specialization: formData.value.specialization?.trim() || undefined,
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
watch(() => props.doctor, initializeForm, { immediate: true });
watch(() => props.mode, initializeForm);
watch(() => props.preselectedHospitalId, (newHospitalId) => {
  if (!isEditMode.value && newHospitalId) {
    formData.value.hospitalId = newHospitalId;
  }
});

// 初期化
onMounted(async () => {
  // 病院一覧を取得
  await fetchHospitals();
  initializeForm();
});
</script>

<style scoped>
.veterinary-doctor-form {
  @apply max-w-2xl mx-auto;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .veterinary-doctor-form {
    @apply px-4;
  }
}
</style>
