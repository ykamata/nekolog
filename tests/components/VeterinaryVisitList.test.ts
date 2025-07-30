import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryVisitList from '~/components/VeterinaryVisitList.vue';
import type { Cat } from '~/types/cat-meal';
import type { VeterinaryVisitWithRelations } from '~/types/veterinary-visit';

describe('VeterinaryVisitList', () => {
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

  const mockVisits: VeterinaryVisitWithRelations[] = [
    {
      id: 'visit1',
      catId: 'cat1',
      visitDate: new Date('2024-01-15T10:00:00Z'),
      hospitalId: 'hospital1',
      doctorId: 'doctor1',
      cost: 5000,
      notes: 'テストメモ1',
      hasBloodTest: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: mockCats[0],
      hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: { id: 'doctor1', name: 'テスト先生', hospitalId: 'hospital1', specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
      treatments: [
        { id: 'treatment1', name: '健康診断', category: '診察', description: '', createdAt: new Date(), updatedAt: new Date() },
        { id: 'treatment2', name: 'ワクチン接種', category: '予防', description: '', createdAt: new Date(), updatedAt: new Date() },
      ],
    },
    {
      id: 'visit2',
      catId: 'cat2',
      visitDate: new Date('2024-01-20T14:00:00Z'),
      hospitalId: 'hospital1',
      doctorId: null,
      cost: 3000,
      notes: 'テストメモ2',
      hasBloodTest: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: mockCats[1],
      hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: null,
      treatments: [
        { id: 'treatment3', name: '爪切り', category: 'ケア', description: '', createdAt: new Date(), updatedAt: new Date() },
      ],
    },
  ];

  const defaultProps = {
    visits: mockVisits,
    showActions: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('一覧表示', () => {
    it('通院記録一覧が正しく表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      expect(wrapper.find('[data-testid="visit-list"]').exists()).toBe(true);
      expect(wrapper.findAll('[data-testid^="visit-item"]')).toHaveLength(2);
    });

    it('通院記録の詳細情報が表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const firstVisit = wrapper.find('[data-testid="visit-item-visit1"]');

      // 基本情報の表示確認
      expect(firstVisit.text()).toContain('テスト猫1');
      expect(firstVisit.text()).toContain('テスト動物病院');
      expect(firstVisit.text()).toContain('テスト先生');
      expect(firstVisit.text()).toContain('5,000円');
      expect(firstVisit.text()).toContain('2024年1月15日');

      // 処方内容の表示確認
      expect(firstVisit.text()).toContain('健康診断');
      expect(firstVisit.text()).toContain('ワクチン接種');

      // メモの表示確認
      expect(firstVisit.text()).toContain('テストメモ1');
    });

    it('血液検査マークが正しく表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      // 血液検査ありの記録にマークが表示される
      const firstVisit = wrapper.find('[data-testid="visit-item-visit1"]');
      expect(firstVisit.find('[data-testid="blood-test-badge"]').exists()).toBe(true);

      // 血液検査なしの記録にはマークが表示されない
      const secondVisit = wrapper.find('[data-testid="visit-item-visit2"]');
      expect(secondVisit.find('[data-testid="blood-test-badge"]').exists()).toBe(false);
    });

    it('先生情報がない場合は表示されない', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const secondVisit = wrapper.find('[data-testid="visit-item-visit2"]');
      expect(secondVisit.find('[data-testid="doctor-info"]').exists()).toBe(false);
    });

    it('時系列順（新しい順）で表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const visitItems = wrapper.findAll('[data-testid^="visit-item"]');

      // 新しい記録（visit2: 1月20日）が最初に表示される
      expect(visitItems[0].attributes('data-testid')).toBe('visit-item-visit2');
      // 古い記録（visit1: 1月15日）が次に表示される
      expect(visitItems[1].attributes('data-testid')).toBe('visit-item-visit1');
    });
  });

  describe('アクション機能', () => {
    it('編集ボタンが表示され、クリックイベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const editButton = wrapper.find('[data-testid="edit-button-visit1"]');
      expect(editButton.exists()).toBe(true);

      await editButton.trigger('click');

      expect(wrapper.emitted('edit')).toBeTruthy();
      expect(wrapper.emitted('edit')[0]).toEqual([mockVisits[0]]);
    });

    it('削除ボタンが表示され、クリックイベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const deleteButton = wrapper.find('[data-testid="delete-button-visit1"]');
      expect(deleteButton.exists()).toBe(true);

      await deleteButton.trigger('click');

      expect(wrapper.emitted('delete')).toBeTruthy();
      expect(wrapper.emitted('delete')[0]).toEqual([mockVisits[0]]);
    });

    it('詳細表示ボタンが表示され、クリックイベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const viewButton = wrapper.find('[data-testid="view-button-visit1"]');
      expect(viewButton.exists()).toBe(true);

      await viewButton.trigger('click');

      expect(wrapper.emitted('view')).toBeTruthy();
      expect(wrapper.emitted('view')[0]).toEqual([mockVisits[0]]);
    });

    it('showActionsがfalseの場合、アクションボタンが表示されない', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showActions: false,
        },
      });

      expect(wrapper.find('[data-testid="edit-button-visit1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="delete-button-visit1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="view-button-visit1"]').exists()).toBe(false);
    });
  });

  describe('検索・フィルタリング機能', () => {
    it('検索ボックスが表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showSearch: true,
        },
      });

      expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true);
    });

    it('検索機能が動作する', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showSearch: true,
        },
      });

      const searchInput = wrapper.find('[data-testid="search-input"]');
      await searchInput.setValue('テスト猫1');

      expect(wrapper.emitted('search')).toBeTruthy();
      expect(wrapper.emitted('search')[0]).toEqual(['テスト猫1']);
    });

    it('猫フィルターが動作する', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showCatFilter: true,
          cats: mockCats,
        },
      });

      const catFilter = wrapper.find('[data-testid="cat-filter"]');
      await catFilter.setValue('cat1');

      expect(wrapper.emitted('catFilterChanged')).toBeTruthy();
      expect(wrapper.emitted('catFilterChanged')[0]).toEqual(['cat1']);
    });

    it('血液検査フィルターが動作する', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showBloodTestFilter: true,
        },
      });

      const bloodTestFilter = wrapper.find('[data-testid="blood-test-filter"]');
      await bloodTestFilter.setChecked(true);

      expect(wrapper.emitted('bloodTestFilterChanged')).toBeTruthy();
      expect(wrapper.emitted('bloodTestFilterChanged')[0]).toEqual([true]);
    });
  });
  describe('ローディング状態', () => {
    it('ローディング中はスピナーが表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          loading: true,
        },
      });

      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="visit-list"]').exists()).toBe(false);
    });

    it('ローディング完了後は一覧が表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          loading: false,
        },
      });

      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="visit-list"]').exists()).toBe(true);
    });
  });

  describe('空データ状態', () => {
    it('データが空の場合、適切なメッセージが表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          visits: [],
        },
      });

      expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="empty-state"]').text()).toContain('通院記録がありません');
    });

    it('検索結果が空の場合、適切なメッセージが表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          visits: [],
          searchQuery: 'テスト検索',
        },
      });

      expect(wrapper.find('[data-testid="no-search-results"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="no-search-results"]').text()).toContain('検索結果がありません');
    });
  });

  describe('ページネーション', () => {
    it('ページネーションが表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showPagination: true,
          totalCount: 50,
          currentPage: 1,
          pageSize: 10,
        },
      });

      expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(true);
    });

    it('ページ変更イベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showPagination: true,
          totalCount: 50,
          currentPage: 1,
          pageSize: 10,
        },
      });

      const nextPageButton = wrapper.find('[data-testid="next-page-button"]');
      await nextPageButton.trigger('click');

      expect(wrapper.emitted('pageChanged')).toBeTruthy();
      expect(wrapper.emitted('pageChanged')[0]).toEqual([2]);
    });
  });

  describe('ソート機能', () => {
    it('ソートボタンが表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showSort: true,
        },
      });

      expect(wrapper.find('[data-testid="sort-date-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="sort-cost-button"]').exists()).toBe(true);
    });

    it('日付ソートが動作する', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showSort: true,
        },
      });

      const sortDateButton = wrapper.find('[data-testid="sort-date-button"]');
      await sortDateButton.trigger('click');

      expect(wrapper.emitted('sortChanged')).toBeTruthy();
      expect(wrapper.emitted('sortChanged')[0]).toEqual(['date', 'asc']);
    });

    it('費用ソートが動作する', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          showSort: true,
        },
      });

      const sortCostButton = wrapper.find('[data-testid="sort-cost-button"]');
      await sortCostButton.trigger('click');

      expect(wrapper.emitted('sortChanged')).toBeTruthy();
      expect(wrapper.emitted('sortChanged')[0]).toEqual(['cost', 'desc']);
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示でレイアウトが適切に調整される', () => {
      // モバイル画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const list = wrapper.find('[data-testid="visit-list"]');
      expect(list.classes()).toContain('mobile-layout');
    });

    it('タブレット表示でレイアウトが適切に調整される', () => {
      // タブレット画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const list = wrapper.find('[data-testid="visit-list"]');
      expect(list.classes()).toContain('tablet-layout');
    });

    it('モバイルでは詳細情報が折りたたまれる', () => {
      // モバイル画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const visitItem = wrapper.find('[data-testid="visit-item-visit1"]');
      expect(visitItem.find('[data-testid="collapsed-details"]').exists()).toBe(true);
    });
  });
  describe('アクセシビリティ', () => {
    it('一覧項目に適切なaria属性が設定されている', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const visitItem = wrapper.find('[data-testid="visit-item-visit1"]');
      expect(visitItem.attributes('role')).toBe('listitem');
      expect(visitItem.attributes('aria-label')).toContain('テスト猫1の通院記録');
    });

    it('アクションボタンに適切なaria-labelが設定されている', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const editButton = wrapper.find('[data-testid="edit-button-visit1"]');
      const deleteButton = wrapper.find('[data-testid="delete-button-visit1"]');
      const viewButton = wrapper.find('[data-testid="view-button-visit1"]');

      expect(editButton.attributes('aria-label')).toContain('編集');
      expect(deleteButton.attributes('aria-label')).toContain('削除');
      expect(viewButton.attributes('aria-label')).toContain('詳細表示');
    });

    it('血液検査バッジに適切な説明が設定されている', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const bloodTestBadge = wrapper.find('[data-testid="blood-test-badge"]');
      expect(bloodTestBadge.attributes('aria-label')).toBe('血液検査実施');
    });

    it('キーボードナビゲーションが動作する', async () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const editButton = wrapper.find('[data-testid="edit-button-visit1"]');
      await editButton.trigger('keydown.enter');

      expect(wrapper.emitted('edit')).toBeTruthy();
    });
  });

  describe('データフォーマット', () => {
    it('日付が正しくフォーマットされる', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const visitItem = wrapper.find('[data-testid="visit-item-visit1"]');
      expect(visitItem.text()).toContain('2024年1月15日');
    });

    it('費用が正しくフォーマットされる', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const visitItem = wrapper.find('[data-testid="visit-item-visit1"]');
      expect(visitItem.text()).toContain('5,000円');
    });

    it('処方内容が正しく表示される', () => {
      const wrapper = mount(VeterinaryVisitList, {
        props: defaultProps,
      });

      const visitItem = wrapper.find('[data-testid="visit-item-visit1"]');
      const treatments = visitItem.findAll('[data-testid^="treatment-tag"]');

      expect(treatments).toHaveLength(2);
      expect(treatments[0].text()).toBe('健康診断');
      expect(treatments[1].text()).toBe('ワクチン接種');
    });

    it('長いメモが適切に省略される', () => {
      const longNoteVisit = {
        ...mockVisits[0],
        notes: 'a'.repeat(200), // 長いメモ
      };

      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          visits: [longNoteVisit],
        },
      });

      const visitItem = wrapper.find('[data-testid="visit-item-visit1"]');
      const notesElement = visitItem.find('[data-testid="notes-text"]');

      expect(notesElement.text().length).toBeLessThan(200);
      expect(notesElement.text()).toContain('...');
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なデータが含まれていても正常に動作する', () => {
      const invalidVisits = [
        {
          ...mockVisits[0],
          visitDate: null, // 無効な日付
          cost: null, // 無効な費用
        },
      ];

      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          visits: invalidVisits,
        },
      });

      // エラーが発生せずに一覧が表示される
      expect(wrapper.find('[data-testid="visit-list"]').exists()).toBe(true);
    });

    it('関連データが欠けていても正常に動作する', () => {
      const incompleteVisits = [
        {
          ...mockVisits[0],
          cat: null, // 猫データなし
          hospital: null, // 病院データなし
          treatments: [], // 処方内容なし
        },
      ];

      const wrapper = mount(VeterinaryVisitList, {
        props: {
          ...defaultProps,
          visits: incompleteVisits,
        },
      });

      // エラーが発生せずに一覧が表示される
      expect(wrapper.find('[data-testid="visit-list"]').exists()).toBe(true);
    });
  });
});
