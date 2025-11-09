import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CatMedicationHistory from '~/components/CatMedicationHistory.vue';
import type {
  MedicationRecord,
  MedicationStatus,
  Medication,
  MedicationType,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Mock child components
vi.mock('~/components/MedicationRecordList.vue', () => ({
  default: {
    name: 'MedicationRecordList',
    template: '<div class="medication-record-list-mock" />',
    props: ['cats', 'medications', 'selectedCatId', 'loading'],
    emits: ['add', 'edit', 'delete', 'filter-change'],
  },
}));

vi.mock('~/components/MedicationRecordForm.vue', () => ({
  default: {
    name: 'MedicationRecordForm',
    template: '<div class="medication-record-form-mock" />',
    props: ['isOpen', 'medicationRecord', 'cats', 'medications', 'selectedCatId'],
    emits: ['save', 'close'],
  },
}));

describe('CatMedicationHistory', () => {
  const createTestCat = (overrides?: Partial<Cat>): Cat => ({
    id: 1,
    name: 'みけ',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
    photoUrl: 'https://example.com/cat.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createTestMedication = (
    overrides?: Partial<Medication>,
  ): Medication => ({
    id: 1,
    name: 'テスト薬',
    type: 'MEDICINE' as MedicationType,
    description: 'テスト用の薬です',
    dosage: '1日1回',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createTestMedicationRecord = (
    overrides?: Partial<MedicationRecord>,
  ): MedicationRecord => ({
    id: 1,
    catId: 1,
    medicationId: 1,
    quantity: 1,
    administeredAt: new Date(),
    status: 'ADMINISTERED' as MedicationStatus,
    notes: 'テストメモ',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const defaultProps = {
    cat: createTestCat(),
    medications: [
      createTestMedication({ id: 1, name: '血圧薬' }),
      createTestMedication({ id: 2, name: 'ビタミンC' }),
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render cat header with cat information', () => {
      const cat = createTestCat({
        name: 'みけ',
        birthdate: new Date('2020-01-01'),
        weight: 4.5,
        photoUrl: 'https://example.com/cat.jpg',
      });

      const wrapper = mount(CatMedicationHistory, {
        props: {
          ...defaultProps,
          cat,
        },
      });

      expect(wrapper.find('.cat-name').text()).toBe('みけの薬管理');
      expect(wrapper.find('.cat-photo').attributes('src')).toBe('https://example.com/cat.jpg');
      expect(wrapper.find('.cat-photo').attributes('alt')).toBe('みけ');
      expect(wrapper.text()).toContain('体重: 4.5kg');
    });

    it('should show placeholder when cat has no photo', () => {
      const cat = createTestCat({
        photoUrl: undefined,
      });

      const wrapper = mount(CatMedicationHistory, {
        props: {
          ...defaultProps,
          cat,
        },
      });

      expect(wrapper.find('.cat-photo-placeholder').exists()).toBe(true);
      expect(wrapper.find('.cat-photo-placeholder').text()).toBe('🐱');
    });

    it('should render MedicationRecordList with correct props', () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      expect(recordList.exists()).toBe(true);
      expect(recordList.props('cats')).toEqual([defaultProps.cat]);
      expect(recordList.props('medications')).toEqual(defaultProps.medications);
      expect(recordList.props('selectedCatId')).toBe(defaultProps.cat.id);
      expect(recordList.props('loading')).toBe(false);
    });

    it('should not render MedicationRecordForm initially', () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      const recordForm = wrapper.findComponent({ name: 'MedicationRecordForm' });
      expect(recordForm.props('isOpen')).toBe(false);
    });
  });

  describe('Cat Information Display', () => {
    it('should format birthdate correctly', () => {
      const cat = createTestCat({
        birthdate: new Date('2020-01-01'),
      });

      const wrapper = mount(CatMedicationHistory, {
        props: {
          ...defaultProps,
          cat,
        },
      });

      expect(wrapper.text()).toContain('生年月日: 2020/01/01');
    });

    it('should handle missing optional fields gracefully', () => {
      const cat = createTestCat({
        birthdate: undefined,
        weight: undefined,
        photoUrl: undefined,
      });

      const wrapper = mount(CatMedicationHistory, {
        props: {
          ...defaultProps,
          cat,
        },
      });

      expect(wrapper.text()).not.toContain('生年月日:');
      expect(wrapper.text()).not.toContain('体重:');
      expect(wrapper.find('.cat-photo-placeholder').exists()).toBe(true);
    });
  });

  describe('Record Management', () => {
    it('should show form when add record is triggered', async () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      await recordList.vm.$emit('add');

      const recordForm = wrapper.findComponent({ name: 'MedicationRecordForm' });
      expect(recordForm.props('isOpen')).toBe(true);
      expect(recordForm.props('medicationRecord')).toBeNull();
      expect(recordForm.props('selectedCatId')).toBe(defaultProps.cat.id);
    });

    it('should show form with record data when edit is triggered', async () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      const testRecord = createTestMedicationRecord();
      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      await recordList.vm.$emit('edit', testRecord);

      const recordForm = wrapper.findComponent({ name: 'MedicationRecordForm' });
      expect(recordForm.props('isOpen')).toBe(true);
      expect(recordForm.props('medicationRecord')).toEqual(testRecord);
    });

    it('should emit record-deleted when delete is triggered', async () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      const testRecord = createTestMedicationRecord();
      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      await recordList.vm.$emit('delete', testRecord);

      expect(wrapper.emitted('record-deleted')).toHaveLength(1);
      expect(wrapper.emitted('record-deleted')![0]).toEqual([testRecord.id]);
    });

    it('should emit record-created when new record is saved', async () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      // Open form for new record
      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      await recordList.vm.$emit('add');

      // Save new record
      const recordInput = {
        catId: 1,
        medicationId: 1,
        quantity: 2,
        administeredAt: new Date(),
        status: 'ADMINISTERED' as MedicationStatus,
        notes: 'テストメモ',
      };

      const recordForm = wrapper.findComponent({ name: 'MedicationRecordForm' });
      await recordForm.vm.$emit('save', recordInput);

      expect(wrapper.emitted('record-created')).toHaveLength(1);
      const emittedRecord = wrapper.emitted('record-created')![0][0] as MedicationRecord;
      expect(emittedRecord.catId).toBe(recordInput.catId);
      expect(emittedRecord.medicationId).toBe(recordInput.medicationId);
      expect(emittedRecord.quantity).toBe(recordInput.quantity);
      expect(emittedRecord.status).toBe(recordInput.status);
      expect(emittedRecord.notes).toBe(recordInput.notes);
    });

    it('should emit record-updated when existing record is saved', async () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      // Open form for editing
      const testRecord = createTestMedicationRecord();
      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      await recordList.vm.$emit('edit', testRecord);

      // Save updated record
      const recordInput = {
        catId: 1,
        medicationId: 1,
        quantity: 3,
        administeredAt: new Date(),
        status: 'PENDING' as MedicationStatus,
        notes: '更新されたメモ',
      };

      const recordForm = wrapper.findComponent({ name: 'MedicationRecordForm' });
      await recordForm.vm.$emit('save', recordInput);

      expect(wrapper.emitted('record-updated')).toHaveLength(1);
      const emittedRecord = wrapper.emitted('record-updated')![0][0] as MedicationRecord;
      expect(emittedRecord.id).toBe(testRecord.id);
      expect(emittedRecord.quantity).toBe(recordInput.quantity);
      expect(emittedRecord.status).toBe(recordInput.status);
      expect(emittedRecord.notes).toBe(recordInput.notes);
    });

    it('should close form when close is triggered', async () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      // Open form
      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      await recordList.vm.$emit('add');

      // Close form
      const recordForm = wrapper.findComponent({ name: 'MedicationRecordForm' });
      await recordForm.vm.$emit('close');

      expect(recordForm.props('isOpen')).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('should pass loading state to child components', () => {
      const wrapper = mount(CatMedicationHistory, {
        props: {
          ...defaultProps,
          loading: true,
        },
      });

      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      expect(recordList.props('loading')).toBe(true);
    });
  });

  describe('Props Validation', () => {
    it('should handle empty medications array', () => {
      const wrapper = mount(CatMedicationHistory, {
        props: {
          ...defaultProps,
          medications: [],
        },
      });

      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      expect(recordList.props('medications')).toEqual([]);
    });

    it('should pass correct cat array to child components', () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      const recordList = wrapper.findComponent({ name: 'MedicationRecordList' });
      const recordForm = wrapper.findComponent({ name: 'MedicationRecordForm' });

      expect(recordList.props('cats')).toEqual([defaultProps.cat]);
      expect(recordForm.props('cats')).toEqual([defaultProps.cat]);
    });
  });

  describe('Responsive Design', () => {
    it('should render responsive layout classes', () => {
      const wrapper = mount(CatMedicationHistory, {
        props: defaultProps,
      });

      expect(wrapper.find('.cat-medication-history').exists()).toBe(true);
      expect(wrapper.find('.cat-header').exists()).toBe(true);
      expect(wrapper.find('.cat-info').exists()).toBe(true);
    });
  });
});
