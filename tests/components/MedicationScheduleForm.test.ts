import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MedicationScheduleForm from '~/components/MedicationScheduleForm.vue';
import type { MedicationSchedule, Medication } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Mock the stores
const mockCatsStore = {
  sortedCats: [
    { id: 'cat-1', name: 'ミケ' },
    { id: 'cat-2', name: 'タマ' },
  ] as Cat[],
  fetchCats: vi.fn().mockResolvedValue([]),
};

const mockMedicationsStore = {
  sortedMedications: [
    { id: 'med-1', name: '薬A', type: 'MEDICINE' },
    { id: 'med-2', name: 'サプリB', type: 'SUPPLEMENT' },
  ] as Medication[],
  fetchMedications: vi.fn().mockResolvedValue([]),
};

// Mock the composables globally
vi.stubGlobal('useCatsStore', () => mockCatsStore);
vi.stubGlobal('useMedicationsStore', () => mockMedicationsStore);

// Mock DateTimePicker component
const DateTimePickerMock = {
  name: 'DateTimePicker',
  props: ['value', 'showTime', 'minDate'],
  emits: ['change'],
  template: '<div data-testid="datetime-picker" @click="$emit(\'change\', new Date())">DateTimePicker</div>',
};

describe('MedicationScheduleForm', () => {
  let wrapper: any;
  let pinia: unknown;

  const defaultProps = {
    isOpen: true,
  };

  const mockSchedule: MedicationSchedule = {
    id: 'schedule-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    frequency: 'daily',
    times: ['08:00'],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  const createWrapper = (props = {}) => {
    return mount(MedicationScheduleForm, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [pinia],
        components: {
          DateTimePicker: DateTimePickerMock,
        },
      },
    });
  };

  describe('Component Rendering', () => {
    it('renders correctly when open', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-title').text()).toBe('新しいスケジュールを追加');
    });

    it('does not render when closed', () => {
      wrapper = createWrapper({ isOpen: false });
      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });

    it('shows edit mode title when editing', () => {
      wrapper = createWrapper({ schedule: mockSchedule });
      expect(wrapper.find('.modal-title').text()).toBe('スケジュールを編集');
    });
  });

  describe('Form Fields', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('renders all required form fields', () => {
      expect(wrapper.find('#schedule-cat').exists()).toBe(true);
      expect(wrapper.find('#schedule-medication').exists()).toBe(true);
      expect(wrapper.find('#schedule-frequency').exists()).toBe(true);
      expect(wrapper.find('[data-testid="datetime-picker"]').exists()).toBe(true);
    });

    it('populates cat options correctly', () => {
      const catSelect = wrapper.find('#schedule-cat');
      const options = catSelect.findAll('option');

      expect(options).toHaveLength(3); // Including placeholder option
      expect(options[1].text()).toBe('ミケ');
      expect(options[2].text()).toBe('タマ');
    });

    it('populates medication options correctly', () => {
      const medicationSelect = wrapper.find('#schedule-medication');
      const options = medicationSelect.findAll('option');

      expect(options).toHaveLength(3); // Including placeholder option
      expect(options[1].text()).toBe('薬A (MEDICINE)');
      expect(options[2].text()).toBe('サプリB (SUPPLEMENT)');
    });

    it('populates frequency options correctly', () => {
      const frequencySelect = wrapper.find('#schedule-frequency');
      const options = frequencySelect.findAll('option');

      expect(options).toHaveLength(5);
      expect(options[0].text()).toBe('毎日');
      expect(options[1].text()).toBe('1日2回');
      expect(options[2].text()).toBe('週1回');
      expect(options[3].text()).toBe('月1回');
      expect(options[4].text()).toBe('カスタム');
    });
  });

  describe('Form Initialization', () => {
    it('initializes with default values for new schedule', () => {
      wrapper = createWrapper();

      expect(wrapper.vm.formData.catId).toBe('');
      expect(wrapper.vm.formData.medicationId).toBe('');
      expect(wrapper.vm.formData.frequency).toBe('daily');
      expect(wrapper.vm.formData.times).toEqual(['08:00']);
      expect(wrapper.vm.formData.endDate).toBeUndefined();
    });

    it('initializes with schedule data when editing', () => {
      wrapper = createWrapper({ schedule: mockSchedule });

      expect(wrapper.vm.formData.catId).toBe('cat-1');
      expect(wrapper.vm.formData.medicationId).toBe('med-1');
      expect(wrapper.vm.formData.frequency).toBe('daily');
      expect(wrapper.vm.formData.times).toEqual(['08:00']);
      expect(wrapper.vm.formData.startDate).toEqual(new Date('2024-01-01'));
      expect(wrapper.vm.formData.endDate).toEqual(new Date('2024-12-31'));
    });
  });

  describe('Time Slot Management', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('allows adding time slots', async () => {
      const addButton = wrapper.find('.btn--secondary');
      await addButton.trigger('click');

      expect(wrapper.vm.formData.times).toHaveLength(2);
      expect(wrapper.vm.formData.times[1]).toBe('08:00');
    });

    it('allows removing time slots', async () => {
      // Add a second time slot first
      wrapper.vm.formData.times.push('20:00');
      await wrapper.vm.$nextTick();

      const removeButton = wrapper.find('.btn--danger');
      await removeButton.trigger('click');

      expect(wrapper.vm.formData.times).toHaveLength(1);
    });

    it('prevents removing the last time slot', () => {
      expect(wrapper.vm.formData.times).toHaveLength(1);
      const removeButtons = wrapper.findAll('.btn--danger');
      expect(removeButtons).toHaveLength(0); // No remove button when only one time slot
    });

    it('limits maximum time slots to 10', async () => {
      // Add 9 more time slots (total 10)
      for (let i = 0; i < 9; i++) {
        wrapper.vm.formData.times.push('08:00');
      }
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.formData.times).toHaveLength(10);

      // Add button should not be visible when at max capacity
      const addButtons = wrapper.findAll('.btn--secondary');
      const addTimeButton = addButtons.find(btn => btn.text().includes('時間を追加'));
      expect(addTimeButton).toBeUndefined();
    });
  });

  describe('Frequency Changes', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('updates default times when frequency changes', async () => {
      const frequencySelect = wrapper.find('#schedule-frequency');
      await frequencySelect.setValue('twice_daily');

      expect(wrapper.vm.formData.times).toEqual(['08:00', '20:00']);
    });

    it('does not update times in edit mode', async () => {
      wrapper = createWrapper({ schedule: mockSchedule });

      const frequencySelect = wrapper.find('#schedule-frequency');
      await frequencySelect.setValue('twice_daily');

      // Should keep original times in edit mode
      expect(wrapper.vm.formData.times).toEqual(['08:00']);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('validates required fields', async () => {
      const form = wrapper.find('.schedule-form');
      await form.trigger('submit.prevent');

      expect(wrapper.vm.errors.catId).toBeTruthy();
      expect(wrapper.vm.errors.medicationId).toBeTruthy();
    });

    it('validates time format', async () => {
      wrapper.vm.formData.catId = 'cat-1';
      wrapper.vm.formData.medicationId = 'med-1';
      wrapper.vm.formData.times = ['invalid-time'];

      const form = wrapper.find('.schedule-form');
      await form.trigger('submit.prevent');

      expect(wrapper.vm.errors.times).toBeTruthy();
    });

    it('validates end date is after start date', async () => {
      wrapper.vm.formData.catId = 'cat-1';
      wrapper.vm.formData.medicationId = 'med-1';
      wrapper.vm.formData.startDate = new Date('2024-01-02');
      wrapper.vm.formData.endDate = new Date('2024-01-01');

      const form = wrapper.find('.schedule-form');
      await form.trigger('submit.prevent');

      expect(wrapper.vm.errors.endDate).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('emits save event with valid data', async () => {
      wrapper.vm.formData.catId = 'cat-1';
      wrapper.vm.formData.medicationId = 'med-1';
      wrapper.vm.formData.frequency = 'daily';
      wrapper.vm.formData.times = ['08:00'];
      wrapper.vm.formData.startDate = new Date('2024-01-01');

      const form = wrapper.find('.schedule-form');
      await form.trigger('submit.prevent');

      expect(wrapper.emitted('save')).toBeTruthy();
      const saveEvent = wrapper.emitted('save')[0][0];
      expect(saveEvent.catId).toBe('cat-1');
      expect(saveEvent.medicationId).toBe('med-1');
      expect(saveEvent.frequency).toBe('daily');
      expect(saveEvent.times).toEqual(['08:00']);
    });

    it('does not emit save event with invalid data', async () => {
      const form = wrapper.find('.schedule-form');
      await form.trigger('submit.prevent');

      expect(wrapper.emitted('save')).toBeFalsy();
    });
  });

  describe('Modal Actions', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('emits close event when close button is clicked', async () => {
      const closeButton = wrapper.find('.modal-close-btn');
      await closeButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('emits close event when cancel button is clicked', async () => {
      const cancelButton = wrapper.findAll('.btn--secondary').find(btn =>
        btn.text() === 'キャンセル',
      );
      await cancelButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('emits close event when overlay is clicked', async () => {
      const overlay = wrapper.find('.modal-overlay');
      await overlay.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('Reset Functionality', () => {
    it('resets form to original values in edit mode', async () => {
      wrapper = createWrapper({ schedule: mockSchedule });

      // Modify form data
      wrapper.vm.formData.catId = 'cat-2';
      wrapper.vm.formData.frequency = 'twice_daily';

      const resetButton = wrapper.findAll('.btn--secondary').find(btn =>
        btn.text() === 'リセット',
      );
      await resetButton.trigger('click');

      expect(wrapper.vm.formData.catId).toBe('cat-1');
      expect(wrapper.vm.formData.frequency).toBe('daily');
    });

    it('resets form to default values in create mode', async () => {
      wrapper = createWrapper();

      // Modify form data
      wrapper.vm.formData.catId = 'cat-1';
      wrapper.vm.formData.frequency = 'twice_daily';

      const resetButton = wrapper.findAll('.btn--secondary').find(btn =>
        btn.text() === 'リセット',
      );
      await resetButton.trigger('click');

      expect(wrapper.vm.formData.catId).toBe('');
      expect(wrapper.vm.formData.frequency).toBe('daily');
    });
  });

  describe('End Date Handling', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('toggles end date with checkbox', async () => {
      const checkbox = wrapper.find('input[type="checkbox"]');

      // Initially unlimited (checked)
      expect(checkbox.element.checked).toBe(true);
      expect(wrapper.vm.formData.endDate).toBeUndefined();

      // Uncheck to set end date
      await checkbox.setChecked(false);
      expect(wrapper.vm.formData.endDate).toBeDefined();

      // Check again to make unlimited
      await checkbox.setChecked(true);
      expect(wrapper.vm.formData.endDate).toBeUndefined();
    });
  });

  describe('Data Loading', () => {
    it('loads cats and medications on mount', () => {
      wrapper = createWrapper();

      expect(mockCatsStore.fetchCats).toHaveBeenCalled();
      expect(mockMedicationsStore.fetchMedications).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('has proper labels for form fields', () => {
      expect(wrapper.find('label[for="schedule-cat"]').exists()).toBe(true);
      expect(wrapper.find('label[for="schedule-medication"]').exists()).toBe(true);
      expect(wrapper.find('label[for="schedule-frequency"]').exists()).toBe(true);
    });

    it('marks required fields with asterisk', () => {
      const requiredSpans = wrapper.findAll('.required');
      expect(requiredSpans).toHaveLength(5); // cat, medication, frequency, times, start date
    });

    it('shows error messages for invalid fields', async () => {
      const form = wrapper.find('.schedule-form');
      await form.trigger('submit.prevent');

      const errorMessages = wrapper.findAll('.form-error');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});
