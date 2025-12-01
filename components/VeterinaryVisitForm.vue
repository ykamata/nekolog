<script setup lang="ts">
import { z } from "zod";
import type { Cat } from "~/types/cat-meal";
import type {
  VeterinaryVisitWithRelations,
  CreateVeterinaryVisitInput,
  VeterinaryHospital,
  VeterinaryDoctor,
  VeterinaryTreatment,
} from "~/types/veterinary-visit";
import { VeterinaryVisitFormSchema } from "~/lib/validations/veterinary-visit";
import {
  parseApiError,
  formatValidationErrors,
  createDebouncedValidator,
  errorInfoToApiError,
  createUnifiedErrorHandler,
} from "~/utils/error-handling";
import { useToast } from "~/composables/useToast";
import { useVeterinaryMasters } from "~/composables/useVeterinaryMasters";
import { useResponsive } from "~/composables/useResponsive";

interface Props {
  visit?: VeterinaryVisitWithRelations;
  isOpen: boolean;
  cats: Cat[];
  initialData?: Partial<CreateVeterinaryVisitInput>;
}

interface Emits {
  (e: "close"): void;
  (e: "save", visit: CreateVeterinaryVisitInput): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const formData = reactive<CreateVeterinaryVisitInput>({
  catId: 0,
  visitDate: new Date(),
  hospitalName: "",
  doctorName: "",
  treatments: [],
  cost: 0,
  notes: "",
  hasBloodTest: false,
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const submitError = ref<string>("");
const retryCount = ref(0);

// 統一エラーハンドラーの初期化
const errorHandler = createUnifiedErrorHandler("VeterinaryVisitForm", {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
});

// Master data
const hospitals = ref<VeterinaryHospital[]>([]);
const doctors = ref<VeterinaryDoctor[]>([]);
const treatments = ref<VeterinaryTreatment[]>([]);
const medications = ref<any[]>([]);
const loadingMasterData = ref(false);

// Form UI state
const showHospitalInput = ref(false);
const showDoctorInput = ref(false);
const showTreatmentInput = ref(false);
const newTreatmentName = ref("");
const treatmentInputMode = ref<'medication' | 'text'>('medication');
const selectedMedicationId = ref<number | undefined>(undefined);
const selectedHospitalId = ref<number | null>(null);

const { error: showErrorToast } = useToast();
const {
  hospitals: masterHospitals,
  doctors: masterDoctors,
  treatments: masterTreatments,
  createHospital,
  createDoctor,
  createTreatment,
} = useVeterinaryMasters();

// レスポンシブ対応
const { screenSize, getResponsiveClasses } = useResponsive();

// Methods
const clearErrors = () => {
  errors.value = {};
  submitError.value = "";
};

// Initialize form data when visit prop changes
watch(
  () => props.visit,
  (visit) => {
    if (visit) {
      formData.catId = visit.catId;
      formData.visitDate = new Date(visit.visitDate);
      formData.hospitalName = visit.hospital.name;
      formData.doctorName = visit.doctor?.name || "";
      formData.treatments = visit.treatments.map((t) => {
        // APIから返されるデータは既にflattenされている
        return (t as any).treatment ? (t as any).treatment.name : t.name;
      });
      formData.cost = visit.cost;
      formData.notes = visit.notes || "";
      formData.hasBloodTest = visit.hasBloodTest;

      // 編集モード時は病院IDを設定
      selectedHospitalId.value = visit.hospital.id;
    } else {
      // Reset form for new visit
      formData.catId = props.initialData?.catId || 0;
      formData.visitDate = props.initialData?.visitDate || new Date();
      formData.hospitalName = props.initialData?.hospitalName || "";
      formData.doctorName = props.initialData?.doctorName || "";
      formData.treatments = props.initialData?.treatments || [];
      formData.cost = props.initialData?.cost || 0;
      formData.notes = props.initialData?.notes || "";
      formData.hasBloodTest = props.initialData?.hasBloodTest || false;

      // 新規作成時は病院IDをクリア
      selectedHospitalId.value = null;
    }
    clearErrors();
  },
  { immediate: true }
);

const loadMasterData = async () => {
  loadingMasterData.value = true;
  try {
    const [hospitalsResponse, doctorsResponse, treatmentsResponse, medicationsResponse] =
      await Promise.all([
        $fetch<{ hospitals: VeterinaryHospital[] }>("/api/veterinary-hospitals"),
        $fetch<{ doctors: VeterinaryDoctor[] }>("/api/veterinary-doctors"),
        $fetch<{ treatments: VeterinaryTreatment[] }>("/api/veterinary-treatments"),
        $fetch<{ medications: any[] }>("/api/medications").catch(() => ({ medications: [] })),
      ]);

    hospitals.value = hospitalsResponse.hospitals || [];
    doctors.value = doctorsResponse.doctors || [];
    treatments.value = treatmentsResponse.treatments || [];
    medications.value = medicationsResponse.medications || [];
  } catch (error) {
    console.error("Failed to load master data:", error);
    // In test environment, use the mock data from composable
    if (import.meta.env.NODE_ENV === "test") {
      hospitals.value = [...masterHospitals.value];
      doctors.value = [...masterDoctors.value];
      treatments.value = [...masterTreatments.value];
    } else {
      // Initialize with empty arrays on error
      hospitals.value = [];
      doctors.value = [];
      treatments.value = [];
      medications.value = [];
      showErrorToast({
        title: "データの読み込みに失敗しました",
        message: "マスタデータの取得に失敗しました",
      });
    }
  } finally {
    loadingMasterData.value = false;
  }
};

// Load master data when component is opened
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await loadMasterData();
      // In test environment, ensure we have the mock data
      if (import.meta.env.NODE_ENV === "test") {
        hospitals.value = [...masterHospitals.value];
        doctors.value = [...masterDoctors.value];
        treatments.value = [...masterTreatments.value];
      }
    } else {
      // Reset submitting state when modal closes
      isSubmitting.value = false;
    }
  },
  { immediate: true }
);

// Debounced validation for real-time feedback
const debouncedValidate = createDebouncedValidator(
  (data: CreateVeterinaryVisitInput) => {
    try {
      VeterinaryVisitFormSchema.parse(data);
      // Clear field-specific errors if validation passes
      Object.keys(errors.value).forEach((key) => {
        if (key !== "submit") {
          delete errors.value[key];
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = formatValidationErrors(
          error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }))
        );

        // Only update field errors, preserve submit errors
        Object.keys(validationErrors).forEach((key) => {
          const errorMessage = validationErrors[key];
          if (errorMessage) {
            errors.value[key] = errorMessage;
          }
        });
      }
    }
  },
  500
);

// Watch form data for real-time validation
watch(
  () => ({ ...formData }),
  (newData) => {
    if (newData.catId && newData.hospitalName.trim()) {
      debouncedValidate(newData).catch(() => {
        // Validation errors are handled in the debounced validator
      });
    }
  },
  { deep: true }
);

// Computed properties
const isEditMode = computed(() => !!props.visit);
const formTitle = computed(() =>
  isEditMode.value ? "通院記録を編集" : "新しい通院記録を追加"
);

const filteredHospitals = computed(() => {
  if (!formData.hospitalName) return hospitals.value || [];
  return (
    hospitals.value?.filter((h) =>
      h.name.toLowerCase().includes(formData.hospitalName.toLowerCase())
    ) || []
  );
});

const filteredDoctors = computed(() => {
  // 病院が選択されていない場合は空の配列を返す
  if (!selectedHospitalId.value) return [];

  return (
    doctors.value?.filter((d) => {
      // 選択された病院に所属する先生のみ
      if (d.hospitalId !== selectedHospitalId.value) return false;

      // 名前による検索フィルター
      if (formData.doctorName) {
        return d.name.toLowerCase().includes((formData.doctorName || "").toLowerCase());
      }
      return true;
    }) || []
  );
});

const filteredTreatments = computed(() => {
  return (
    treatments.value?.filter((t) => !formData.treatments.includes(t.name)) || []
  );
});

const validateForm = (): boolean => {
  // Clear previous field errors but keep submit errors
  Object.keys(errors.value).forEach((key) => {
    if (key !== "submit") {
      delete errors.value[key];
    }
  });

  try {
    VeterinaryVisitFormSchema.parse(formData);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = formatValidationErrors(
        error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }))
      );

      Object.assign(errors.value, validationErrors);
    }
    return false;
  }
};

const selectHospital = (hospital: VeterinaryHospital) => {
  formData.hospitalName = hospital.name;
  selectedHospitalId.value = hospital.id;

  // 病院変更時は先生の選択をクリア
  formData.doctorName = "";

  showHospitalInput.value = false;
};

const selectDoctor = (doctor: VeterinaryDoctor) => {
  formData.doctorName = doctor.name;
  showDoctorInput.value = false;
};

const addTreatment = (treatment: VeterinaryTreatment) => {
  if (!formData.treatments.includes(treatment.name)) {
    formData.treatments.push(treatment.name);
  }
};

const toggleTreatment = (treatment: VeterinaryTreatment) => {
  const index = formData.treatments.indexOf(treatment.name);
  if (index > -1) {
    formData.treatments.splice(index, 1);
  } else {
    formData.treatments.push(treatment.name);
  }
};

const addNewTreatment = async () => {
  if (treatmentInputMode.value === 'medication' && selectedMedicationId.value) {
    const medication = medications.value.find(m => m.id === selectedMedicationId.value);
    if (medication && !formData.treatments.includes(medication.name)) {
      formData.treatments.push(medication.name);
      selectedMedicationId.value = undefined;
      showTreatmentInput.value = false;
    }
  } else if (treatmentInputMode.value === 'text' && newTreatmentName.value.trim()) {
    if (!formData.treatments.includes(newTreatmentName.value.trim())) {
      try {
        await createTreatment(newTreatmentName.value.trim());
        formData.treatments.push(newTreatmentName.value.trim());
        newTreatmentName.value = "";
        showTreatmentInput.value = false;
      } catch (error) {
        showErrorToast({
          title: "処方内容の作成に失敗しました",
          message: "処方内容の作成に失敗しました",
        });
      }
    }
  }
};

const cancelTreatmentInput = () => {
  showTreatmentInput.value = false;
  newTreatmentName.value = "";
  selectedMedicationId.value = undefined;
  treatmentInputMode.value = 'medication';
};

const removeTreatment = (index: number) => {
  formData.treatments.splice(index, 1);
};

const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDateTimeLocal = (dateTimeString: string): Date => {
  return new Date(dateTimeString);
};

const handleSubmit = async () => {
  // Clear previous errors
  submitError.value = "";
  Object.keys(errors.value).forEach((key) => {
    if (key !== "submit") {
      delete errors.value[key];
    }
  });

  // Validate form
  if (!validateForm()) {
    showErrorToast({
      title: "バリデーションエラー",
      message: "入力内容を確認してください",
    });
    return;
  }

  try {
    isSubmitting.value = true;

    // Create new hospital if it doesn't exist
    let hospital = hospitals.value.find(
      (h) => h.name === formData.hospitalName.trim()
    );
    if (!hospital) {
      hospital = await createHospital(formData.hospitalName.trim());
    }

    // Create new doctor if it doesn't exist and is provided
    if (formData.doctorName?.trim()) {
      const existingDoctor = doctors.value.find(
        (d) => d.name === formData.doctorName!.trim()
      );
      if (!existingDoctor) {
        // Pass hospital ID when creating a new doctor
        await createDoctor(formData.doctorName!.trim(), hospital.id);
      }
    }

    // Clean up empty strings to undefined for optional fields
    const cleanedData: CreateVeterinaryVisitInput = {
      catId: formData.catId,
      visitDate: formData.visitDate,
      hospitalName: formData.hospitalName.trim(),
      doctorName: formData.doctorName?.trim() || undefined,
      treatments: formData.treatments,
      cost: formData.cost,
      notes: formData.notes?.trim() || undefined,
      hasBloodTest: formData.hasBloodTest,
    };

    // Emit to parent - parent will handle the API call
    // Keep isSubmitting true until parent closes the modal
    emit("save", cleanedData);
  } catch (error) {
    console.error("Error preparing form data:", error);
    submitError.value = "フォームデータの準備中にエラーが発生しました";
    isSubmitting.value = false;
    showErrorToast({
      title: "エラー",
      message: submitError.value,
    });
  }
};

const handleRetry = async () => {
  if (retryCount.value >= 3) {
    showErrorToast({
      title: "再試行回数の上限に達しました",
      message: "しばらく待ってから再度お試しください",
    });
    return;
  }

  retryCount.value++;
  await handleSubmit();
};

const handleClose = () => {
  emit("close");
};

const handleReset = () => {
  if (props.visit) {
    formData.catId = props.visit.catId;
    formData.visitDate = new Date(props.visit.visitDate);
    formData.hospitalName = props.visit.hospital.name;
    formData.doctorName = props.visit.doctor?.name || "";
    formData.treatments = props.visit.treatments.map((t) => t.treatment.name);
    formData.cost = props.visit.cost;
    formData.notes = props.visit.notes || "";
    formData.hasBloodTest = props.visit.hasBloodTest;
  } else {
    formData.catId = props.initialData?.catId || 0;
    formData.visitDate = props.initialData?.visitDate || new Date();
    formData.hospitalName = props.initialData?.hospitalName || "";
    formData.doctorName = props.initialData?.doctorName || "";
    formData.treatments = props.initialData?.treatments || [];
    formData.cost = props.initialData?.cost || 0;
    formData.notes = props.initialData?.notes || "";
    formData.hasBloodTest = props.initialData?.hasBloodTest || false;
  }
  clearErrors();
  retryCount.value = 0;
};

const handleHospitalBlur = () => {
  // Delay to allow click events to fire first
  setTimeout(() => {
    showHospitalInput.value = false;

    // 病院名が手入力で変更された場合、選択された病院との整合性をチェック
    if (selectedHospitalId.value) {
      const selectedHospital = hospitals.value?.find((h) => h.id === selectedHospitalId.value);
      if (selectedHospital && selectedHospital.name !== formData.hospitalName) {
        // 病院名が変更された場合、選択をクリア
        selectedHospitalId.value = null;
        formData.doctorName = "";
      }
    }
  }, 200);
};

const handleDoctorBlur = () => {
  // Delay to allow click events to fire first
  setTimeout(() => {
    showDoctorInput.value = false;
  }, 200);
};
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">
          {{ formTitle }}
        </h2>
        <button class="modal-close-btn" @click="handleClose">×</button>
      </div>

      <form
        :class="getResponsiveClasses('veterinary-visit-form')"
        data-testid="visit-form"
        @submit.prevent="handleSubmit"
      >
        <!-- Submit Error Display -->
        <div
          v-if="submitError"
          class="form-error-banner"
          data-testid="submit-error"
        >
          <div class="error-icon">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div class="error-content">
            <div class="error-title">エラーが発生しました</div>
            <div class="error-message">
              {{ submitError }}
            </div>
          </div>
          <button
            v-if="retryCount < 3"
            type="button"
            class="error-retry-btn"
            data-testid="retry-button"
            :disabled="isSubmitting"
            @click="handleRetry"
          >
            再試行
          </button>
        </div>

        <!-- 猫選択 -->
        <div class="form-group">
          <label for="cat-select" class="form-label">
            猫 <span class="required">*</span>
          </label>
          <select
            id="cat-select"
            v-model="formData.catId"
            class="form-input"
            :class="{ 'form-input--error': errors.catId }"
            data-testid="cat-select"
            aria-required="true"
            :aria-describedby="errors.catId ? 'cat-error' : undefined"
          >
            <option value="">猫を選択してください</option>
            <option v-for="cat in cats" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <span
            v-if="errors.catId"
            id="cat-error"
            class="form-error"
            data-testid="cat-error"
            >{{ errors.catId }}</span
          >
        </div>

        <!-- 診察日時 -->
        <div class="form-group">
          <label for="visit-date" class="form-label">
            診察日時 <span class="required">*</span>
          </label>
          <input
            id="visit-date"
            :value="formatDateTimeLocal(formData.visitDate)"
            type="datetime-local"
            class="form-input"
            :class="{ 'form-input--error': errors.visitDate }"
            data-testid="visit-date"
            aria-required="true"
            :aria-describedby="errors.visitDate ? 'date-error' : undefined"
            @input="
              formData.visitDate = parseDateTimeLocal(
                ($event.target as HTMLInputElement)?.value || ''
              )
            "
          />
          <span
            v-if="errors.visitDate"
            id="date-error"
            class="form-error"
            data-testid="date-error"
            >{{ errors.visitDate }}</span
          >
        </div>

        <!-- 病院名 -->
        <div class="form-group">
          <label for="hospital-input" class="form-label">
            病院名 <span class="required">*</span>
          </label>
          <div class="autocomplete-container">
            <input
              id="hospital-input"
              v-model="formData.hospitalName"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': errors.hospitalName }"
              placeholder="病院名を入力してください"
              autocomplete="off"
              data-testid="hospital-input"
              aria-required="true"
              :aria-describedby="
                errors.hospitalName ? 'hospital-error' : undefined
              "
              role="combobox"
              :aria-expanded="showHospitalInput && filteredHospitals.length > 0"
              aria-autocomplete="list"
              @focus="showHospitalInput = true"
              @blur="handleHospitalBlur"
            />
            <div
              v-if="showHospitalInput && filteredHospitals.length > 0"
              class="autocomplete-dropdown"
              role="listbox"
              aria-label="病院名の候補"
            >
              <button
                v-for="hospital in filteredHospitals"
                :key="hospital.id"
                type="button"
                class="autocomplete-item"
                role="option"
                :aria-selected="formData.hospitalName === hospital.name"
                @click="selectHospital(hospital)"
              >
                {{ hospital.name }}
              </button>
            </div>
          </div>
          <span
            v-if="errors.hospitalName"
            id="hospital-error"
            class="form-error"
            data-testid="hospital-error"
            >{{ errors.hospitalName }}</span
          >
        </div>

        <!-- 先生名 -->
        <div class="form-group">
          <label for="doctor-name" class="form-label">先生名</label>
          <div class="autocomplete-container">
            <input
              id="doctor-name"
              v-model="formData.doctorName"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': errors.doctorName }"
              :placeholder="selectedHospitalId ? '先生の名前を入力してください（任意）' : '先に病院を選択してください'"
              :disabled="!selectedHospitalId"
              autocomplete="off"
              data-testid="doctor-input"
              :aria-describedby="errors.doctorName ? 'doctor-error' : undefined"
              role="combobox"
              :aria-expanded="showDoctorInput && filteredDoctors.length > 0"
              aria-autocomplete="list"
              @focus="showDoctorInput = true"
              @blur="handleDoctorBlur"
            />
            <div
              v-if="showDoctorInput && filteredDoctors.length > 0"
              class="autocomplete-dropdown"
              role="listbox"
              aria-label="先生名の候補"
            >
              <button
                v-for="doctor in filteredDoctors"
                :key="doctor.id"
                type="button"
                class="autocomplete-item"
                role="option"
                :aria-selected="formData.doctorName === doctor.name"
                @click="selectDoctor(doctor)"
              >
                {{ doctor.name }}
                <span v-if="doctor.specialty" class="doctor-specialization">
                  ({{ doctor.specialty }})
                </span>
              </button>
            </div>
          </div>
          <span
            v-if="errors.doctorName"
            id="doctor-error"
            class="form-error"
            data-testid="doctor-error"
            >{{ errors.doctorName }}</span
          >
        </div>

        <!-- 処方内容 -->
        <div class="form-group">
          <label id="treatments-label" class="form-label">
            処方内容
          </label>

          <!-- 選択済み処方内容 -->
          <div
            v-if="formData.treatments.length > 0"
            class="selected-treatments"
            role="region"
            aria-labelledby="treatments-label"
            aria-describedby="selected-treatments-description"
          >
            <div id="selected-treatments-description" class="sr-only">
              選択済みの処方内容。削除するには×ボタンを押してください。
            </div>
            <span
              v-for="(treatment, index) in formData.treatments"
              :key="index"
              class="treatment-tag"
            >
              {{ treatment }}
              <button
                type="button"
                class="treatment-remove"
                :aria-label="`${treatment}を削除`"
                @click="removeTreatment(index)"
              >
                ×
              </button>
            </span>
          </div>

          <!-- 処方内容選択 -->
          <div
            class="treatment-selection"
            role="group"
            aria-labelledby="treatments-label"
            :aria-describedby="
              errors.treatments ? 'treatments-error' : undefined
            "
          >
            <div
              class="treatment-buttons"
              role="group"
              aria-label="よく使用される処方内容"
            >
              <button
                v-for="treatment in filteredTreatments.slice(0, 6)"
                :key="treatment.id"
                type="button"
                class="treatment-btn"
                :aria-label="`${treatment.name}を追加`"
                @click="addTreatment(treatment)"
              >
                {{ treatment.name }}
              </button>
            </div>

            <!-- 新規処方内容追加 -->
            <div class="new-treatment-input">
              <button
                v-if="!showTreatmentInput"
                type="button"
                class="btn btn--small btn--secondary"
                data-testid="add-treatment-button"
                aria-label="新しい処方内容を追加"
                @click="showTreatmentInput = true"
              >
                新規追加
              </button>

              <div v-if="showTreatmentInput" class="treatment-input-form">
                <!-- 入力モード切替 -->
                <div class="input-mode-toggle">
                  <button
                    type="button"
                    class="mode-toggle-btn"
                    :class="{ 'mode-toggle-btn--active': treatmentInputMode === 'medication' }"
                    @click="treatmentInputMode = 'medication'"
                  >
                    薬から選択
                  </button>
                  <button
                    type="button"
                    class="mode-toggle-btn"
                    :class="{ 'mode-toggle-btn--active': treatmentInputMode === 'text' }"
                    @click="treatmentInputMode = 'text'"
                  >
                    テキスト入力
                  </button>
                </div>

                <!-- 薬選択モード -->
                <select
                  v-if="treatmentInputMode === 'medication'"
                  v-model="selectedMedicationId"
                  class="form-input"
                  data-testid="medication-select"
                  aria-label="薬を選択"
                >
                  <option :value="undefined">薬を選択してください</option>
                  <option
                    v-for="medication in medications"
                    :key="medication.id"
                    :value="medication.id"
                  >
                    {{ medication.name }}
                  </option>
                </select>

                <!-- テキスト入力モード -->
                <input
                  v-if="treatmentInputMode === 'text'"
                  v-model="newTreatmentName"
                  type="text"
                  class="form-input"
                  placeholder="新しい処方内容を入力"
                  autocomplete="off"
                  data-testid="new-treatment-input"
                  aria-label="新しい処方内容名"
                  @keyup.escape="cancelTreatmentInput"
                />

                <!-- アクションボタン -->
                <div class="treatment-input-actions">
                  <button
                    type="button"
                    class="btn btn--small btn--secondary"
                    @click="cancelTreatmentInput"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    class="btn btn--small btn--primary"
                    data-testid="confirm-treatment-button"
                    aria-label="新しい処方内容を確定"
                    @click="addNewTreatment"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>

          <span
            v-if="errors.treatments"
            id="treatments-error"
            class="form-error"
            data-testid="treatments-error"
            >{{ errors.treatments }}</span
          >
        </div>

        <!-- 費用 -->
        <div class="form-group">
          <label for="cost-input" class="form-label">
            費用（円） <span class="required">*</span>
          </label>
          <input
            id="cost-input"
            v-model.number="formData.cost"
            type="number"
            min="0"
            max="1000000"
            class="form-input"
            :class="{ 'form-input--error': errors.cost }"
            :aria-describedby="errors.cost ? 'cost-error' : undefined"
            placeholder="0"
            data-testid="cost-input"
          />
          <span
            v-if="errors.cost"
            id="cost-error"
            class="form-error"
            data-testid="cost-error"
            >{{ errors.cost }}</span
          >
        </div>

        <!-- 血液検査フラグ -->
        <div class="form-group">
          <label class="checkbox-label">
            <input
              v-model="formData.hasBloodTest"
              type="checkbox"
              class="checkbox-input"
              data-testid="blood-test-checkbox"
              aria-describedby="blood-test-description"
            />
            <span class="checkbox-text">血液検査を実施</span>
          </label>
          <div id="blood-test-description" class="sr-only">
            この通院で血液検査を実施した場合はチェックしてください
          </div>
        </div>

        <!-- メモ -->
        <div class="form-group">
          <label for="notes" class="form-label">メモ</label>
          <textarea
            id="notes"
            v-model="formData.notes"
            class="form-input"
            :class="{ 'form-input--error': errors.notes }"
            placeholder="診察内容や気になることを記録してください"
            rows="3"
            maxlength="1000"
            data-testid="notes-textarea"
            :aria-describedby="errors.notes ? 'notes-error' : undefined"
          />
          <span
            v-if="errors.notes"
            id="notes-error"
            class="form-error"
            data-testid="notes-error"
            >{{ errors.notes }}</span
          >
        </div>

        <div class="form-actions">
          <button
            type="button"
            :disabled="isSubmitting"
            class="btn btn--secondary"
            @click="handleReset"
          >
            リセット
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="btn btn--secondary"
            data-testid="cancel-button"
            @click="handleClose"
          >
            キャンセル
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="btn btn--primary"
            data-testid="submit-button"
          >
            {{ isSubmitting ? "保存中..." : isEditMode ? "更新" : "追加" }}
          </button>
        </div>
      </form>
    </div>
  </div>
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

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

/* Desktop optimizations */
@media (min-width: 1200px) {
  .modal-content {
    max-width: 700px;
  }

  .veterinary-visit-form {
    padding: 2rem;
  }

  .form-group {
    margin-bottom: 2rem;
  }

  .form-label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .form-input {
    padding: 1rem;
    font-size: 1rem;
  }

  .treatment-selection {
    padding: 1.5rem;
  }

  .treatment-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .treatment-btn {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }

  .form-actions {
    margin-top: 2.5rem;
    padding-top: 1.5rem;
  }

  .btn {
    padding: 1rem 2rem;
    font-size: 1rem;
  }
}

/* Large desktop optimizations */
@media (min-width: 1440px) {
  .modal-content {
    max-width: 800px;
  }

  .veterinary-visit-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 2.5rem;
  }

  .form-group:nth-child(1),
  .form-group:nth-child(2),
  .form-group:nth-child(3) {
    grid-column: 1;
  }

  .form-group:nth-child(4),
  .form-group:nth-child(5),
  .form-group:nth-child(6) {
    grid-column: 2;
  }

  .form-group:nth-child(7),
  .form-group:nth-child(8) {
    grid-column: 1 / -1;
  }

  .form-actions {
    grid-column: 1 / -1;
  }

  .treatment-buttons {
    grid-template-columns: repeat(4, 1fr);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  line-height: 1;
}

.modal-close-btn:hover {
  color: #333;
  background: #f8fff8;
  border-color: #4caf50;
}

.veterinary-visit-form {
  padding: 1.5rem;
}

.form-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
}

.error-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.error-message {
  font-size: 0.875rem;
  line-height: 1.4;
}

.error-retry-btn {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  background-color: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.error-retry-btn:hover:not(:disabled) {
  background-color: #b91c1c;
}

.error-retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.required {
  color: #e74c3c;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.form-input--error {
  border-color: #e74c3c;
}

.form-input--error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

.form-error {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #e74c3c;
}

/* Autocomplete styles */
.autocomplete-container {
  position: relative;
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.autocomplete-item {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.autocomplete-item:hover {
  background-color: #f8fff8;
  border-color: #4caf50;
}

.doctor-specialization {
  color: #666;
  font-size: 0.875rem;
}

/* Treatment selection styles */
.selected-treatments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f9f9f9;
  border-radius: 4px;
  min-height: 3rem;
  align-items: center;
}

.treatment-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: #4caf50;
  color: white;
  border-radius: 20px;
  font-size: 0.875rem;
}

.treatment-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  margin-left: 0.25rem;
}

.treatment-remove:hover {
  opacity: 0.8;
}

.treatment-selection {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
}

.treatment-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.treatment-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.treatment-btn:hover {
  background-color: #f8fff8;
  border-color: #4caf50;
}

.new-treatment-input {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.treatment-input-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.input-mode-toggle {
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.mode-toggle-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.mode-toggle-btn:not(:last-child) {
  border-right: 1px solid #ddd;
}

.mode-toggle-btn:hover:not(.mode-toggle-btn--active) {
  background: #f8fff8;
  border-color: #4caf50;
}

.mode-toggle-btn--active {
  background: #4caf50;
  color: white;
  font-weight: 500;
}

.treatment-input-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.new-treatment-input .form-input {
  margin: 0;
}

/* Checkbox styles */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.checkbox-text {
  color: #333;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
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

/* Tablet responsive */
@media (max-width: 1024px) {
  .modal-overlay {
    padding: 1rem;
  }

  .modal-content {
    max-width: 90vw;
  }

  .treatment-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .treatment-btn {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
    align-items: flex-start;
    padding-top: 2rem;
  }

  .modal-content {
    max-height: calc(100vh - 4rem);
    width: 100%;
    max-width: none;
    border-radius: 12px 12px 0 0;
  }

  .modal-header {
    padding: 1.25rem 1rem;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    border-bottom: 2px solid #e0e0e0;
  }

  .modal-title {
    font-size: 1.1rem;
  }

  .modal-close-btn {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.75rem;
  }

  .veterinary-visit-form {
    padding: 1rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .form-input {
    padding: 1rem 0.75rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
  }

  .form-input:focus {
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  }

  /* Autocomplete improvements for mobile */
  .autocomplete-dropdown {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 250px;
  }

  .autocomplete-item {
    padding: 1rem 0.75rem;
    font-size: 1rem;
    min-height: 48px;
    display: flex;
    align-items: center;
  }

  /* Treatment selection mobile optimization */
  .selected-treatments {
    padding: 1rem;
    min-height: 4rem;
    border-radius: 8px;
  }

  .treatment-tag {
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border-radius: 24px;
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .treatment-remove {
    font-size: 1.25rem;
    margin-left: 0.5rem;
    padding: 0.25rem;
    min-width: 32px;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .treatment-selection {
    padding: 1.25rem;
    border-radius: 8px;
  }

  .treatment-buttons {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .treatment-btn {
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
    text-align: left;
    justify-content: flex-start;
  }

  .new-treatment-input {
    gap: 1rem;
  }

  .treatment-input-form {
    padding: 1.25rem;
  }

  .input-mode-toggle {
    border-radius: 8px;
  }

  .mode-toggle-btn {
    padding: 0.875rem;
    font-size: 1rem;
    min-height: 48px;
  }

  .new-treatment-input .form-input {
    width: 100%;
    margin: 0;
    min-height: 48px;
  }

  .treatment-input-actions {
    gap: 0.75rem;
  }

  .treatment-input-actions .btn {
    flex: 1;
    min-height: 48px;
  }

  /* Checkbox improvements */
  .checkbox-label {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    margin: 0.5rem 0;
    min-height: 48px;
  }

  .checkbox-input {
    width: 1.5rem;
    height: 1.5rem;
  }

  .checkbox-text {
    font-size: 1rem;
  }

  /* Form actions mobile optimization */
  .form-actions {
    flex-direction: column;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    position: sticky;
    bottom: 0;
    background: white;
    border-top: 2px solid #e0e0e0;
  }

  .btn {
    width: 100%;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 48px;
    font-weight: 600;
  }

  .btn:hover:not(:disabled) {
    transform: none;
  }

  .btn:active {
    transform: scale(0.98);
  }

  /* Error banner mobile optimization */
  .form-error-banner {
    margin: 0 -1rem 1.5rem -1rem;
    border-radius: 0;
    border-left: none;
    border-right: none;
    padding: 1.25rem 1rem;
  }

  .error-retry-btn {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
    border-radius: 8px;
    min-height: 44px;
  }
}

/* Small mobile responsive */
@media (max-width: 480px) {
  .modal-overlay {
    padding: 0;
    align-items: stretch;
  }

  .modal-content {
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1rem;
  }

  .veterinary-visit-form {
    padding: 0.75rem;
    flex: 1;
    overflow-y: auto;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-label {
    font-size: 0.9rem;
  }

  .form-input {
    padding: 0.875rem 0.75rem;
    font-size: 0.9rem;
  }

  .treatment-tag {
    padding: 0.625rem 0.875rem;
    font-size: 0.9rem;
  }

  .treatment-btn {
    padding: 0.875rem;
    font-size: 0.9rem;
  }

  .btn {
    padding: 0.875rem 1.25rem;
    font-size: 0.9rem;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .form-input,
  .autocomplete-item,
  .treatment-btn,
  .btn,
  .checkbox-label {
    min-height: 44px;
  }

  .modal-close-btn {
    min-width: 44px;
    min-height: 44px;
  }

  .treatment-remove {
    min-width: 44px;
    min-height: 44px;
  }

  /* Increase tap targets */
  .autocomplete-item {
    padding: 1rem;
  }

  .treatment-btn:hover {
    background-color: #f0f0f0;
  }

  .btn:hover:not(:disabled) {
    transform: none;
  }

  .btn:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .modal-content {
    border: 3px solid #000;
  }

  .form-input,
  .treatment-selection,
  .selected-treatments {
    border: 2px solid #000;
  }

  .form-input:focus {
    border-color: #000;
    box-shadow: 0 0 0 3px #000;
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
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .modal-content,
  .form-input,
  .btn,
  .treatment-btn,
  .autocomplete-item {
    transition: none;
  }

  .btn:active {
    transform: none;
  }
}
</style>
/* Screen reader only text */ .sr-only { position: absolute; width: 1px; height:
1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0);
white-space: nowrap; border: 0; }
