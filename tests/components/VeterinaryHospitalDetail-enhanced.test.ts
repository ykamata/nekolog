import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryHospitalDetail from '~/components/VeterinaryHospitalDetail.vue';
import type { VeterinaryHospital, VeterinaryDoctor } from '~/types/veterinary-master';

describe('VeterinaryHospitalDetail', () => {
  let wrapper: any;

  const mockHospital: VeterinaryHospital = {
    id: 1,
    name: 'テスト動物病院',
    address: '東京都渋谷区テスト1-2-3',
    phone: '03-1234-5678',
    memo: 'テスト用の病院です。\n複数行のメモです。',
    userId: 1,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-20T15:45:00Z'),
    doctors: [
      {
        id: 1,
        name: '田中先生',
        specialty: '内科',
        hospitalId: 1,
        userId: 1,
        createdAt: new Date('2024-01-16T09:00:00Z'),
        updatedAt: new Date('2024-01-16T09:00:00Z'),
      },
      {
        id: 2,
        name: '佐藤先生',
        specialty: '外科',
        hospitalId: 1,
        userId: 1,
        createdAt: new Date('2024-01-17T14:30:00Z'),
        updatedAt: new Date('2024-01-17T14:30:00Z'),
      },
    ],
  };

  const mockHospitalWithoutOptionalFields: VeterinaryHospital = {
    id: 2,
    name: 'シンプル病院',
    address: null,
    phone: null,
    memo: null,
    userId: 1,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-20T15:45:00Z'),
    doctors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('病院情報が正しく表示される', () => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: mockHospital,
          loading: false,
          error: null,
        },
      });

      // 病院名
      expect(wrapper.text()).toContain('テスト動物病院');

      // 住所
      expect(wrapper.text()).toContain('東京都渋谷区テスト1-2-3');

      // 電話番号
      expect(wrapper.text()).toContain('03-1234-5678');

      // 電話番号リンク
      const phoneLink = wrapper.find('a[href="tel:03-1234-5678"]');
      expect(phoneLink.exists()).toBe(true);

      // 登録日
      expect(wrapper.text()).toContain('2024年1月15日');

      // メモ
      expect(wrapper.text()).toContain('テスト用の病院です。');
      expect(wrapper.text()).toContain('複数行のメモです。');
    });

    it('オプション項目がない場合、該当項目が表示されない', () => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: mockHospitalWithoutOptionalFields,
          loading: false,
          error: null,
        },
      });

      // 病院名は表示される
      expect(wrapper.text()).toContain('シンプル病院');

      // 住所、電話番号、メモは表示されない
      expect(wrapper.text()).not.toContain('住所');
      expect(wrapper.text()).not.toContain('電話番号');
      expect(wrapper.text()).not.toContain('メモ');

      // 電話番号リンクも存在しない
      const phoneLink = wrapper.find('a[href^="tel:"]');
      expect(phoneLink.exists()).toBe(false);
    });

    it('所属先生一覧が正しく表示される', () => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: mockHospital,
          loading: false,
          error: null,
        },
      });

      // 先生数
      expect(wrapper.text()).toContain('(2名)');

      // 先生名
      expect(wrapper.text()).toContain('田中先生');
      expect(wrapper.text()).toContain('佐藤先生');

      // 専門分野
      expect(wrapper.text()).toContain('専門分野: 内科');
      expect(wrapper.text()).toContain('専門分野: 外科');
    });

    it('所属先生がいない場合、適切なメッセージが表示される', () => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: mockHospitalWithoutOptionalFields,
          loading: false,
          error: null,
        },
      });

      expect(wrapper.text()).toContain('この病院に所属する先生はまだ登録されていません');
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中は適切な表示がされる', () => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: null,
          loading: true,
          error: null,
        },
      });

      expect(wrapper.text()).toContain('読み込み中...');
      expect(wrapper.find('.animate-spin').exists()).toBe(true);

      // 病院情報は表示されない
      expect(wrapper.text()).not.toContain('基本情報');
    });
  });

  describe('エラー状態', () => {
    it('エラーメッセージが表示される', () => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: null,
          loading: false,
          error: 'データの取得に失敗しました',
        },
      });

      expect(wrapper.text()).toContain('エラーが発生しました');
      expect(wrapper.text()).toContain('データの取得に失敗しました');

      // エラーアイコンが表示される
      expect(wrapper.find('svg').exists()).toBe(true);

      // 病院情報は表示されない
      expect(wrapper.text()).not.toContain('基本情報');
    });
  });

  describe('イベント発火', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: mockHospital,
          loading: false,
          error: null,
        },
      });
    });

    it('編集ボタンクリック時にeditイベントが発火される', async () => {
      const editButton = wrapper.find('button:contains("編集")');
      await editButton.trigger('click');

      expect(wrapper.emitted('edit')).toBeTruthy();
      expect(wrapper.emitted('edit')[0]).toEqual([mockHospital]);
    });

    it('削除ボタンクリック時にdeleteイベントが発火される', async () => {
      const deleteButton = wrapper.find('button:contains("削除")');
      await deleteButton.trigger('click');

      expect(wrapper.emitted('delete')).toBeTruthy();
      expect(wrapper.emitted('delete')[0]).toEqual([mockHospital.id]);
    });

    it('先生を追加ボタンクリック時にaddDoctorイベントが発火される', async () => {
      const addDoctorButton = wrapper.find('button:contains("先生を追加")');
      await addDoctorButton.trigger('click');

      expect(wrapper.emitted('addDoctor')).toBeTruthy();
      expect(wrapper.emitted('addDoctor')[0]).toEqual([mockHospital.id]);
    });

    it('先生の編集ボタンクリック時にeditDoctorイベントが発火される', async () => {
      const doctorEditButtons = wrapper.findAll('button:contains("編集")');
      // 最初の先生の編集ボタン（病院の編集ボタンではない）
      const firstDoctorEditButton = doctorEditButtons.find(button =>
        button.element.closest('.p-4') !== null,
      );

      if (firstDoctorEditButton) {
        await firstDoctorEditButton.trigger('click');

        expect(wrapper.emitted('editDoctor')).toBeTruthy();
        expect(wrapper.emitted('editDoctor')[0]).toEqual([mockHospital.doctors![0]]);
      }
    });

    it('先生の削除ボタンクリック時にdeleteDoctorイベントが発火される', async () => {
      const doctorDeleteButtons = wrapper.findAll('button:contains("削除")');
      // 最初の先生の削除ボタン（病院の削除ボタンではない）
      const firstDoctorDeleteButton = doctorDeleteButtons.find(button =>
        button.element.closest('.p-4') !== null,
      );

      if (firstDoctorDeleteButton) {
        await firstDoctorDeleteButton.trigger('click');

        expect(wrapper.emitted('deleteDoctor')).toBeTruthy();
        expect(wrapper.emitted('deleteDoctor')[0]).toEqual([mockHospital.doctors![0].id]);
      }
    });
  });

  describe('条件付きレンダリング', () => {
    it('hospitalがnullの場合、何も表示されない', () => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: null,
          loading: false,
          error: null,
        },
      });

      expect(wrapper.text()).toBe('');
    });

    it('専門分野がない先生の場合、専門分野が表示されない', () => {
      const hospitalWithDoctorNoSpecialty: VeterinaryHospital = {
        ...mockHospital,
        doctors: [
          {
            id: 3,
            name: '山田先生',
            specialty: null,
            hospitalId: 1,
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: hospitalWithDoctorNoSpecialty,
          loading: false,
          error: null,
        },
      });

      expect(wrapper.text()).toContain('山田先生');
      expect(wrapper.text()).not.toContain('専門分野:');
    });
  });

  describe('アクセシビリティ', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: mockHospital,
          loading: false,
          error: null,
        },
      });
    });

    it('適切なセマンティック要素が使用されている', () => {
      // 定義リスト
      expect(wrapper.find('dl').exists()).toBe(true);
      expect(wrapper.findAll('dt').length).toBeGreaterThan(0);
      expect(wrapper.findAll('dd').length).toBeGreaterThan(0);

      // 見出し
      expect(wrapper.findAll('h4').length).toBeGreaterThan(0);
      expect(wrapper.findAll('h5').length).toBeGreaterThan(0);
    });

    it('ボタンに適切なaria属性やアイコンが設定されている', () => {
      const buttons = wrapper.findAll('button');

      // 各ボタンにSVGアイコンが含まれている
      buttons.forEach((button) => {
        expect(button.find('svg').exists()).toBe(true);
      });
    });

    it('電話番号リンクが適切に設定されている', () => {
      const phoneLink = wrapper.find('a[href="tel:03-1234-5678"]');
      expect(phoneLink.exists()).toBe(true);
      expect(phoneLink.classes()).toContain('text-blue-600');
      expect(phoneLink.classes()).toContain('hover:text-blue-800');
    });
  });

  describe('レスポンシブデザイン', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: mockHospital,
          loading: false,
          error: null,
        },
      });
    });

    it('グリッドレイアウトのクラスが適用されている', () => {
      const gridContainer = wrapper.find('.grid');
      expect(gridContainer.exists()).toBe(true);
      expect(gridContainer.classes()).toContain('grid-cols-1');
      expect(gridContainer.classes()).toContain('sm:grid-cols-2');
    });

    it('フレックスボックスのレスポンシブクラスが適用されている', () => {
      const flexContainer = wrapper.find('.flex.flex-col.sm\\:flex-row');
      expect(flexContainer.exists()).toBe(true);
    });

    it('ルートコンテナにレスポンシブクラスが適用されている', () => {
      const rootContainer = wrapper.find('.veterinary-hospital-detail');
      expect(rootContainer.exists()).toBe(true);
      expect(rootContainer.classes()).toContain('max-w-4xl');
    });
  });

  describe('日付フォーマット', () => {
    it('日付が正しい形式で表示される', () => {
      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: mockHospital,
          loading: false,
          error: null,
        },
      });

      // 日本語形式の日付が表示される
      expect(wrapper.text()).toContain('2024年1月15日');
    });

    it('異なる日付形式でも正しく表示される', () => {
      const hospitalWithStringDate: VeterinaryHospital = {
        ...mockHospital,
        createdAt: '2024-12-25T00:00:00Z' as any,
      };

      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: hospitalWithStringDate,
          loading: false,
          error: null,
        },
      });

      expect(wrapper.text()).toContain('2024年12月25日');
    });
  });

  describe('エッジケース', () => {
    it('hospitalプロパティがundefinedの場合でもエラーが発生しない', () => {
      expect(() => {
        wrapper = mount(VeterinaryHospitalDetail, {
          props: {
            hospital: undefined,
            loading: false,
            error: null,
          },
        });
      }).not.toThrow();
    });

    it('doctorsが空配列の場合、適切なメッセージが表示される', () => {
      const hospitalWithEmptyDoctors: VeterinaryHospital = {
        ...mockHospital,
        doctors: [],
      };

      wrapper = mount(VeterinaryHospitalDetail, {
        props: {
          hospital: hospitalWithEmptyDoctors,
          loading: false,
          error: null,
        },
      });

      expect(wrapper.text()).toContain('この病院に所属する先生はまだ登録されていません');
    });

    it('doctorsがundefinedの場合でもエラーが発生しない', () => {
      const hospitalWithUndefinedDoctors: VeterinaryHospital = {
        ...mockHospital,
        doctors: undefined as any,
      };

      expect(() => {
        wrapper = mount(VeterinaryHospitalDetail, {
          props: {
            hospital: hospitalWithUndefinedDoctors,
            loading: false,
            error: null,
          },
        });
      }).not.toThrow();
    });
  });
});
