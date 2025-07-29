<script setup lang="ts">
// TypeScript interfaces for component props and emits
interface InputValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  customValidator?: (value: string | number) => boolean;
}

interface InputError {
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'min'
    | 'max'
    | 'custom';
  message: string;
}

// Define props with TypeScript validation
interface Props {
  modelValue: string | number;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea';
  placeholder?: string;
  name?: string;
  id?: string;
  validation?: InputValidation;
  errorMessages?: Record<string, string>;
  disabled?: boolean;
  readonly?: boolean;
  autofocus?: boolean;
  rows?: number;
  cols?: number;
}

// Define emits with TypeScript
interface Emits {
  (e: 'update:modelValue', value: string | number): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
  (e: 'input', event: Event): void;
  (e: 'change', event: Event): void;
  (e: 'validation', isValid: boolean, errors: InputError[]): void;
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  name: '',
  id: '',
  disabled: false,
  readonly: false,
  autofocus: false,
  rows: 3,
  cols: 30,
  validation: () => ({}),
  errorMessages: () => ({
    required: 'This field is required',
    minLength: 'Input is too short',
    maxLength: 'Input is too long',
    pattern: 'Input format is invalid',
    min: 'Value is too small',
    max: 'Value is too large',
    custom: 'Input is invalid',
  }),
});

// Define emits
const emit = defineEmits<Emits>();

// Reactive state
const inputValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const isFocused = ref(false);
const isDirty = ref(false);
const errors = ref<InputError[]>([]);

// Computed properties
const inputId = computed(
  () =>
    props.id
    || `input-${props.name || Math.random().toString(36).substring(2, 9)}`,
);

const isValid = computed(() => errors.value.length === 0);

const inputClasses = computed(() => {
  return {
    'form-input': true,
    'form-input--invalid': !isValid.value && isDirty.value,
    'form-input--valid': isValid.value && isDirty.value,
    'form-input--focused': isFocused.value,
    'form-input--disabled': props.disabled,
    'form-input--readonly': props.readonly,
  };
});

// Methods
const validate = (): boolean => {
  const newErrors: InputError[] = [];
  const value = inputValue.value;
  const validation = props.validation || {};

  // Required validation
  if (validation.required && (!value || value === '')) {
    newErrors.push({
      type: 'required',
      message: props.errorMessages.required || 'This field is required',
    });
  }

  // Only continue validation if there's a value
  if (value !== undefined && value !== null && value !== '') {
    // String validations (only apply to string values)
    if (typeof value === 'string') {
      // Min length validation
      if (
        validation.minLength !== undefined
        && value.length < validation.minLength
      ) {
        newErrors.push({
          type: 'minLength',
          message:
            props.errorMessages.minLength
            || `Minimum length is ${validation.minLength} characters`,
        });
      }

      // Max length validation
      if (
        validation.maxLength !== undefined
        && value.length > validation.maxLength
      ) {
        newErrors.push({
          type: 'maxLength',
          message:
            props.errorMessages.maxLength
            || `Maximum length is ${validation.maxLength} characters`,
        });
      }

      // Pattern validation
      if (validation.pattern && !validation.pattern.test(value)) {
        newErrors.push({
          type: 'pattern',
          message: props.errorMessages.pattern || 'Input format is invalid',
        });
      }
    }

    // Number validations (only apply to number values or string that can be converted to numbers)
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(numValue)) {
      // Min value validation
      if (validation.min !== undefined && numValue < validation.min) {
        newErrors.push({
          type: 'min',
          message:
            props.errorMessages.min || `Minimum value is ${validation.min}`,
        });
      }

      // Max value validation
      if (validation.max !== undefined && numValue > validation.max) {
        newErrors.push({
          type: 'max',
          message:
            props.errorMessages.max || `Maximum value is ${validation.max}`,
        });
      }
    }

    // Custom validator
    if (validation.customValidator && !validation.customValidator(value)) {
      newErrors.push({
        type: 'custom',
        message: props.errorMessages.custom || 'Input is invalid',
      });
    }
  }

  errors.value = newErrors;
  emit('validation', isValid.value, newErrors);
  return isValid.value;
};

// Event handlers
const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  inputValue.value
    = props.type === 'number' ? parseFloat(target.value) : target.value;
  isDirty.value = true;
  validate();
  emit('input', event);
};

const handleChange = (event: Event): void => {
  validate();
  emit('change', event);
};

const handleFocus = (event: FocusEvent): void => {
  isFocused.value = true;
  emit('focus', event);
};

const handleBlur = (event: FocusEvent): void => {
  isFocused.value = false;
  isDirty.value = true;
  validate();
  emit('blur', event);
};

// Lifecycle hooks
onMounted(() => {
  // Initial validation if there's a value
  if (
    props.modelValue !== undefined
    && props.modelValue !== null
    && props.modelValue !== ''
  ) {
    isDirty.value = true;
    validate();
  }
});

// Watch for external value changes
watch(
  () => props.modelValue,
  () => {
    if (isDirty.value) {
      validate();
    }
  },
);
</script>

<template>
  <div class="form-field">
    <label
      v-if="label"
      :for="inputId"
      class="form-label"
    >
      {{ label }}
      <span
        v-if="validation?.required"
        class="form-label__required"
      >*</span>
    </label>

    <template v-if="type === 'textarea'">
      <textarea
        :id="inputId"
        :name="name"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :autofocus="autofocus"
        :rows="rows"
        :cols="cols"
        :class="inputClasses"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </template>
    <template v-else>
      <input
        :id="inputId"
        :type="type"
        :name="name"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :autofocus="autofocus"
        :class="inputClasses"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
      >
    </template>

    <div
      v-if="errors.length > 0 && isDirty"
      class="form-errors"
    >
      <p
        v-for="(error, index) in errors"
        :key="index"
        class="form-error"
      >
        {{ error.message }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.form-field {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.form-label__required {
  color: #e53935;
  margin-left: 0.25rem;
}

.form-input,
input,
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: #fff;
  color: #333;
}

.form-input:focus,
input:focus,
textarea:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-input--invalid,
input.form-input--invalid,
textarea.form-input--invalid {
  border-color: #e53935;
}

.form-input--invalid:focus,
input.form-input--invalid:focus,
textarea.form-input--invalid:focus {
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.1);
}

.form-input--valid,
input.form-input--valid,
textarea.form-input--valid {
  border-color: #4caf50;
}

.form-input--disabled,
input.form-input--disabled,
textarea.form-input--disabled,
.form-input--readonly,
input.form-input--readonly,
textarea.form-input--readonly {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.form-errors {
  margin-top: 0.5rem;
}

.form-error {
  color: #e53935;
  font-size: 0.8rem;
  margin: 0.25rem 0;
}
</style>
