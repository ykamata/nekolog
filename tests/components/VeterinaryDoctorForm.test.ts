import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryDoctorForm from '~/components/VeterinaryDoctorForm.vue';
import type { VeterinaryDoctor, VeterinaryHospital } from '~/types/veterinary-master';

// Mock composables
const mockHospitals = ref<VeterinaryHospital[]>([
  {
    id: 1,
    name: 'テスト動物病院',
    address: 'テスト住所',
    phone: '03-1234-5678',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

const mockFetchHospitals = vi.fn();

vi.mock('~/composables/useVeterinaryHospitals', () => ({
  useVeterinaryHospitals: () => ({
    hospitals: mockHospitals,
    fetchHospitals: mockFetchHospitals,
  }),
}));

describe('VeterinaryDoctorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('新規作成モードで正しくレンダリングされる', async () => {
    const wrapper = mount(VeterinaryDoctorForm, {
      props: {
        mode: 'create',
      },
    });

    expect(wrapper.find('h2').text()).toBe('先生登録');
    expect(wrapper.find('input[id="name"]').exists()).toBe(true);
    expect(wrapper.find('select[id="hospitalId"]').exists()).toBe(true);
    expect(wrapper.find('input[id="specialization"]').exists()).toBe(true);
  });

  it('編集モードで既存データが表示される', async () => {
    const mockDoctor: VeterinaryDoctor = {
      id: 1,
      name: 'テスト先生',
      hospitalId: 1,
      specialization: '内科',
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const wrapper = mount(VeterinaryDoctorForm, {
      props: {
        mode: 'edit',
        doctor: mockDoctor,
      },
    });

    expect(wrapper.find('h2').text()).toBe('先生情報編集');

    // フォームに既存データが入力されているか確認
    const nameInput = wrapper.find('input[id="name"]') as any;
    expect(nameInput.element.value).toBe('テスト先生');

    const hospitalSelect = wrapper.find('select[id="hospitalId"]') as any;
    expect(hospitalSelect.element.value).toBe('hospital-1');

    const specializationInput = wrapper.find('input[id="specialization"]') as any;
    expect(specializationInput.element.value).toBe('内科');
  });

  it('必須項目が未入力の場合、送信ボタンが無効になる', async () => {
    const wrapper = mount(VeterinaryDoctorForm, {
      props: {
        mode: 'create',
      },
    });

    const submitButton = wrapper.find('button[type="submit"]');
    expect(submitButton.attributes('disabled')).toBeDefined();
  });

  it('有効なデータが入力された場合、送信ボタンが有効になる', async () => {
    const wrapper = mount(VeterinaryDoctorForm, {
      props: {
        mode: 'create',
      },
    });

    // 先生名を入力
    const nameInput = wrapper.find('input[id="name"]');
    await nameInput.setValue('テスト先生');

    // フォームの状態が更新されるまで待機
    await wrapper.vm.$nextTick();

    const submitButton = wrapper.find('button[type="submit"]');
    expect(submitButton.attributes('disabled')).toBeUndefined();
  });

  it('フォーム送信時にsaveイベントが発火される', async () => {
    const wrapper = mount(VeterinaryDoctorForm, {
      props: {
        mode: 'create',
      },
    });

    // 先生名を入力
    const nameInput = wrapper.find('input[id="name"]');
    await nameInput.setValue('テスト先生');

    // 専門分野を入力
    const specializationInput = wrapper.find('input[id="specialization"]');
    await specializationInput.setValue('内科');

    // フォームを送信
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    // saveイベントが発火されたか確認
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')?.[0]).toEqual([
      {
        name: 'テスト先生',
        hospitalId: undefined,
        specialization: '内科',
      },
    ]);
  });

  it('キャンセルボタンクリック時にcancelイベントが発火される', async () => {
    const wrapper = mount(VeterinaryDoctorForm, {
      props: {
        mode: 'create',
      },
    });

    const cancelButton = wrapper.find('button[type="button"]');
    await cancelButton.trigger('click');

    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('病院が選択された場合、正しい値が設定される', async () => {
    const wrapper = mount(VeterinaryDoctorForm, {
      props: {
        mode: 'create',
      },
    });

    const hospitalSelect = wrapper.find('select[id="hospitalId"]');
    await hospitalSelect.setValue('hospital-1');

    // 先生名を入力してフォームを送信
    const nameInput = wrapper.find('input[id="name"]');
    await nameInput.setValue('テスト先生');

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(wrapper.emitted('save')?.[0]).toEqual([
      {
        name: 'テスト先生',
        hospitalId: 1,
        specialization: undefined,
      },
    ]);
  });
});
