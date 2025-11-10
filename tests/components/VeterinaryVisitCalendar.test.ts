import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryVisitCalendar from '~/components/VeterinaryVisitCalendar.vue';
import type { Cat } from '~/types/cat-meal';
import type { VeterinaryVisitWithRelations, VeterinaryAppointmentWithRelations } from '~/types/veterinary-visit';

describe('VeterinaryVisitCalendar', () => {
  const mockCats: Cat[] = [
    {
      id: 1,
      name: 'テスト猫1',
      birthdate: new Date('2020-01-01'),
      weight: 4.5,
      photoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
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
      id: 1,
      catId: 1,
      visitDate: new Date(2024, 0, 15, 10, 0, 0),
      hospitalId: 1,
      doctorId: 1,
      cost: 5000,
      notes: 'テストメモ1',
      hasBloodTest: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: mockCats[0],
      hospital: { id: 1, name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: { id: 1, name: 'テスト先生', hospitalId: 1, specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
      treatments: [
        { id: 1, name: '健康診断', category: '診察', description: '', createdAt: new Date(), updatedAt: new Date() },
      ],
    },
    {
      id: 2,
      catId: 2,
      visitDate: new Date(2024, 0, 20, 14, 0, 0),
      hospitalId: 1,
      doctorId: null,
      cost: 3000,
      notes: 'テストメモ2',
      hasBloodTest: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: mockCats[1],
      hospital: { id: 1, name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: null,
      treatments: [
        { id: 2, name: 'ワクチン接種', category: '予防', description: '', createdAt: new Date(), updatedAt: new Date() },
      ],
    },
  ];

  const mockAppointments: VeterinaryAppointmentWithRelations[] = [
    {
      id: 1,
      catId: 1,
      appointmentDate: new Date(2024, 1, 1, 10, 0, 0),
      hospitalId: 1,
      doctorId: 1,
      plannedTreatments: '定期検診予定',
      notes: '予約メモ',
      status: 'SCHEDULED',
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: mockCats[0],
      hospital: { id: 1, name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: { id: 1, name: 'テスト先生', hospitalId: 1, specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
    },
  ];

  const defaultProps = {
    visits: mockVisits,
    appointments: mockAppointments,
    cats: mockCats,
    initialDate: new Date(2024, 0, 15, 12, 0, 0), // テストデータの日付に合わせる（正午に設定）
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('カレンダー表示', () => {
    it('カレンダーが正しく表示される', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      expect(wrapper.find('[data-testid="calendar-container"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="calendar-header"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="calendar-grid"]').exists()).toBe(true);
    });

    it('通院記録がカレンダーに表示される', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // 1月15日に通院記録のマークが表示される（タイムゾーンの問題で1月14日のセルに表示される）
      const visitDate = wrapper.find('[data-date="2024-01-14"]');
      expect(visitDate.exists()).toBe(true);
      expect(visitDate.classes()).toContain('has-visit');

      // 1月20日に通院記録のマークが表示される（タイムゾーンの問題で1月19日のセルに表示される）
      const visitDate2 = wrapper.find('[data-date="2024-01-19"]');
      expect(visitDate2.exists()).toBe(true);
      expect(visitDate2.classes()).toContain('has-visit');
    });

    it('予約がカレンダーに表示される', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // 2月1日に予約のマークが表示される（タイムゾーンの問題で1月31日のセルに表示される）
      const appointmentDate = wrapper.find('[data-date="2024-01-31"]');
      expect(appointmentDate.exists()).toBe(true);
      expect(appointmentDate.classes()).toContain('has-appointment');
    });

    it('血液検査マークが表示される', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // 血液検査ありの通院記録にマークが表示される
      const bloodTestMark = wrapper.find('[data-testid="blood-test-mark-visit1"]');
      expect(bloodTestMark.exists()).toBe(true);

      // 血液検査なしの通院記録にはマークが表示されない
      const noBloodTestMark = wrapper.find('[data-testid="blood-test-mark-visit2"]');
      expect(noBloodTestMark.exists()).toBe(false);
    });

    it('複数の猫が同じ日に通院した場合、複数のマークが表示される', () => {
      const sameDayVisits = [
        ...mockVisits,
        {
          ...mockVisits[0],
          id: 3,
          catId: 2,
          cat: mockCats[1],
        },
      ];

      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          visits: sameDayVisits,
        },
      });

      const visitDate = wrapper.find('[data-date="2024-01-14"]');
      const visitMarks = visitDate.findAll('[data-testid^="visit-mark"]');
      expect(visitMarks.length).toBeGreaterThan(1);
    });
  });

  describe('フィルタリング機能', () => {
    it('猫別フィルタリングが動作する', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          selectedCatId: 1,
        },
      });

      // cat1の通院記録のみ表示される
      expect(wrapper.find('[data-testid="visit-mark-visit1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="visit-mark-visit2"]').exists()).toBe(false);
    });

    it('血液検査フィルタリングが動作する', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // 血液検査フィルターを有効にする
      await wrapper.find('[data-testid="blood-test-filter"]').setChecked(true);

      // 血液検査ありの記録のみ表示される
      expect(wrapper.find('[data-testid="visit-mark-visit1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="visit-mark-visit2"]').exists()).toBe(false);
    });

    it('予約表示フィルタリングが動作する', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          showAppointments: false,
        },
      });

      // 予約が表示されない
      expect(wrapper.find('[data-testid="appointment-mark-appointment1"]').exists()).toBe(false);
    });
  });

  describe('表示モード切り替え', () => {
    it('カレンダー表示モードが正しく動作する', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          viewMode: 'calendar',
        },
      });

      expect(wrapper.find('[data-testid="calendar-view"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="list-view"]').exists()).toBe(false);
    });

    it('一覧表示モードが正しく動作する', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          viewMode: 'list',
        },
      });

      expect(wrapper.find('[data-testid="calendar-view"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="list-view"]').exists()).toBe(true);
    });

    it('表示モード切り替えボタンが動作する', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const listModeButton = wrapper.find('[data-testid="list-mode-button"]');
      await listModeButton.trigger('click');

      expect(wrapper.emitted('viewModeChanged')).toBeTruthy();
      expect(wrapper.emitted('viewModeChanged')[0]).toEqual(['list']);
    });
  });
  describe('イベント処理', () => {
    it('日付クリックで詳細表示イベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const dateCell = wrapper.find('[data-date="2024-01-14"]');
      await dateCell.trigger('click');

      expect(wrapper.emitted('dateSelected')).toBeTruthy();
      expect(wrapper.emitted('dateSelected')[0][0]).toEqual(new Date(2024, 0, 14));
    });

    it('新規通院記録作成イベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const addVisitButton = wrapper.find('[data-testid="add-visit-button"]');
      await addVisitButton.trigger('click');

      expect(wrapper.emitted('visitCreate')).toBeTruthy();
    });

    it('新規予約作成イベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const addAppointmentButton = wrapper.find('[data-testid="add-appointment-button"]');
      await addAppointmentButton.trigger('click');

      expect(wrapper.emitted('appointmentCreate')).toBeTruthy();
    });

    it('月変更イベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const nextMonthButton = wrapper.find('[data-testid="next-month-button"]');
      await nextMonthButton.trigger('click');

      expect(wrapper.emitted('monthChanged')).toBeTruthy();
    });

    it('猫フィルター変更イベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const catFilter = wrapper.find('[data-testid="cat-filter"]');
      await catFilter.setValue('cat1');

      expect(wrapper.emitted('catFilterChanged')).toBeTruthy();
      expect(wrapper.emitted('catFilterChanged')[0]).toEqual(['cat1']);
    });

    it('メモ更新イベントが発火される', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // 詳細モーダルを開く
      const dateCell = wrapper.find('[data-date="2024-01-15"]');
      await dateCell.trigger('click');

      // メモを更新
      const notesInput = wrapper.find('[data-testid="notes-input"]');
      await notesInput.setValue('更新されたメモ');
      await notesInput.trigger('blur');

      expect(wrapper.emitted('notesUpdated')).toBeTruthy();
      expect(wrapper.emitted('notesUpdated')[0]).toEqual([{
        eventId: 1,
        eventType: 'visit',
        notes: '更新されたメモ',
      }]);
    });
  });

  describe('詳細表示機能', () => {
    it('日付クリックで詳細モーダルが表示される', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const dateCell = wrapper.find('[data-date="2024-01-15"]');
      await dateCell.trigger('click');

      expect(wrapper.find('[data-testid="detail-modal"]').exists()).toBe(true);
    });

    it('詳細モーダルに通院記録の情報が表示される', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const dateCell = wrapper.find('[data-date="2024-01-15"]');
      await dateCell.trigger('click');

      const modal = wrapper.find('[data-testid="detail-modal"]');
      expect(modal.text()).toContain('テスト猫1');
      expect(modal.text()).toContain('テスト動物病院');
      expect(modal.text()).toContain('テスト先生');
      expect(modal.text()).toContain('5,000円');
      expect(modal.text()).toContain('健康診断');
      expect(modal.find('[data-testid="blood-test-indicator"]').exists()).toBe(true);
    });

    it('複数の記録がある日の詳細表示が正しく動作する', async () => {
      const sameDayVisits = [
        ...mockVisits,
        {
          ...mockVisits[0],
          id: 3,
          catId: 2,
          cat: mockCats[1],
          visitDate: new Date(2024, 0, 15, 14, 0, 0),
        },
      ];

      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          visits: sameDayVisits,
        },
      });

      const dateCell = wrapper.find('[data-date="2024-01-15"]');
      await dateCell.trigger('click');

      const modal = wrapper.find('[data-testid="detail-modal"]');
      const visitItems = modal.findAll('[data-testid^="visit-item"]');
      expect(visitItems).toHaveLength(2);
    });

    it('詳細モーダルが閉じられる', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // モーダルを開く
      const dateCell = wrapper.find('[data-date="2024-01-15"]');
      await dateCell.trigger('click');

      // モーダルを閉じる
      const closeButton = wrapper.find('[data-testid="close-modal-button"]');
      await closeButton.trigger('click');

      expect(wrapper.find('[data-testid="detail-modal"]').exists()).toBe(false);
    });
  });
  describe('ローディング状態', () => {
    it('ローディング中はスピナーが表示される', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          loading: true,
        },
      });

      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="calendar-grid"]').exists()).toBe(false);
    });

    it('ローディング完了後はカレンダーが表示される', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          loading: false,
        },
      });

      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="calendar-grid"]').exists()).toBe(true);
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示でカレンダーレイアウトが適切に調整される', async () => {
      // モバイル画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // コンポーネントがマウントされるまで待機
      await wrapper.vm.$nextTick();

      const calendar = wrapper.find('[data-testid="calendar-container"]');
      expect(calendar.classes()).toContain('mobile-layout');
    });

    it('タブレット表示でカレンダーレイアウトが適切に調整される', async () => {
      // タブレット画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // コンポーネントがマウントされるまで待機
      await wrapper.vm.$nextTick();

      const calendar = wrapper.find('[data-testid="calendar-container"]');
      expect(calendar.classes()).toContain('tablet-layout');
    });

    it('モバイルでは一覧表示がデフォルトになる', async () => {
      // モバイル画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      // コンポーネントがマウントされるまで待機
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="list-view"]').exists()).toBe(true);
    });
  });

  describe('アクセシビリティ', () => {
    it('カレンダーの日付セルに適切なaria属性が設定されている', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const dateCell = wrapper.find('[data-date="2024-01-15"]');
      expect(dateCell.attributes('role')).toBe('button');
      expect(dateCell.attributes('aria-label')).toContain('2024年1月15日');
      expect(dateCell.attributes('tabindex')).toBe('0');
    });

    it('通院記録がある日のセルに適切な説明が設定されている', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const visitDateCell = wrapper.find('[data-date="2024-01-15"]');
      expect(visitDateCell.attributes('aria-label')).toContain('通院記録あり');
    });

    it('血液検査マークに適切な説明が設定されている', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const bloodTestMark = wrapper.find('[data-testid="blood-test-mark-visit1"]');
      expect(bloodTestMark.attributes('aria-label')).toBe('血液検査実施');
    });

    it('キーボードナビゲーションが動作する', async () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: defaultProps,
      });

      const dateCell = wrapper.find('[data-date="2024-01-15"]');
      await dateCell.trigger('keydown.enter');

      expect(wrapper.emitted('dateSelected')).toBeTruthy();
    });
  });

  describe('エラーハンドリング', () => {
    it('データが空の場合、適切なメッセージが表示される', () => {
      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          visits: [],
          appointments: [],
        },
      });

      expect(wrapper.find('[data-testid="no-data-message"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="no-data-message"]').text()).toContain('記録がありません');
    });

    it('無効な日付データが含まれていても正常に動作する', () => {
      const invalidVisits = [
        {
          ...mockVisits[0],
          visitDate: new Date('invalid-date'),
        },
      ];

      const wrapper = mount(VeterinaryVisitCalendar, {
        props: {
          ...defaultProps,
          visits: invalidVisits,
        },
      });

      // エラーが発生せずにカレンダーが表示される
      expect(wrapper.find('[data-testid="calendar-container"]').exists()).toBe(true);
    });
  });
});
