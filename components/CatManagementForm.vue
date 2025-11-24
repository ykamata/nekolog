<script setup lang="ts">
import { z } from 'zod';
import type { Cat, CatInput } from '~/types/cat-meal';
import { CatInputSchema } from '~/lib/validations/cat-meal';

interface Props {
  cat?: Cat;
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', cat: CatInput): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Form state
const formData = reactive<CatInput>({
  name: '',
  birthdate: null,
  weight: null,
  photoUrl: null,
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const isUploading = ref(false);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);

// Initialize form data when cat prop changes
watch(
  () => props.cat,
  (cat) => {
    if (cat) {
      formData.name = cat.name;
      formData.birthdate = cat.birthdate;
      formData.weight = cat.weight;
      formData.photoUrl = cat.photoUrl || null;
      previewUrl.value = cat.photoUrl || null;
    }
    else {
      // Reset form for new cat
      formData.name = '';
      formData.birthdate = null;
      formData.weight = null;
      formData.photoUrl = null;
      previewUrl.value = null;
    }
    errors.value = {};
    selectedFile.value = null;
  },
  { immediate: true },
);

// Computed properties
const isEditMode = computed(() => !!props.cat);
const formTitle = computed(() =>
  isEditMode.value ? '猫の情報を編集' : '新しい猫を追加',
);

// Methods
const validateForm = (): boolean => {
  errors.value = {};

  try {
    CatInputSchema.parse(formData);
    return true;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          errors.value[err.path[0] as string] = err.message;
        }
      });
    }
    return false;
  }
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    // 選択されたファイルがある場合はアップロード
    let photoUrl = formData.photoUrl?.trim() || null;

    if (selectedFile.value) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        photoUrl = uploadedUrl;
      }
      else {
        // アップロードに失敗した場合は処理を中断
        return;
      }
    }

    // Ensure proper data formatting before emitting
    const submitData: CatInput = {
      name: formData.name.trim(),
      birthdate: formData.birthdate,
      weight: formData.weight,
      photoUrl,
    };

    // eslint-disable-next-line no-console
    console.log('🐱 CatManagementForm - Submit data:', JSON.stringify(submitData, null, 2));
    emit('save', submitData);
  }
  finally {
    isSubmitting.value = false;
  }
};

const handleClose = () => {
  emit('close');
};

const handleReset = () => {
  if (props.cat) {
    formData.name = props.cat.name;
    formData.birthdate = props.cat.birthdate;
    formData.weight = props.cat.weight;
    formData.photoUrl = props.cat.photoUrl || null;
    previewUrl.value = props.cat.photoUrl || null;
  }
  else {
    formData.name = '';
    formData.birthdate = null;
    formData.weight = null;
    formData.photoUrl = null;
    previewUrl.value = null;
  }
  errors.value = {};
  selectedFile.value = null;

  // file inputをクリア
  const fileInput = document.getElementById('cat-photo-file') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
};

// Format date for input
const formatDateForInput = (date?: Date | null): string => {
  if (!date) return '';
  return date?.toISOString().split('T')[0] || '';
};

const parseDateFromInput = (dateString: string): Date | null => {
  if (!dateString) return null;
  return new Date(dateString);
};

// Reactive date handling
const birthdateInput = computed({
  get: () => formatDateForInput(formData.birthdate),
  set: (value: string) => {
    formData.birthdate = parseDateFromInput(value);
  },
});

// ファイル選択時の処理
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    selectedFile.value = null;
    previewUrl.value = formData.photoUrl || null;
    return;
  }

  // ファイルタイプの検証
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.value.photoUrl = 'JPEG、PNG、GIF、WebP形式のみ対応しています';
    return;
  }

  // ファイルサイズの検証 (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.value.photoUrl = 'ファイルサイズは5MB以下にしてください';
    return;
  }

  selectedFile.value = file;
  errors.value.photoUrl = '';

  // プレビュー画像の生成
  const reader = new FileReader();
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

// 画像のアップロード
const uploadImage = async (): Promise<string | null> => {
  if (!selectedFile.value) {
    return null;
  }

  isUploading.value = true;

  try {
    const formData = new FormData();
    formData.append('image', selectedFile.value);

    const response = await $fetch<{ url: string }>('/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    // eslint-disable-next-line no-console
    console.log('📸 画像アップロード成功:', response.url);
    return response.url;
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error('画像アップロードエラー:', error);
    errors.value.photoUrl = '画像のアップロードに失敗しました';
    return null;
  }
  finally {
    isUploading.value = false;
  }
};

// 画像をクリア
const clearImage = () => {
  selectedFile.value = null;
  previewUrl.value = null;
  formData.photoUrl = null;
  errors.value.photoUrl = '';

  // file inputをクリア
  const fileInput = document.getElementById('cat-photo-file') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
};
</script>

<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    @click.self="handleClose"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">
          {{ formTitle }}
        </h2>
        <button
          class="modal-close-btn"
          @click="handleClose"
        >
          ×
        </button>
      </div>

      <form
        class="cat-form"
        @submit.prevent="handleSubmit"
      >
        <div class="form-group">
          <label
            for="cat-name"
            class="form-label"
          >
            猫の名前 <span class="required">*</span>
          </label>
          <input
            id="cat-name"
            v-model="formData.name"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': errors.name }"
            placeholder="猫の名前を入力してください"
            maxlength="50"
          >
          <span
            v-if="errors.name"
            class="form-error"
          >{{ errors.name }}</span>
        </div>

        <div class="form-group">
          <label
            for="cat-birthdate"
            class="form-label"
          >誕生日</label>
          <input
            id="cat-birthdate"
            v-model="birthdateInput"
            type="date"
            class="form-input"
            :class="{ 'form-input--error': errors.birthdate }"
          >
          <span
            v-if="errors.birthdate"
            class="form-error"
          >{{
            errors.birthdate
          }}</span>
        </div>

        <div class="form-group">
          <label
            for="cat-weight"
            class="form-label"
          >体重 (kg)</label>
          <input
            id="cat-weight"
            v-model.number="formData.weight"
            type="number"
            step="0.1"
            min="0"
            max="20"
            class="form-input"
            :class="{ 'form-input--error': errors.weight }"
            placeholder="例: 4.5"
          >
          <span
            v-if="errors.weight"
            class="form-error"
          >{{
            errors.weight
          }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">写真</label>

          <!-- 画像プレビュー -->
          <div
            v-if="previewUrl"
            class="image-preview"
          >
            <img
              :src="previewUrl"
              alt="猫の写真プレビュー"
              class="preview-image"
            >
            <button
              type="button"
              class="preview-clear-btn"
              @click="clearImage"
            >
              ✕
            </button>
          </div>

          <!-- ファイルアップロード -->
          <div class="upload-section">
            <label
              for="cat-photo-file"
              class="upload-label"
            >
              <span class="upload-icon">📷</span>
              <span class="upload-text">{{ selectedFile ? selectedFile.name : '画像ファイルを選択' }}</span>
            </label>
            <input
              id="cat-photo-file"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="file-input"
              @change="handleFileSelect"
            >
          </div>

          <!-- URL入力（オプション） -->
          <div class="url-section">
            <label
              for="cat-photo-url"
              class="form-label-small"
            >または画像URLを入力</label>
            <input
              id="cat-photo-url"
              v-model="formData.photoUrl"
              type="text"
              class="form-input"
              :class="{ 'form-input--error': errors.photoUrl }"
              placeholder="https://example.com/cat-photo.jpg または /uploads/cats/image.jpg"
            >
          </div>

          <span
            v-if="errors.photoUrl"
            class="form-error"
          >{{ errors.photoUrl }}</span>

          <p class="form-help">
            JPEG、PNG、GIF、WebP形式に対応（最大5MB）
          </p>
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
            @click="handleClose"
          >
            キャンセル
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || isUploading"
            class="btn btn--primary"
          >
            {{ isUploading ? "アップロード中..." : isSubmitting ? "保存中..." : isEditMode ? "更新" : "追加" }}
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
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
}

.cat-form {
  padding: 1.5rem;
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

.form-help {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.form-label-small {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
}

/* 画像プレビュー */
.image-preview {
  position: relative;
  width: 200px;
  height: 200px;
  margin-bottom: 1rem;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #ddd;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-clear-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 32px;
  height: 32px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.preview-clear-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

/* ファイルアップロード */
.upload-section {
  margin-bottom: 1rem;
}

.file-input {
  display: none;
}

.upload-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-label:hover {
  border-color: #4caf50;
  background-color: #f0f8f0;
}

.upload-icon {
  font-size: 2rem;
}

.upload-text {
  font-size: 0.9rem;
  color: #666;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* URL入力セクション */
.url-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
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

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-header,
  .cat-form {
    padding: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
