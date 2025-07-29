import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PendingMedicationList from '~/components/PendingMedicationList.vue';
import { MedicationStatus } from '~/types/medication';
import type { MedicationRecord } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Mock the useMedicationsStore composable
const mockStore = {
  getPendingMedicationRecords: [] as MedicationRecord[],
  getOverdueMedicationRecords: [] as MedicationRecord[],
};

vi.stubGlobal('useMedicationsStore', () => mockStore);

describe('PendingMedicationList', () => {
  let cats: Cat[];
  let medications: unknown[];

  beforeEach(() => {
    setActivePinia(createPinia());

    cats = [
      { id: 'cat1', name: 'ミケ', breed: 'mix', birthDate: new Date(), weight: 4.5, createdAt: new Date(), updatedAt: new Date() },
      { id: 'cat2', name: 'タマ', breed: 'mix', birthDate: new Date(), weight: 3.8, createdAt: new Date(), updatedAt: new Date() },
    ];

    medications = [
      { id: 'med1', name: '薬A', type: 'MEDICINE' },
      { id: 'med2', name: '薬B', type: 'SUPPLEMENT' },
    ];

    // Reset mock store
    mockStore.getPendingMedicationRecords = [];
    mockStore.getOverdueMedicationRecords = [];
  });

  it('renders component with title', () => {
    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
      },
    });

    expect(wrapper.find('.title').text()).toBe('投与予定の薬');
  });

  it('shows loading state', () => {
    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
        loading: true,
      },
    });

    expect(wrapper.find('.loading').exists()).toBe(true);
    expect(wrapper.find('.loading').text()).toBe('読み込み中...');
  });

  it('shows error state', () => {
    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
        error: 'エラーが発生しました',
      },
    });

    expect(wrapper.find('.error').exists()).toBe(true);
    expect(wrapper.find('.error').text()).toBe('エラーが発生しました');
  });

  it('shows empty state when no records', () => {
    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
      },
    });

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state').text()).toContain('投与予定の薬はありません');
  });

  it('uses custom title when provided', () => {
    const customTitle = 'カスタムタイトル';
    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
        title: customTitle,
      },
    });

    expect(wrapper.find('.title').text()).toBe(customTitle);
  });

  it('renders filter controls', () => {
    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
      },
    });

    const filters = wrapper.findAll('.filter-select');
    expect(filters).toHaveLength(2); // Cat filter and status filter
  });

  it('has correct filter options', () => {
    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
      },
    });

    const statusFilter = wrapper.findAll('.filter-select')[1];
    const options = statusFilter.findAll('option');

    expect(options[0].text()).toBe('投与予定');
    expect(options[1].text()).toBe('期限切れ');
    expect(options[2].text()).toBe('全て');
  });

  it('renders pending medication records', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const pendingRecord: MedicationRecord = {
      id: 'record1',
      catId: 'cat1',
      medicationId: 'med1',
      quantity: 1,
      administeredAt: futureDate,
      status: MedicationStatus.PENDING,
      notes: 'テストメモ',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.getPendingMedicationRecords = [pendingRecord];

    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
      },
    });

    expect(wrapper.findAll('.record-item')).toHaveLength(1);
    expect(wrapper.text()).toContain('ミケ');
    expect(wrapper.text()).toContain('薬A');
  });

  it('emits status-change event when action buttons are clicked', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const pendingRecord: MedicationRecord = {
      id: 'record1',
      catId: 'cat1',
      medicationId: 'med1',
      quantity: 1,
      administeredAt: futureDate,
      status: MedicationStatus.PENDING,
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.getPendingMedicationRecords = [pendingRecord];

    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
      },
    });

    const administeredBtn = wrapper.find('.action-btn--primary');
    await administeredBtn.trigger('click');

    expect(wrapper.emitted('status-change')).toBeTruthy();
    expect(wrapper.emitted('status-change')![0]).toEqual([
      pendingRecord,
      MedicationStatus.ADMINISTERED,
    ]);
  });

  it('emits edit event when edit button is clicked', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const pendingRecord: MedicationRecord = {
      id: 'record1',
      catId: 'cat1',
      medicationId: 'med1',
      quantity: 1,
      administeredAt: futureDate,
      status: MedicationStatus.PENDING,
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.getPendingMedicationRecords = [pendingRecord];

    const wrapper = mount(PendingMedicationList, {
      props: {
        cats,
        medications,
      },
    });

    const editBtn = wrapper.find('.action-btn--ghost');
    await editBtn.trigger('click');

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')![0]).toEqual([pendingRecord]);
  });
});
