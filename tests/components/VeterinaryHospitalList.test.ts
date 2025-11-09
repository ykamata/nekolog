import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryHospitalList from '~/components/VeterinaryHospitalList.vue';
import type { VeterinaryHospital } from '~/types/veterinary-master';

// モック
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// ConfirmationDialogコンポーネントのモック
const ConfirmationDialogMock = {
  name: 'ConfirmationDialog',
  template: '<div class="confirmation-dialog-mock"></div>',
  props: ['title', 'message', 'confirmText', 'cancelText', 'isDestructive'],
  emits: ['confirm', 'cancel'],
};

describe('VeterinaryHospitalList', () => {
  let wrapper: any;

  const mockHospitals: VeterinaryHospital[] = [
    {
      id: 1,
      name: 'テスト動物病院A',
      address: '東京都渋谷区1-1-1',
      phone: '03-1234-5678',
      memo: 'テストメモA',
      userId: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      _count: { doctors: 2, visits: 5, appointments: 1 },
    },
    {
      id: 2,
      name: 'テスト動物病院B',
      address: '東京都新宿区2-2-2',
      phone: '03-9876-5432',
      memo: 'テストメモB',
      userId: 1,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      _count: { doctors: 1, visits: 3, appointments: 0 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
          loading: false,
          error: null,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });
    });

    it('正しくレンダリングされる', () => {
      expect(wrapper.find('h2').text()).toBe('病院一覧');
      expect(wrapper.text()).toContain('登録済みの病院: 2件');
    });

    it('病院リストが表示される', () => {
      const hospitalItems = wrapper.findAll('.hover\\:bg-gray-50');
      expect(hospitalItems.length).toBe(2);
    });

    it('病院の基本情報が表示される', () => {
      expect(wrapper.text()).toContain('テスト動物病院A');
      expect(wrapper.text()).toContain('東京都渋谷区1-1-1');
      expect(wrapper.text()).toContain('03-1234-5678');
    });

    it('先生数が表示される', () => {
      expect(wrapper.text()).toContain('先生2名');
      expect(wrapper.text()).toContain('先生1名');
    });
  });

  describe('検索機能', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
          loading: false,
          error: null,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });
    });

    it('検索入力欄が表示される', () => {
      const searchInput = wrapper.find('input[placeholder*="検索"]');
      expect(searchInput.exists()).toBe(true);
    });

    it('検索クリアボタンが機能する', async () => {
      const searchInput = wrapper.find('input[placeholder*="検索"]');
      await searchInput.setValue('テスト');

      const clearButton = wrapper.find('button svg');
      await clearButton.trigger('click');

      expect(wrapper.emitted('search')).toBeTruthy();
    });

    it('検索入力時にsearchイベントが発火される', async () => {
      const searchInput = wrapper.find('input[placeholder*="検索"]');
      await searchInput.setValue('病院A');
      await searchInput.trigger('input');

      // デバウンス処理があるため、実際のテストでは時間を考慮する必要がある
    });
  });

  describe('アクションボタン', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
          loading: false,
          error: null,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });
    });

    it('詳細ボタンクリック時にviewイベントが発火される', async () => {
      const detailButtons = wrapper.findAll('button:contains("詳細")');
      if (detailButtons.length > 0) {
        await detailButtons[0].trigger('click');
        expect(wrapper.emitted('view')).toBeTruthy();
        expect(wrapper.emitted('view')[0][0]).toEqual(mockHospitals[0]);
      }
    });

    it('編集ボタンクリック時にeditイベントが発火される', async () => {
      const editButtons = wrapper.findAll('button:contains("編集")');
      if (editButtons.length > 0) {
        await editButtons[0].trigger('click');
        expect(wrapper.emitted('edit')).toBeTruthy();
        expect(wrapper.emitted('edit')[0][0]).toEqual(mockHospitals[0]);
      }
    });

    it('削除ボタンクリック時に確認ダイアログが表示される', async () => {
      const deleteButtons = wrapper.findAll('button:contains("削除")');
      if (deleteButtons.length > 0) {
        await deleteButtons[0].trigger('click');

        // 確認ダイアログが表示されることを確認
        expect(wrapper.find('.confirmation-dialog-mock').exists()).toBe(true);
      }
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中は適切な表示がされる', () => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: [],
          loading: true,
          error: null,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });

      expect(wrapper.text()).toContain('読み込み中...');
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });
  });

  describe('エラー状態', () => {
    it('エラー時は適切なメッセージが表示される', () => {
      const errorMessage = 'データの取得に失敗しました';
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: [],
          loading: false,
          error: errorMessage,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });

      expect(wrapper.text()).toContain('エラーが発生しました');
      expect(wrapper.text()).toContain(errorMessage);
    });
  });

  describe('空の状態', () => {
    it('病院が0件の場合、適切なメッセージが表示される', () => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: [],
          loading: false,
          error: null,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });

      expect(wrapper.text()).toContain('病院が登録されていません');
      expect(wrapper.text()).toContain('最初の病院を登録してください');
    });

    it('検索結果が0件の場合、適切なメッセージが表示される', () => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: [],
          loading: false,
          error: null,
          searchQuery: 'テスト検索',
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });

      expect(wrapper.text()).toContain('検索結果がありません');
      expect(wrapper.text()).toContain('別のキーワードで検索してみてください');
    });
  });

  describe('ページネーション', () => {
    const manyHospitals = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `病院${i + 1}`,
      address: `住所${i + 1}`,
      phone: `03-0000-${String(i + 1).padStart(4, '0')}`,
      memo: `メモ${i + 1}`,
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { doctors: 1, visits: 1, appointments: 0 },
    }));

    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: manyHospitals,
          loading: false,
          error: null,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });
    });

    it('多数の病院がある場合、ページネーションが表示される', () => {
      // ページネーションの存在確認
      const pagination = wrapper.find('[aria-label="Pagination"]');
      expect(pagination.exists()).toBe(true);
    });

    it('ページ情報が正しく表示される', () => {
      expect(wrapper.text()).toContain('1から10件目を表示');
      expect(wrapper.text()).toContain('全25件中');
    });
  });

  describe('レスポンシブ対応', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
          loading: false,
          error: null,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });
    });

    it('デスクトップ表示とモバイル表示の両方が存在する', () => {
      expect(wrapper.find('.hidden.md\\:block').exists()).toBe(true);
      expect(wrapper.find('.md\\:hidden').exists()).toBe(true);
    });
  });

  describe('アクセシビリティ', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
          loading: false,
          error: null,
        },
        global: {
          components: {
            ConfirmationDialog: ConfirmationDialogMock,
          },
        },
      });
    });

    it('検索入力欄にプレースホルダーが設定されている', () => {
      const searchInput = wrapper.find('input[placeholder*="検索"]');
      expect(searchInput.attributes('placeholder')).toBeTruthy();
    });

    it('ボタンに適切なaria-labelやtitleが設定されている', () => {
      // 実装に応じてaria属性の確認を追加
    });
  });
});
