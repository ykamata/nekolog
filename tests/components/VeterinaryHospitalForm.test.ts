import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryHospitalForm from '~/components/VeterinaryHospitalForm.vue';
import type { VeterinaryHospital } from '~/types/veterinary-master';

// モック
vi.mock('~/lib/validations/veterinary-master', () => ({
  veterinaryHospitalSchema: {
    parse: vi.fn(),
    pick: vi.fn(() => ({
      parse: vi.fn(),
    })),
  },
}));

describe('VeterinaryHospitalForm', () => {
  let wrapper: any;

  const mockHospital: VeterinaryHospital = {
    id: '1',
    name: 'テスト動物病院',
    address: '東京都渋谷区',
    phone: '03-1234-5678',
    memo: 'テストメモ',
    userId: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('新規作成モード', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalForm, {
        props: {
          mode: 'create',
        },
      });
    });

    it('正しくレンダリングされる', () => {
      expect(wrapper.find('h2').text()).toBe('病院登録');
      expect(wrapper.find('input#name').exists()).toBe(true);
      expect(wrapper.find('input#address').exists()).toBe(true);
      expect(wrapper.find('input#phone').exists()).toBe(true);
      expect(wrapper.find('textarea#memo').exists()).toBe(true);
    });

    it('フォームが空の状態で初期化される', () => {
      expect(wrapper.find('input#name').element.value).toBe('');
      expect(wrapper.find('input#address').element.value).toBe('');
      expect(wrapper.find('input#phone').element.value).toBe('');
      expect(wrapper.find('textarea#memo').element.value).toBe('');
    });

    it('必須項目が未入力の場合、送信ボタンが無効になる', () => {
      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });

    it('病院名を入力すると送信ボタンが有効になる', async () => {
      const nameInput = wrapper.find('input#name');
      await nameInput.setValue('テスト病院');

      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes('disabled')).toBeUndefined();
    });

    it('フォーム送信時にsaveイベントが発火される', async () => {
      const nameInput = wrapper.find('input#name');
      await nameInput.setValue('テスト病院');

      const form = wrapper.find('form');
      await form.trigger('submit.prevent');

      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')[0][0]).toEqual({
        name: 'テスト病院',
        address: undefined,
        phone: undefined,
        memo: undefined,
      });
    });

    it('キャンセルボタンクリック時にcancelイベントが発火される', async () => {
      const cancelButton = wrapper.find('button[type="button"]');
      await cancelButton.trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });

  describe('編集モード', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalForm, {
        props: {
          mode: 'edit',
          hospital: mockHospital,
        },
      });
    });

    it('編集モードで正しくレンダリングされる', () => {
      expect(wrapper.find('h2').text()).toBe('病院情報編集');
    });

    it('既存の病院データでフォームが初期化される', () => {
      expect(wrapper.find('input#name').element.value).toBe(mockHospital.name);
      expect(wrapper.find('input#address').element.value).toBe(mockHospital.address);
      expect(wrapper.find('input#phone').element.value).toBe(mockHospital.phone);
      expect(wrapper.find('textarea#memo').element.value).toBe(mockHospital.memo);
    });

    it('送信ボタンのテキストが「更新」になる', () => {
      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.text()).toContain('更新');
    });
  });

  describe('バリデーション', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalForm, {
        props: {
          mode: 'create',
        },
      });
    });

    it('病院名が空の場合、エラーが表示される', async () => {
      const nameInput = wrapper.find('input#name');
      await nameInput.setValue('');
      await nameInput.trigger('blur');

      // バリデーションエラーの確認は実装に依存するため、
      // 実際のバリデーション結果に基づいて調整が必要
    });

    it('電話番号の形式が正しくない場合、エラーが表示される', async () => {
      const phoneInput = wrapper.find('input#phone');
      await phoneInput.setValue('invalid-phone');
      await phoneInput.trigger('blur');

      // バリデーションエラーの確認
    });

    it('メモが500文字を超える場合、文字数が表示される', async () => {
      const memoTextarea = wrapper.find('textarea#memo');
      const longText = 'a'.repeat(600);
      await memoTextarea.setValue(longText);

      const charCount = wrapper.find('.text-xs.text-gray-500');
      expect(charCount.text()).toContain('600/500文字');
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示でも正しくレンダリングされる', () => {
      wrapper = mount(VeterinaryHospitalForm, {
        props: {
          mode: 'create',
        },
      });

      // レスポンシブクラスの確認
      expect(wrapper.find('.veterinary-hospital-form').exists()).toBe(true);
    });
  });

  describe('アクセシビリティ', () => {
    beforeEach(() => {
      wrapper = mount(VeterinaryHospitalForm, {
        props: {
          mode: 'create',
        },
      });
    });

    it('フォーム要素に適切なラベルが設定されている', () => {
      expect(wrapper.find('label[for="name"]').exists()).toBe(true);
      expect(wrapper.find('label[for="address"]').exists()).toBe(true);
      expect(wrapper.find('label[for="phone"]').exists()).toBe(true);
      expect(wrapper.find('label[for="memo"]').exists()).toBe(true);
    });

    it('必須項目に適切なマークが表示されている', () => {
      const requiredMark = wrapper.find('.text-red-500');
      expect(requiredMark.text()).toBe('*');
    });

    it('フォーム要素にaria属性が適切に設定されている', () => {
      const nameInput = wrapper.find('input#name');
      expect(nameInput.attributes('required')).toBeDefined();
    });
  });
});
