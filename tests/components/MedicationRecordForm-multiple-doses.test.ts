import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MedicationRecordForm from '~/components/MedicationRecordForm.vue';
import type { Medication } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';
import { MedicationType } from '~/types/medication';

// Mock DateTimePicker component
vi.mock('~/components/DateTimePicker.vue', () => ({
  default: {
    name: 'DateTimePicker',
    props: ['value'],
    emits: ['change'],
    template: '<input type="datetime-local" :value="value" @change="$emit(\'change\', $event.target.value)" />',
  },
}));

describe('MedicationRecordForm - Multiple Doses', () => {
  let pinia: ReturnType<typeof createPinia>;

  // Test data
  const mockCats: Cat[] = [
    {
      id: 1,
      name: 'みけ',
      birthdate: new Date('2020-01-01'),
      weight: 4.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockMedications: Medication[] = [
    {
      id: 1,
      name: 'テスト薬A',
      type: MedicationType.MEDICINE,
      description: 'テスト用の薬です',
      dosage: '1日1回',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('displays multiple doses toggle', () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    const multipleDosesCheckbox = wrapper.find('input[type="checkbox"]');
    expect(multipleDosesCheckbox.exists()).toBe(true);

    const label = wrapper.find('.checkbox-label');
    expect(label.text()).toContain('1日に複数回投与する');
  });

  it('shows time period configuration when multiple doses is enabled', async () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    // Enable multiple doses
    const multipleDosesCheckbox = wrapper.find('input[type="checkbox"]');
    await multipleDosesCheckbox.setValue(true);

    // Check if time period configuration is shown
    const timePeriodsConfig = wrapper.find('.multiple-doses-config');
    expect(timePeriodsConfig.exists()).toBe(true);

    // Check if all time periods are available
    const timePeriodLabels = wrapper.findAll('.time-period-config .checkbox-label');
    expect(timePeriodLabels).toHaveLength(3);
    expect(timePeriodLabels[0].text()).toContain('朝');
    expect(timePeriodLabels[1].text()).toContain('昼');
    expect(timePeriodLabels[2].text()).toContain('夜');
  });

  it('shows time and quantity inputs when time period is enabled', async () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    // Enable multiple doses
    const multipleDosesCheckbox = wrapper.find('input[type="checkbox"]');
    await multipleDosesCheckbox.setValue(true);

    // Enable morning period
    const morningCheckbox = wrapper.findAll('.time-period-config input[type="checkbox"]')[0];
    await morningCheckbox.setValue(true);

    // Check if time and quantity inputs are shown
    const timeConfig = wrapper.find('.time-config');
    expect(timeConfig.exists()).toBe(true);

    const timeInput = timeConfig.find('input[type="time"]');
    expect(timeInput.exists()).toBe(true);

    const quantityInput = timeConfig.find('input[type="number"]');
    expect(quantityInput.exists()).toBe(true);
  });

  it('hides single quantity input when multiple doses is enabled', async () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    // Initially, single quantity input should be visible
    let quantityInput = wrapper.find('#quantity-input');
    expect(quantityInput.exists()).toBe(true);

    // Enable multiple doses
    const multipleDosesCheckbox = wrapper.find('input[type="checkbox"]');
    await multipleDosesCheckbox.setValue(true);

    // Single quantity input should be hidden
    quantityInput = wrapper.find('#quantity-input');
    expect(quantityInput.exists()).toBe(false);
  });

  it('emits multiple save events for enabled time periods', async () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    // Fill in required fields
    await wrapper.find('#cat-select').setValue('cat-1');
    await wrapper.find('#medication-select').setValue(1);

    // Enable multiple doses
    const multipleDosesCheckbox = wrapper.find('input[type="checkbox"]');
    await multipleDosesCheckbox.setValue(true);

    // Enable morning and evening periods
    const timePeriodCheckboxes = wrapper.findAll('.time-period-config input[type="checkbox"]');
    await timePeriodCheckboxes[0].setValue(true); // Morning
    await timePeriodCheckboxes[2].setValue(true); // Evening

    // Set time and quantity for morning
    const morningTimeInput = wrapper.findAll('.time-config input[type="time"]')[0];
    const morningQuantityInput = wrapper.findAll('.time-config input[type="number"]')[0];
    await morningTimeInput.setValue('08:00');
    await morningQuantityInput.setValue(1);

    // Set time and quantity for evening
    const eveningTimeInput = wrapper.findAll('.time-config input[type="time"]')[1];
    const eveningQuantityInput = wrapper.findAll('.time-config input[type="number"]')[1];
    await eveningTimeInput.setValue('20:00');
    await eveningQuantityInput.setValue(2);

    // Submit form
    await wrapper.find('form').trigger('submit');

    // Check that multiple save events were emitted
    const saveEvents = wrapper.emitted('save');
    expect(saveEvents).toBeTruthy();
    expect(saveEvents).toHaveLength(2);

    // Check morning record
    const morningRecord = saveEvents![0][0] as any;
    expect(morningRecord.catId).toBe('cat-1');
    expect(morningRecord.medicationId).toBe(1);
    expect(morningRecord.quantity).toBe(1);
    expect(new Date(morningRecord.administeredAt).getHours()).toBe(8);

    // Check evening record
    const eveningRecord = saveEvents![1][0] as any;
    expect(eveningRecord.catId).toBe('cat-1');
    expect(eveningRecord.medicationId).toBe(1);
    expect(eveningRecord.quantity).toBe(2);
    expect(new Date(eveningRecord.administeredAt).getHours()).toBe(20);
  });

  it('emits single save event when multiple doses is disabled', async () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    // Fill in required fields
    await wrapper.find('#cat-select').setValue('cat-1');
    await wrapper.find('#medication-select').setValue(1);
    await wrapper.find('#quantity-input').setValue(3);

    // Submit form (multiple doses is disabled by default)
    await wrapper.find('form').trigger('submit');

    // Check that single save event was emitted
    const saveEvents = wrapper.emitted('save');
    expect(saveEvents).toBeTruthy();
    expect(saveEvents).toHaveLength(1);

    const record = saveEvents![0][0] as any;
    expect(record.catId).toBe('cat-1');
    expect(record.medicationId).toBe(1);
    expect(record.quantity).toBe(3);
  });

  it('validates that at least one time period is enabled in multiple doses mode', async () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    // Fill in required fields
    await wrapper.find('#cat-select').setValue('cat-1');
    await wrapper.find('#medication-select').setValue(1);

    // Enable multiple doses but don't enable any time periods
    const multipleDosesCheckbox = wrapper.find('input[type="checkbox"]');
    await multipleDosesCheckbox.setValue(true);

    // Submit form
    await wrapper.find('form').trigger('submit');

    // No save events should be emitted
    const saveEvents = wrapper.emitted('save');
    expect(saveEvents).toBeFalsy();
  });

  it('uses correct default times for time periods', async () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    // Enable multiple doses
    const multipleDosesCheckbox = wrapper.find('input[type="checkbox"]');
    await multipleDosesCheckbox.setValue(true);

    // Enable all time periods
    const timePeriodCheckboxes = wrapper.findAll('.time-period-config input[type="checkbox"]');
    await timePeriodCheckboxes[0].setValue(true); // Morning
    await timePeriodCheckboxes[1].setValue(true); // Afternoon
    await timePeriodCheckboxes[2].setValue(true); // Evening

    // Check default times
    const timeInputs = wrapper.findAll('.time-config input[type="time"]');
    expect(timeInputs[0].element.value).toBe('08:00'); // Morning
    expect(timeInputs[1].element.value).toBe('14:00'); // Afternoon
    expect(timeInputs[2].element.value).toBe('20:00'); // Evening
  });

  it('uses correct default quantities for time periods', async () => {
    const wrapper = mount(MedicationRecordForm, {
      props: {
        isOpen: true,
        cats: mockCats,
        medications: mockMedications,
      },
      global: {
        plugins: [pinia],
      },
    });

    // Enable multiple doses
    const multipleDosesCheckbox = wrapper.find('input[type="checkbox"]');
    await multipleDosesCheckbox.setValue(true);

    // Enable all time periods
    const timePeriodCheckboxes = wrapper.findAll('.time-period-config input[type="checkbox"]');
    await timePeriodCheckboxes[0].setValue(true); // Morning
    await timePeriodCheckboxes[1].setValue(true); // Afternoon
    await timePeriodCheckboxes[2].setValue(true); // Evening

    // Check default quantities
    const quantityInputs = wrapper.findAll('.time-config input[type="number"]');
    expect(quantityInputs[0].element.value).toBe('1'); // Morning
    expect(quantityInputs[1].element.value).toBe('1'); // Afternoon
    expect(quantityInputs[2].element.value).toBe('1'); // Evening
  });
});
