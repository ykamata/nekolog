import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryMasterSelector from '@/components/VeterinaryMasterSelector.vue';

// テスト用のモックデータ
const mockHospitals = [
  { id: '1', name: 'テスト動物病院1', address: '東京都渋谷区' },
  { id: '2', name: 'テスト動物病院2', address: '東京都新宿区' },
  { id: '3', name: 'サンプル病院', address: '東京都港区' },
];

const mockDoctors = [
  { id: '1', name: 'テスト先生1', hospitalId: '1', specialization: '内科' },
  { id: '2', name: 'テスト先生2', hospitalId: '1', specialization: '外科' },
  { id: '3', name: 'サンプル先生', hospitalId: '2', specialization: '皮膚科' },
  { id: '4', name: '田中先生', hospitalId: null, specialization: '総合診療' },
];

describe('VeterinaryMasterSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('病院選択モードで正しく表示される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          placeholder: '病院を選択してください',
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      expect(input.attributes('placeholder')).toBe('病院を選択してください');
    });

    it('先生選択モードで正しく表示される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'doctor',
          items: mockDoctors,
          placeholder: '先生を選択してください',
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      expect(input.attributes('placeholder')).toBe('先生を選択してください');
    });

    it('初期値が正しく設定される', () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: 'テスト動物病院1',
          type: 'hospital',
          items: mockHospitals,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      expect((input.element as HTMLInputElement).value).toBe('テスト動物病院1');
    });
  });

  describe('曖昧検索機能', () => {
    it('入力値に基づいて病院がフィルタリングされる', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('テスト');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const dropdownItems = wrapper.findAll('[data-testid="dropdown-item"]');
      expect(dropdownItems).toHaveLength(2); // テスト動物病院1, テスト動物病院2
    });

    it('入力値に基づいて先生がフィルタリングされる', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'doctor',
          items: mockDoctors,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('テスト');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const dropdownItems = wrapper.findAll('[data-testid="dropdown-item"]');
      expect(dropdownItems).toHaveLength(2); // テスト先生1, テスト先生2
    });

    it('検索結果が0件の場合、適切なメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          allowFreeInput: false, // 新規作成を無効にして、メッセージが表示されるようにする
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('存在しない病院');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const noResults = wrapper.find('[data-testid="no-results"]');
      expect(noResults.exists()).toBe(true);
      expect(noResults.text()).toBe('該当するデータがありません');
    });
  });

  describe('病院フィルタリング機能', () => {
    it('病院が選択されている場合、その病院の先生のみ表示される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'doctor',
          items: mockDoctors,
          selectedHospitalId: '1',
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const dropdownItems = wrapper.findAll('[data-testid="dropdown-item"]');
      expect(dropdownItems).toHaveLength(2); // テスト先生1, テスト先生2 (病院1の先生のみ)
    });

    it('病院選択時に動的プレースホルダーが表示される', () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'doctor',
          items: [...mockDoctors, ...mockHospitals], // 病院情報も含める
          selectedHospitalId: '1',
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      expect(input.attributes('placeholder')).toContain('テスト動物病院1の先生を選択');
    });

    it('病院選択が変更された時、所属していない先生の入力値がクリアされる', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: 'サンプル先生', // 病院2の先生
          type: 'doctor',
          items: mockDoctors,
          selectedHospitalId: '1', // 病院1を選択
        },
      });

      await wrapper.setProps({ selectedHospitalId: '2' });
      await wrapper.vm.$nextTick();

      // 病院1から病院2に変更されたので、サンプル先生は表示されるはず
      const input = wrapper.find('[data-testid="master-input"]');
      expect((input.element as HTMLInputElement).value).toBe('サンプル先生');

      // 病院3に変更（サンプル先生は所属していない）
      await wrapper.setProps({ selectedHospitalId: '3' });
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    });
  });

  describe('新規作成機能', () => {
    it('新しい名前を入力した場合、新規作成オプションが表示される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          allowFreeInput: true,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('新しい病院');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const createOption = wrapper.find('[data-testid="create-option"]');
      expect(createOption.exists()).toBe(true);
      expect(createOption.text()).toContain('「新しい病院」を新規作成');
    });

    it('既存の名前を入力した場合、新規作成オプションが表示されない', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          allowFreeInput: true,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('テスト動物病院1');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const createOption = wrapper.find('[data-testid="create-option"]');
      expect(createOption.exists()).toBe(false);
    });

    it('allowFreeInputがfalseの場合、新規作成オプションが表示されない', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          allowFreeInput: false,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('新しい病院');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const createOption = wrapper.find('[data-testid="create-option"]');
      expect(createOption.exists()).toBe(false);
    });
  });

  describe('確認ダイアログ機能', () => {
    it('showCreateDialogがtrueの場合、確認ダイアログが表示される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          allowFreeInput: true,
          showCreateDialog: true,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('新しい病院');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const createOption = wrapper.find('[data-testid="create-option"]');
      await createOption.trigger('click');

      await wrapper.vm.$nextTick();

      const confirmDialog = wrapper.find('[data-testid="confirm-dialog"]');
      expect(confirmDialog.exists()).toBe(true);
      expect(confirmDialog.text()).toContain('「新しい病院」を新しい病院として登録しますか？');
    });

    it('確認ダイアログで「作成する」をクリックした場合、createイベントが発火される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          allowFreeInput: true,
          showCreateDialog: true,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('新しい病院');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const createOption = wrapper.find('[data-testid="create-option"]');
      await createOption.trigger('click');

      await wrapper.vm.$nextTick();

      const confirmButton = wrapper.find('[data-testid="confirm-create"]');
      await confirmButton.trigger('click');

      expect(wrapper.emitted('create')).toBeTruthy();
      expect(wrapper.emitted('create')?.[0]).toEqual(['新しい病院']);
    });

    it('確認ダイアログで「キャンセル」をクリックした場合、ダイアログが閉じる', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          allowFreeInput: true,
          showCreateDialog: true,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('新しい病院');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const createOption = wrapper.find('[data-testid="create-option"]');
      await createOption.trigger('click');

      await wrapper.vm.$nextTick();

      const cancelButton = wrapper.find('[data-testid="cancel-create"]');
      await cancelButton.trigger('click');

      await wrapper.vm.$nextTick();

      const confirmDialog = wrapper.find('[data-testid="confirm-dialog"]');
      expect(confirmDialog.exists()).toBe(false);
    });

    it('showCreateDialogがfalseの場合、直接createイベントが発火される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          allowFreeInput: true,
          showCreateDialog: false,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.setValue('新しい病院');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const createOption = wrapper.find('[data-testid="create-option"]');
      await createOption.trigger('click');

      expect(wrapper.emitted('create')).toBeTruthy();
      expect(wrapper.emitted('create')?.[0]).toEqual(['新しい病院']);

      // ダイアログは表示されない
      const confirmDialog = wrapper.find('[data-testid="confirm-dialog"]');
      expect(confirmDialog.exists()).toBe(false);
    });
  });

  describe('アイテム選択機能', () => {
    it('アイテムをクリックした場合、selectイベントが発火される', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const firstItem = wrapper.find('[data-testid="dropdown-item"]');
      await firstItem.trigger('click');

      expect(wrapper.emitted('select')).toBeTruthy();
      expect(wrapper.emitted('select')?.[0]).toEqual([mockHospitals[0]]);
      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['テスト動物病院1']);
    });

    it('先生選択時に病院名も表示される', async () => {
      const allItems = [...mockDoctors, ...mockHospitals];
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'doctor',
          items: allItems,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const dropdownItems = wrapper.findAll('[data-testid="dropdown-item"]');
      const firstDoctorItem = dropdownItems[0];

      expect(firstDoctorItem.text()).toContain('テスト先生1');
      expect(firstDoctorItem.text()).toContain('テスト動物病院1');
    });
  });

  describe('ローディング状態', () => {
    it('loadingがtrueの場合、スピナーが表示される', () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          loading: true,
        },
      });

      const loadingIndicator = wrapper.find('[data-testid="loading-indicator"]');
      expect(loadingIndicator.exists()).toBe(true);
    });

    it('loadingがtrueの場合、入力フィールドが無効化される', () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          loading: true,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      expect(input.attributes('disabled')).toBeDefined();
    });
  });

  describe('エラー状態', () => {
    it('errorが設定されている場合、エラースタイルが適用される', () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          error: 'エラーメッセージ',
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      expect(input.classes()).toContain('master-input--error');
    });
  });

  describe('無効化状態', () => {
    it('disabledがtrueの場合、入力フィールドが無効化される', () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          disabled: true,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      expect(input.attributes('disabled')).toBeDefined();
    });

    it('disabledがtrueの場合、ドロップダウンが表示されない', async () => {
      const wrapper = mount(VeterinaryMasterSelector, {
        props: {
          modelValue: '',
          type: 'hospital',
          items: mockHospitals,
          disabled: true,
        },
      });

      const input = wrapper.find('[data-testid="master-input"]');
      await input.trigger('focus');

      await wrapper.vm.$nextTick();

      const dropdown = wrapper.find('[data-testid="dropdown"]');
      expect(dropdown.exists()).toBe(false);
    });
  });
});
