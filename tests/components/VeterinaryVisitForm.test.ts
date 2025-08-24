import { ref } from 'process';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryVisitForm from '~/components/VeterinaryVisitForm.vue';
import { useVeterinaryMasters } from '~/composables/useVeterinaryMasters';
import type { Cat } from '~/types/cat-meal';
import type { VeterinaryVisitWithRelations } from '~/types/veterinary-visit';

// Mock composables
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('~/composables/useVeterinaryMasters', () => ({
  useVeterinaryMasters: () => ({
    hospitals: global.ref([
      { id: '1', name: 'テスト動物病院', address: '', phone: '' },
      { id: '2', name: 'サンプル病院', address: '', phone: '' },
    ]),
    doctors: global.ref([
      { id: '1', name: 'テスト先生', hospitalId: '1', specialization: '内科' },
      { id: '2', name: 'サンプル先生', hospitalId: '2', specialization: '外科' },
    ]),
    treatments: global.ref([
      { id: '1', name: '健康診断', category: '診察', description: '' },
      { id: '2', name: 'ワクチン接種', category: '予防', description: '' },
    ]),
    loading: global.ref(false),
    error: global.ref(null),
    createHospital: vi.fn(),
    createDoctor: vi.fn(),
    createTreatment: vi.fn(),
    loadMasterData: vi.fn(),
    createHospital: vi.fn(),
    createDoctor: vi.fn(),
    createTreatment: vi.fn(),
  }),
}));

describe('VeterinaryVisitForm', () => {
  const mockCats: Cat[] = [
    {
      id: 'cat1',
      name: 'テスト猫1',
      birthdate: new Date('2020-01-01'),
      weight: 4.5,
      photoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat2',
      name: 'テスト猫2',
      birthdate: new Date('2021-06-15'),
      weight: 3.2,
      photoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    isOpen: true,
    cats: mockCats,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('フォーム表示', () => {
    it('フォームが正しく表示される', () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      expect(wrapper.find('[data-testid="visit-form"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="cat-select"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="visit-date"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="hospital-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="cost-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="blood-test-checkbox"]').exists()).toBe(true);
    });

    it('猫の選択肢が正しく表示される', () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      const catSelect = wrapper.find('[data-testid="cat-select"]');
      const options = catSelect.findAll('option');

      expect(options).toHaveLength(mockCats.length + 1); // +1 for placeholder
      expect(options[1].text()).toBe('テスト猫1');
      expect(options[2].text()).toBe('テスト猫2');
    });

    it('isOpenがfalseの場合、フォームが表示されない', () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: {
          ...defaultProps,
          isOpen: false,
        },
      });

      expect(wrapper.find('[data-testid="visit-form"]').exists()).toBe(false);
    });
  });

  describe('初期データ設定', () => {
    it('既存の通院記録データでフォームが初期化される', () => {
      const existingVisit: VeterinaryVisitWithRelations = {
        id: 'visit1',
        catId: 'cat1',
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalId: 'hospital1',
        doctorId: 'doctor1',
        cost: 5000,
        notes: 'テストメモ',
        hasBloodTest: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: mockCats[0],
        hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
        doctor: { id: 'doctor1', name: 'テスト先生', hospitalId: 'hospital1', specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
        treatments: [
          {
            id: 'treatment1',
            name: '健康診断',
            category: '診察',
            description: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const wrapper = mount(VeterinaryVisitForm, {
        props: {
          ...defaultProps,
          visit: existingVisit,
        },
      });

      expect(wrapper.find('[data-testid="cat-select"]').element.value).toBe('cat1');
      expect(wrapper.find('[data-testid="hospital-input"]').element.value).toBe('テスト動物病院');
      expect(wrapper.find('[data-testid="cost-input"]').element.value).toBe('5000');
      expect(wrapper.find('[data-testid="notes-textarea"]').element.value).toBe('テストメモ');
      expect(wrapper.find('[data-testid="blood-test-checkbox"]').element.checked).toBe(true);
    });

    it('初期データが設定される', () => {
      const initialData = {
        catId: 'cat2',
        hospitalName: '初期病院',
        cost: 3000,
      };

      const wrapper = mount(VeterinaryVisitForm, {
        props: {
          ...defaultProps,
          initialData,
        },
      });

      expect(wrapper.find('[data-testid="cat-select"]').element.value).toBe('cat2');
      expect(wrapper.find('[data-testid="hospital-input"]').element.value).toBe('初期病院');
      expect(wrapper.find('[data-testid="cost-input"]').element.value).toBe('3000');
    });
  });
  describe('バリデーション', () => {
    it('必須項目が未入力の場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      // フォームを送信
      await wrapper.find('[data-testid="visit-form"]').trigger('submit');
      await wrapper.vm.$nextTick();

      // エラーメッセージが表示されることを確認
      expect(wrapper.find('[data-testid="cat-error"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="hospital-error"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="treatments-error"]').exists()).toBe(true);
    });

    it('猫が選択されていない場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      await wrapper.find('[data-testid="visit-form"]').trigger('submit');
      await wrapper.vm.$nextTick();

      const catError = wrapper.find('[data-testid="cat-error"]');
      expect(catError.exists()).toBe(true);
      expect(catError.text()).toContain('猫を選択してください');
    });

    it('病院名が未入力の場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      await wrapper.find('[data-testid="cat-select"]').setValue('cat1');
      await wrapper.find('[data-testid="visit-form"]').trigger('submit');
      await wrapper.vm.$nextTick();

      const hospitalError = wrapper.find('[data-testid="hospital-error"]');
      expect(hospitalError.exists()).toBe(true);
      expect(hospitalError.text()).toContain('病院名を入力してください');
    });

    it('処方内容が未選択の場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      await wrapper.find('[data-testid="cat-select"]').setValue('cat1');
      await wrapper.find('[data-testid="hospital-input"]').setValue('テスト病院');
      await wrapper.find('[data-testid="visit-form"]').trigger('submit');
      await wrapper.vm.$nextTick();

      const treatmentsError = wrapper.find('[data-testid="treatments-error"]');
      expect(treatmentsError.exists()).toBe(true);
      expect(treatmentsError.text()).toContain('処方内容を少なくとも1つ選択してください');
    });

    it('費用が負の値の場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      await wrapper.find('[data-testid="cost-input"]').setValue('-100');
      await wrapper.find('[data-testid="visit-form"]').trigger('submit');
      await wrapper.vm.$nextTick();

      const costError = wrapper.find('[data-testid="cost-error"]');
      expect(costError.exists()).toBe(true);
      expect(costError.text()).toContain('費用は0以上で入力してください');
    });

    it('メモが長すぎる場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      const longNotes = 'a'.repeat(1001); // 1000文字制限を超える
      await wrapper.find('[data-testid="notes-textarea"]').setValue(longNotes);
      await wrapper.find('[data-testid="visit-form"]').trigger('submit');
      await wrapper.vm.$nextTick();

      const notesError = wrapper.find('[data-testid="notes-error"]');
      expect(notesError.exists()).toBe(true);
      expect(notesError.text()).toContain('メモは1000文字以内で入力してください');
    });
  });
  describe('フォーム送信', () => {
    it('有効なデータでフォームが送信される', async () => {
      const onSave = vi.fn();
      const wrapper = mount(VeterinaryVisitForm, {
        props: {
          ...defaultProps,
          onSave,
        },
      });

      // フォームに有効なデータを入力
      await wrapper.find('[data-testid="cat-select"]').setValue('cat1');
      await wrapper.find('[data-testid="hospital-input"]').setValue('テスト動物病院');
      await wrapper.find('[data-testid="doctor-input"]').setValue('テスト先生');
      await wrapper.find('[data-testid="cost-input"]').setValue('5000');
      await wrapper.find('[data-testid="notes-textarea"]').setValue('テストメモ');
      await wrapper.find('[data-testid="blood-test-checkbox"]').setChecked(true);

      // 処方内容を選択
      const treatmentCheckbox = wrapper.find('[data-testid="treatment-checkbox-1"]');
      await treatmentCheckbox.setChecked(true);

      // フォームを送信
      await wrapper.find('[data-testid="submit-button"]').trigger('click');

      expect(onSave).toHaveBeenCalledWith({
        catId: 'cat1',
        visitDate: expect.any(Date),
        hospitalName: 'テスト動物病院',
        doctorName: 'テスト先生',
        treatments: ['健康診断'],
        cost: 5000,
        notes: 'テストメモ',
        hasBloodTest: true,
      });
    });

    it('送信中はボタンが無効化される', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      // 送信状態をシミュレート
      wrapper.vm.isSubmitting = true;
      await wrapper.vm.$nextTick();

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.attributes('disabled')).toBeDefined();
      expect(submitButton.text()).toContain('保存中');
    });

    it('キャンセルボタンでフォームが閉じられる', async () => {
      const onClose = vi.fn();
      const wrapper = mount(VeterinaryVisitForm, {
        props: {
          ...defaultProps,
          onClose,
        },
      });

      await wrapper.find('[data-testid="cancel-button"]').trigger('click');

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('マスタデータ管理', () => {
    it('新しい病院名を入力した場合、マスタに追加される', async () => {
      const mockUseVeterinaryMasters = vi.mocked(useVeterinaryMasters);
      const { createHospital } = mockUseVeterinaryMasters();
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      const newHospitalName = '新しい動物病院';
      await wrapper.find('[data-testid="hospital-input"]').setValue(newHospitalName);

      // フォームを送信
      await wrapper.find('[data-testid="cat-select"]').setValue('cat1');
      const treatmentCheckbox = wrapper.find('[data-testid="treatment-checkbox-1"]');
      await treatmentCheckbox.setChecked(true);
      await wrapper.find('[data-testid="submit-button"]').trigger('click');

      expect(createHospital).toHaveBeenCalledWith({ name: newHospitalName });
    });

    it('新しい先生名を入力した場合、マスタに追加される', async () => {
      const mockUseVeterinaryMasters = vi.mocked(useVeterinaryMasters);
      const { createDoctor } = mockUseVeterinaryMasters();
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      const newDoctorName = '新しい先生';
      await wrapper.find('[data-testid="hospital-input"]').setValue('テスト動物病院');
      await wrapper.find('[data-testid="doctor-input"]').setValue(newDoctorName);

      // フォームを送信
      await wrapper.find('[data-testid="cat-select"]').setValue('cat1');
      const treatmentCheckbox = wrapper.find('[data-testid="treatment-checkbox-1"]');
      await treatmentCheckbox.setChecked(true);
      await wrapper.find('[data-testid="submit-button"]').trigger('click');

      expect(createDoctor).toHaveBeenCalledWith({
        name: newDoctorName,
        hospitalId: expect.any(String),
      });
    });

    it('新しい処方内容を入力した場合、マスタに追加される', async () => {
      const mockUseVeterinaryMasters = vi.mocked(useVeterinaryMasters);
      const { createTreatment } = mockUseVeterinaryMasters();
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      const newTreatmentName = '新しい処方';

      // 新しい処方内容を追加
      await wrapper.find('[data-testid="add-treatment-button"]').trigger('click');
      await wrapper.find('[data-testid="new-treatment-input"]').setValue(newTreatmentName);
      await wrapper.find('[data-testid="confirm-treatment-button"]').trigger('click');

      expect(createTreatment).toHaveBeenCalledWith({ name: newTreatmentName });
    });
  });
  describe('エラーハンドリング', () => {
    it('送信エラーが発生した場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      // エラー状態をシミュレート
      wrapper.vm.submitError = 'サーバーエラーが発生しました';
      await wrapper.vm.$nextTick();

      const errorMessage = wrapper.find('[data-testid="submit-error"]');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toBe('サーバーエラーが発生しました');
    });

    it('リトライ機能が動作する', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
      const wrapper = mount(VeterinaryVisitForm, {
        props: {
          ...defaultProps,
          onSave,
        },
      });

      // 有効なデータを入力
      await wrapper.find('[data-testid="cat-select"]').setValue('cat1');
      await wrapper.find('[data-testid="hospital-input"]').setValue('テスト病院');
      const treatmentCheckbox = wrapper.find('[data-testid="treatment-checkbox-1"]');
      await treatmentCheckbox.setChecked(true);

      // 初回送信（失敗）
      await wrapper.find('[data-testid="submit-button"]').trigger('click');

      // リトライボタンが表示される
      expect(wrapper.find('[data-testid="retry-button"]').exists()).toBe(true);

      // リトライ実行
      await wrapper.find('[data-testid="retry-button"]').trigger('click');

      expect(onSave).toHaveBeenCalledTimes(2);
    });
  });

  describe('アクセシビリティ', () => {
    it('フォーム要素に適切なラベルが設定されている', () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      expect(wrapper.find('label[for="cat-select"]').exists()).toBe(true);
      expect(wrapper.find('label[for="visit-date"]').exists()).toBe(true);
      expect(wrapper.find('label[for="hospital-input"]').exists()).toBe(true);
      expect(wrapper.find('label[for="cost-input"]').exists()).toBe(true);
    });

    it('エラーメッセージがaria-describedbyで関連付けられている', async () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      await wrapper.find('[data-testid="submit-button"]').trigger('click');

      const catSelect = wrapper.find('[data-testid="cat-select"]');
      const catError = wrapper.find('[data-testid="cat-error"]');

      expect(catSelect.attributes('aria-describedby')).toBe(catError.attributes('id'));
    });

    it('必須項目にaria-requiredが設定されている', () => {
      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      expect(wrapper.find('[data-testid="cat-select"]').attributes('aria-required')).toBe('true');
      expect(wrapper.find('[data-testid="hospital-input"]').attributes('aria-required')).toBe('true');
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示でフォームレイアウトが適切に調整される', () => {
      // モバイル画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      const form = wrapper.find('[data-testid="visit-form"]');
      expect(form.classes()).toContain('mobile-layout');
    });

    it('タブレット表示でフォームレイアウトが適切に調整される', () => {
      // タブレット画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900,
      });

      const wrapper = mount(VeterinaryVisitForm, {
        props: defaultProps,
      });

      const form = wrapper.find('[data-testid="visit-form"]');
      expect(form.classes()).toContain('tablet-layout');
    });
  });
});
