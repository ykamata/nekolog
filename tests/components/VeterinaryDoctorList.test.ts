import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryDoctorList from '~/components/VeterinaryDoctorList.vue';
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

// Mock ConfirmationDialog component
vi.mock('~/components/ConfirmationDialog.vue', () => ({
  default: {
    name: 'ConfirmationDialog',
    template: '<div data-testid="confirmation-dialog"></div>',
  },
}));

describe('VeterinaryDoctorList', () => {
  const mockDoctors: VeterinaryDoctor[] = [
    {
      id: 1,
      name: 'テスト先生1',
      hospitalId: 1,
      specialization: '内科',
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      hospital: {
        id: 1,
        name: 'テスト動物病院',
        address: 'テスト住所',
        phone: '03-1234-5678',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 2,
      name: 'テスト先生2',
      hospitalId: null,
      specialization: '外科',
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      hospital: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('先生一覧が正しく表示される', () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: mockDoctors,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.find('h2').text()).toBe('先生一覧');
    expect(wrapper.text()).toContain('登録済みの先生: 2件');
    expect(wrapper.text()).toContain('テスト先生1');
    expect(wrapper.text()).toContain('テスト先生2');
  });

  it('ローディング状態が正しく表示される', () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: [],
        loading: true,
        error: null,
      },
    });

    expect(wrapper.text()).toContain('読み込み中...');
  });

  it('エラー状態が正しく表示される', () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: [],
        loading: false,
        error: 'テストエラー',
      },
    });

    expect(wrapper.text()).toContain('エラーが発生しました');
    expect(wrapper.text()).toContain('テストエラー');
  });

  it('先生が登録されていない場合の表示', () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: [],
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain('先生が登録されていません');
    expect(wrapper.text()).toContain('最初の先生を登録してください');
  });

  it('検索機能が動作する', async () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: mockDoctors,
        loading: false,
        error: null,
      },
    });

    const searchInput = wrapper.find('input[placeholder*="検索"]');
    await searchInput.setValue('テスト先生1');

    // デバウンス処理があるため、少し待機
    await new Promise(resolve => setTimeout(resolve, 350));

    expect(wrapper.emitted('search')).toBeTruthy();
  });

  it('病院フィルタが動作する', async () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: mockDoctors,
        loading: false,
        error: null,
      },
    });

    const hospitalSelect = wrapper.find('select');
    await hospitalSelect.setValue('hospital-1');

    expect(wrapper.emitted('hospital-filter')).toBeTruthy();
    expect(wrapper.emitted('hospital-filter')?.[0]).toEqual(['hospital-1']);
  });

  it('編集ボタンクリック時にeditイベントが発火される', async () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: mockDoctors,
        loading: false,
        error: null,
      },
    });

    const editButton = wrapper.find('button:contains("編集")');
    await editButton.trigger('click');

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockDoctors[0]]);
  });

  it('削除ボタンクリック時に確認ダイアログが表示される', async () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: mockDoctors,
        loading: false,
        error: null,
      },
    });

    const deleteButton = wrapper.find('button:contains("削除")');
    await deleteButton.trigger('click');

    expect(wrapper.find('[data-testid="confirmation-dialog"]').exists()).toBe(true);
  });

  it('専門分野が表示される', () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: mockDoctors,
        loading: false,
        error: null,
      },
    });

    expect(wrapper.text()).toContain('内科');
    expect(wrapper.text()).toContain('外科');
  });

  it('所属病院名が表示される', () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: mockDoctors,
        loading: false,
        error: null,
        showHospitalName: true,
      },
    });

    expect(wrapper.text()).toContain('テスト動物病院');
    expect(wrapper.text()).toContain('所属病院未設定');
  });

  it('検索結果が0件の場合の表示', () => {
    const wrapper = mount(VeterinaryDoctorList, {
      props: {
        doctors: [],
        loading: false,
        error: null,
        searchQuery: 'テスト検索',
      },
    });

    expect(wrapper.text()).toContain('検索結果がありません');
    expect(wrapper.text()).toContain('別の条件で検索してみてください');
  });
});
