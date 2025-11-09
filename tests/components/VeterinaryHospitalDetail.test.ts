import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryHospitalDetail from '~/components/VeterinaryHospitalDetail.vue';
import type { VeterinaryHospital, VeterinaryDoctor } from '~/types/veterinary-master';

// モックコンポーネント
const ConfirmationDialog = {
  name: 'ConfirmationDialog',
  template: '<div data-testid="confirmation-dialog"><slot /></div>',
  emits: ['confirm', 'cancel'],
};

// テスト用データ
const mockHospital: VeterinaryHospital = {
  id: 1,
  name: 'テスト動物病院',
  address: '東京都渋谷区テスト1-2-3',
  phone: '03-1234-5678',
  memo: 'テスト用の病院です',
  userId: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  doctors: [
    {
      id: 1,
      name: '田中先生',
      hospitalId: 1,
      specialty: '内科',
      memo: '優しい先生です',
      userId: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 2,
      name: '佐藤先生',
      hospitalId: 1,
      specialty: '外科',
      memo: '手術が得意です',
      userId: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ],
  _count: {
    doctors: 2,
    visits: 5,
    appointments: 3,
  },
};

const mockDoctor: VeterinaryDoctor = mockHospital.doctors![0];

describe('VeterinaryHospitalDetail', () => {
  let wrapper: any;

  const createWrapper = (props = {}) => {
    return mount(VeterinaryHospitalDetail, {
      props: {
        hospital: mockHospital,
        loading: false,
        error: null,
        ...props,
      },
      global: {
        components: {
          ConfirmationDialog,
        },
        stubs: {
          ConfirmationDialog,
        },
      },
    });
  };

  beforeEach(() => {
    wrapper = createWrapper();
  });

  describe('基本表示', () => {
    it('病院の基本情報が正しく表示される', () => {
      expect(wrapper.text()).toContain('テスト動物病院');
      expect(wrapper.text()).toContain('東京都渋谷区テスト1-2-3');
      expect(wrapper.text()).toContain('03-1234-5678');
      expect(wrapper.text()).toContain('テスト用の病院です');
    });

    it('統計情報が正しく表示される', () => {
      expect(wrapper.text()).toContain('2名'); // 所属先生数
      expect(wrapper.text()).toContain('5件'); // 通院記録数
      expect(wrapper.text()).toContain('3件'); // 予約数
    });

    it('所属先生一覧が正しく表示される', () => {
      expect(wrapper.text()).toContain('田中先生');
      expect(wrapper.text()).toContain('内科');
      expect(wrapper.text()).toContain('佐藤先生');
      expect(wrapper.text()).toContain('外科');
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中は適切な表示がされる', () => {
      wrapper = createWrapper({ loading: true, hospital: null });

      expect(wrapper.text()).toContain('読み込み中...');
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });
  });

  describe('エラー状態', () => {
    it('エラー時は適切なメッセージが表示される', () => {
      const errorMessage = 'データの取得に失敗しました';
      wrapper = createWrapper({
        error: errorMessage,
        hospital: null,
        loading: false,
      });

      expect(wrapper.text()).toContain('エラーが発生しました');
      expect(wrapper.text()).toContain(errorMessage);
    });
  });

  describe('空の状態', () => {
    it('所属先生がいない場合の表示', () => {
      const hospitalWithoutDoctors = {
        ...mockHospital,
        doctors: [],
        _count: { ...mockHospital._count, doctors: 0 },
      };

      wrapper = createWrapper({ hospital: hospitalWithoutDoctors });

      expect(wrapper.text()).toContain('所属先生がいません');
      expect(wrapper.text()).toContain('この病院に所属する先生を追加してください');
    });
  });

  describe('イベント処理', () => {
    it('編集ボタンクリック時にeditイベントが発火される', async () => {
      const editButtons = wrapper.findAll('button');
      const editButton = editButtons.find((button: any) =>
        button.text().includes('編集') && !button.element.closest('table'),
      );

      if (editButton) {
        await editButton.trigger('click');

        expect(wrapper.emitted('edit')).toBeTruthy();
        expect(wrapper.emitted('edit')[0]).toEqual([mockHospital]);
      }
    });

    it('削除ボタンクリック時に確認ダイアログが表示される', async () => {
      const deleteButtons = wrapper.findAll('button');
      const deleteButton = deleteButtons.find((button: any) =>
        button.text().includes('削除') && !button.element.closest('table'),
      );

      if (deleteButton) {
        await deleteButton.trigger('click');

        expect(wrapper.find('[data-testid="confirmation-dialog"]').exists()).toBe(true);
      }
    });

    it('先生追加ボタンクリック時にaddDoctorイベントが発火される', async () => {
      const addDoctorButtons = wrapper.findAll('button');
      const addDoctorButton = addDoctorButtons.find((button: any) =>
        button.text().includes('先生を追加'),
      );

      if (addDoctorButton) {
        await addDoctorButton.trigger('click');

        expect(wrapper.emitted('addDoctor')).toBeTruthy();
        expect(wrapper.emitted('addDoctor')[0]).toEqual([mockHospital.id]);
      }
    });

    it('先生編集ボタンクリック時にeditDoctorイベントが発火される', async () => {
      // デスクトップ表示の編集ボタンをクリック
      const editDoctorButtons = wrapper.findAll('button');
      const doctorEditButton = editDoctorButtons.find((button: any) =>
        button.text().includes('編集') && button.element.closest('table') !== null,
      );

      if (doctorEditButton) {
        await doctorEditButton.trigger('click');

        expect(wrapper.emitted('editDoctor')).toBeTruthy();
        expect(wrapper.emitted('editDoctor')[0]).toEqual([mockDoctor]);
      }
    });

    it('先生削除ボタンクリック時に確認ダイアログが表示される', async () => {
      // デスクトップ表示の削除ボタンをクリック
      const deleteDoctorButtons = wrapper.findAll('button');
      const doctorDeleteButton = deleteDoctorButtons.find((button: any) =>
        button.text().includes('削除') && button.element.closest('table') !== null,
      );

      if (doctorDeleteButton) {
        await doctorDeleteButton.trigger('click');

        // 先生削除確認ダイアログが表示されることを確認
        expect(wrapper.vm.showDoctorDeleteConfirmation).toBe(true);
      }
    });
  });

  describe('削除確認ダイアログ', () => {
    it('病院削除確認時にdeleteイベントが発火される', async () => {
      // 削除ボタンをクリックしてダイアログを表示
      const deleteButtons = wrapper.findAll('button');
      const deleteButton = deleteButtons.find((button: any) =>
        button.text().includes('削除') && !button.element.closest('table'),
      );

      if (deleteButton) {
        await deleteButton.trigger('click');
      }

      // 確認ダイアログで確認を実行
      await wrapper.vm.confirmDelete();

      expect(wrapper.emitted('delete')).toBeTruthy();
      expect(wrapper.emitted('delete')[0]).toEqual([mockHospital.id]);
    });

    it('先生削除確認時にdeleteDoctorイベントが発火される', async () => {
      // 先生削除ボタンをクリック
      wrapper.vm.handleRemoveDoctor(mockDoctor);
      await wrapper.vm.$nextTick();

      // 確認ダイアログで確認を実行
      await wrapper.vm.confirmDoctorDelete();

      expect(wrapper.emitted('deleteDoctor')).toBeTruthy();
      expect(wrapper.emitted('deleteDoctor')[0]).toEqual([mockDoctor.id]);
    });

    it('削除キャンセル時にダイアログが閉じられる', async () => {
      // 削除ボタンをクリックしてダイアログを表示
      const deleteButtons = wrapper.findAll('button');
      const deleteButton = deleteButtons.find((button: unknown) =>
        button.text().includes('削除') && !button.element.closest('table'),
      );

      if (deleteButton) {
        await deleteButton.trigger('click');
      }

      expect(wrapper.vm.showDeleteConfirmation).toBe(true);

      // キャンセルを実行
      await wrapper.vm.cancelDelete();

      expect(wrapper.vm.showDeleteConfirmation).toBe(false);
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示でアクションメニューが動作する', async () => {
      // モバイルメニューボタンをクリック（先生のモバイルメニュー）
      const mobileMenuButtons = wrapper.findAll('.md\\:hidden button');

      if (mobileMenuButtons.length > 0) {
        await mobileMenuButtons[0].trigger('click');

        // メニューが開かれることを確認
        expect(wrapper.vm.activeDoctorMobileMenu).toBeTruthy();
      }
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      // スクリーンリーダー用のテキストが含まれている
      expect(wrapper.html()).toContain('sr-only');
    });

    it('電話番号がリンクとして機能する', () => {
      const phoneLink = wrapper.find('a[href="tel:03-1234-5678"]');
      expect(phoneLink.exists()).toBe(true);
      expect(phoneLink.text()).toBe('03-1234-5678');
    });
  });

  describe('データの表示形式', () => {
    it('メモが改行を含む場合に適切に表示される', () => {
      const hospitalWithMultilineMemo = {
        ...mockHospital,
        memo: '1行目のメモ\n2行目のメモ\n3行目のメモ',
      };

      wrapper = createWrapper({ hospital: hospitalWithMultilineMemo });

      // メモが表示されていることを確認
      expect(wrapper.text()).toContain('1行目のメモ');
      expect(wrapper.text()).toContain('2行目のメモ');
      expect(wrapper.text()).toContain('3行目のメモ');
    });

    it('オプション項目が空の場合は表示されない', () => {
      const minimalHospital = {
        ...mockHospital,
        address: undefined,
        phone: undefined,
        memo: undefined,
      };

      wrapper = createWrapper({ hospital: minimalHospital });

      // 住所、電話番号、メモが表示されていないことを確認
      expect(wrapper.text()).not.toContain('東京都渋谷区');
      expect(wrapper.text()).not.toContain('03-1234-5678');
      expect(wrapper.text()).not.toContain('テスト用の病院です');
    });
  });
});
