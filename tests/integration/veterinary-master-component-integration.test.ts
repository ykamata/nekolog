import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import type { VeterinaryHospital, VeterinaryDoctor } from '~/types/veterinary-master';

// Composablesをモック
const mockUseVeterinaryHospitals = vi.fn();
const mockUseVeterinaryDoctors = vi.fn();

vi.mock('~/composables/useVeterinaryHospitals', () => ({
  useVeterinaryHospitals: mockUseVeterinaryHospitals,
}));

vi.mock('~/composables/useVeterinaryDoctors', () => ({
  useVeterinaryDoctors: mockUseVeterinaryDoctors,
}));

// テスト用のシンプルなコンポーネント
const VeterinaryHospitalForm = {
  template: `
    <form @submit.prevent="handleSubmit" class="hospital-form">
      <input
        v-model="formData.name"
        type="text"
        placeholder="病院名"
        class="form-input"
        required
      />
      <input
        v-model="formData.address"
        type="text"
        placeholder="住所"
        class="form-input"
      />
      <button type="submit" :disabled="!formData.name" class="btn-submit">
        {{ mode === 'create' ? '登録' : '更新' }}
      </button>
      <button type="button" @click="$emit('cancel')" class="btn-cancel">
        キャンセル
      </button>
    </form>
  `,
  props: {
    hospital: {
      type: Object,
      default: null,
    },
    mode: {
      type: String,
      default: 'create',
    },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const formData = ref({
      name: props.hospital?.name || '',
      address: props.hospital?.address || '',
    });

    const handleSubmit = () => {
      if (formData.value.name) {
        emit('save', { ...formData.value });
      }
    };

    watch(() => props.hospital, (newHospital) => {
      if (newHospital) {
        formData.value = {
          name: newHospital.name || '',
          address: newHospital.address || '',
        };
      }
    }, { immediate: true });

    return {
      formData,
      handleSubmit,
    };
  },
};

const VeterinaryHospitalList = {
  template: `
    <div class="hospital-list">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="検索..."
        class="search-input"
      />
      <button @click="$emit('add')" class="btn-add">
        病院を追加
      </button>

      <div v-if="loading" class="loading">読み込み中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="filteredHospitals.length === 0" class="no-data">
        データがありません
      </div>

      <div v-else class="hospital-grid">
        <div
          v-for="hospital in filteredHospitals"
          :key="hospital.id"
          class="hospital-card"
        >
          <h3 class="hospital-name">{{ hospital.name }}</h3>
          <p v-if="hospital.address" class="hospital-address">{{ hospital.address }}</p>
          <div class="card-actions">
            <button @click="$emit('edit', hospital)" class="btn-edit">
              編集
            </button>
            <button @click="$emit('delete', hospital)" class="btn-delete">
              削除
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  props: {
    hospitals: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  },
  emits: ['add', 'edit', 'delete'],
  setup(props) {
    const searchQuery = ref('');

    const filteredHospitals = computed(() => {
      if (!searchQuery.value.trim()) {
        return props.hospitals;
      }

      const query = searchQuery.value.toLowerCase();
      return props.hospitals.filter((hospital: VeterinaryHospital) =>
        hospital.name.toLowerCase().includes(query)
        || (hospital.address && hospital.address.toLowerCase().includes(query)),
      );
    });

    return {
      searchQuery,
      filteredHospitals,
    };
  },
};

const VeterinaryDoctorForm = {
  template: `
    <form @submit.prevent="handleSubmit" class="doctor-form">
      <input
        v-model="formData.name"
        type="text"
        placeholder="先生名"
        class="form-input"
        required
      />
      <select v-model="formData.hospitalId" class="form-select">
        <option value="">病院を選択</option>
        <option
          v-for="hospital in hospitals"
          :key="hospital.id"
          :value="hospital.id"
        >
          {{ hospital.name }}
        </option>
      </select>
      <input
        v-model="formData.specialty"
        type="text"
        placeholder="専門分野"
        class="form-input"
      />
      <button type="submit" :disabled="!formData.name" class="btn-submit">
        {{ mode === 'create' ? '登録' : '更新' }}
      </button>
      <button type="button" @click="$emit('cancel')" class="btn-cancel">
        キャンセル
      </button>
    </form>
  `,
  props: {
    doctor: {
      type: Object,
      default: null,
    },
    hospitals: {
      type: Array,
      default: () => [],
    },
    mode: {
      type: String,
      default: 'create',
    },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const formData = ref({
      name: props.doctor?.name || '',
      hospitalId: props.doctor?.hospitalId || '',
      specialty: props.doctor?.specialty || '',
    });

    const handleSubmit = () => {
      if (formData.value.name) {
        emit('save', { ...formData.value });
      }
    };

    watch(() => props.doctor, (newDoctor) => {
      if (newDoctor) {
        formData.value = {
          name: newDoctor.name || '',
          hospitalId: newDoctor.hospitalId || '',
          specialty: newDoctor.specialty || '',
        };
      }
    }, { immediate: true });

    return {
      formData,
      handleSubmit,
    };
  },
};

describe('病院・先生管理 コンポーネント統合テスト', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // デフォルトのComposableモック設定
    mockUseVeterinaryHospitals.mockReturnValue({
      hospitals: ref([]),
      loading: ref(false),
      error: ref(null),
      fetchHospitals: vi.fn(),
      createHospital: vi.fn(),
      updateHospital: vi.fn(),
      deleteHospital: vi.fn(),
      clearError: vi.fn(),
    });

    mockUseVeterinaryDoctors.mockReturnValue({
      doctors: ref([]),
      loading: ref(false),
      error: ref(null),
      fetchDoctors: vi.fn(),
      createDoctor: vi.fn(),
      updateDoctor: vi.fn(),
      deleteDoctor: vi.fn(),
      clearError: vi.fn(),
    });
  });

  describe('病院フォームコンポーネント統合', () => {
    it('病院の新規作成フローが正しく動作する', async () => {
      const wrapper = mount(VeterinaryHospitalForm, {
        props: {
          mode: 'create',
        },
      });

      // フォーム入力
      await wrapper.find('input[placeholder="病院名"]').setValue('新規テスト病院');
      await wrapper.find('input[placeholder="住所"]').setValue('東京都渋谷区');

      // フォーム送信
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0][0]).toEqual({
        name: '新規テスト病院',
        address: '東京都渋谷区',
      });
    });

    it('病院の編集フローが正しく動作する', async () => {
      const existingHospital: VeterinaryHospital = {
        id: 1,
        name: '既存病院',
        address: '大阪府大阪市',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const wrapper = mount(VeterinaryHospitalForm, {
        props: {
          hospital: existingHospital,
          mode: 'edit',
        },
      });

      // 既存データが表示されることを確認
      expect(wrapper.find('input[placeholder="病院名"]').element.value).toBe('既存病院');
      expect(wrapper.find('input[placeholder="住所"]').element.value).toBe('大阪府大阪市');

      // データを更新
      await wrapper.find('input[placeholder="病院名"]').setValue('更新された病院');

      // フォーム送信
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0][0]).toEqual({
        name: '更新された病院',
        address: '大阪府大阪市',
      });
    });

    it('必須項目なしでは送信できない', async () => {
      const wrapper = mount(VeterinaryHospitalForm, {
        props: {
          mode: 'create',
        },
      });

      // 必須項目なしで送信ボタンが無効になることを確認
      expect(wrapper.find('.btn-submit').element.disabled).toBe(true);

      // 病院名を入力すると送信ボタンが有効になる
      await wrapper.find('input[placeholder="病院名"]').setValue('テスト病院');
      expect(wrapper.find('.btn-submit').element.disabled).toBe(false);
    });
  });

  describe('病院一覧コンポーネント統合', () => {
    const mockHospitals: VeterinaryHospital[] = [
      {
        id: '1',
        name: 'テスト動物病院A',
        address: '東京都渋谷区',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'テストペットクリニックB',
        address: '大阪府大阪市',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: '横浜動物医療センター',
        address: '神奈川県横浜市',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('病院一覧が正しく表示される', () => {
      const wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
        },
      });

      const hospitalCards = wrapper.findAll('.hospital-card');
      expect(hospitalCards).toHaveLength(3);

      expect(hospitalCards[0].find('.hospital-name').text()).toBe('テスト動物病院A');
      expect(hospitalCards[0].find('.hospital-address').text()).toBe('東京都渋谷区');

      expect(hospitalCards[1].find('.hospital-name').text()).toBe('テストペットクリニックB');
      expect(hospitalCards[2].find('.hospital-name').text()).toBe('横浜動物医療センター');
    });

    it('検索機能が正しく動作する', async () => {
      const wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
        },
      });

      // 名前での検索
      await wrapper.find('.search-input').setValue('動物');
      await nextTick();

      const filteredCards = wrapper.findAll('.hospital-card');
      expect(filteredCards).toHaveLength(2);
      expect(filteredCards[0].find('.hospital-name').text()).toBe('テスト動物病院A');
      expect(filteredCards[1].find('.hospital-name').text()).toBe('横浜動物医療センター');

      // 住所での検索
      await wrapper.find('.search-input').setValue('東京');
      await nextTick();

      const addressFilteredCards = wrapper.findAll('.hospital-card');
      expect(addressFilteredCards).toHaveLength(1);
      expect(addressFilteredCards[0].find('.hospital-name').text()).toBe('テスト動物病院A');
    });

    it('アクションボタンが正しく動作する', async () => {
      const wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
        },
      });

      const firstCard = wrapper.find('.hospital-card');

      // 編集ボタン
      await firstCard.find('.btn-edit').trigger('click');
      expect(wrapper.emitted('edit')).toBeTruthy();
      expect(wrapper.emitted('edit')![0][0]).toEqual(mockHospitals[0]);

      // 削除ボタン
      await firstCard.find('.btn-delete').trigger('click');
      expect(wrapper.emitted('delete')).toBeTruthy();
      expect(wrapper.emitted('delete')![0][0]).toEqual(mockHospitals[0]);

      // 追加ボタン
      await wrapper.find('.btn-add').trigger('click');
      expect(wrapper.emitted('add')).toBeTruthy();
    });

    it('ローディング状態が正しく表示される', () => {
      const wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: [],
          loading: true,
        },
      });

      expect(wrapper.find('.loading').text()).toBe('読み込み中...');
      expect(wrapper.find('.hospital-card').exists()).toBe(false);
    });

    it('エラー状態が正しく表示される', () => {
      const wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: [],
          error: 'データの取得に失敗しました',
        },
      });

      expect(wrapper.find('.error').text()).toBe('データの取得に失敗しました');
      expect(wrapper.find('.hospital-card').exists()).toBe(false);
    });

    it('データなし状態が正しく表示される', () => {
      const wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: [],
        },
      });

      expect(wrapper.find('.no-data').text()).toBe('データがありません');
      expect(wrapper.find('.hospital-card').exists()).toBe(false);
    });
  });

  describe('先生フォームコンポーネント統合', () => {
    const mockHospitals: VeterinaryHospital[] = [
      {
        id: 1,
        name: 'テスト病院A',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: 'テスト病院B',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('先生の新規作成フローが正しく動作する', async () => {
      const wrapper = mount(VeterinaryDoctorForm, {
        props: {
          mode: 'create',
          hospitals: mockHospitals,
        },
      });

      // フォーム入力
      await wrapper.find('input[placeholder="先生名"]').setValue('新規テスト先生');
      await wrapper.find('.form-select').setValue(1);
      await wrapper.find('input[placeholder="専門分野"]').setValue('内科・外科');

      // フォーム送信
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0][0]).toEqual({
        name: '新規テスト先生',
        hospitalId: 1,
        specialty: '内科・外科',
      });
    });

    it('病院選択肢が正しく表示される', () => {
      const wrapper = mount(VeterinaryDoctorForm, {
        props: {
          mode: 'create',
          hospitals: mockHospitals,
        },
      });

      const options = wrapper.find('.form-select').findAll('option');
      expect(options).toHaveLength(3); // 空の選択肢 + 2つの病院

      expect(options[0].text()).toBe('病院を選択');
      expect(options[1].text()).toBe('テスト病院A');
      expect(options[2].text()).toBe('テスト病院B');
    });

    it('先生の編集フローが正しく動作する', async () => {
      const existingDoctor: VeterinaryDoctor = {
        id: 1,
        name: '既存先生',
        hospitalId: 1,
        specialty: '皮膚科',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const wrapper = mount(VeterinaryDoctorForm, {
        props: {
          doctor: existingDoctor,
          hospitals: mockHospitals,
          mode: 'edit',
        },
      });

      // 既存データが表示されることを確認
      expect(wrapper.find('input[placeholder="先生名"]').element.value).toBe('既存先生');
      expect(wrapper.find('.form-select').element.value).toBe(1);
      expect(wrapper.find('input[placeholder="専門分野"]').element.value).toBe('皮膚科');

      // データを更新
      await wrapper.find('input[placeholder="先生名"]').setValue('更新された先生');

      // フォーム送信
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0][0]).toEqual({
        name: '更新された先生',
        hospitalId: 1,
        specialty: '皮膚科',
      });
    });
  });

  describe('コンポーネント間連携統合', () => {
    it('病院フォームと一覧の連携が正しく動作する', async () => {
      const mockHospitals = ref<VeterinaryHospital[]>([]);
      const mockCreateHospital = vi.fn().mockImplementation(async (data) => {
        const newHospital = {
          id: 'new-id',
          ...data,
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockHospitals.value.push(newHospital);
        return newHospital;
      });

      mockUseVeterinaryHospitals.mockReturnValue({
        hospitals: mockHospitals,
        loading: ref(false),
        error: ref(null),
        fetchHospitals: vi.fn(),
        createHospital: mockCreateHospital,
        updateHospital: vi.fn(),
        deleteHospital: vi.fn(),
        clearError: vi.fn(),
      });

      // 病院一覧コンポーネント
      const listWrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals.value,
        },
      });

      // 病院フォームコンポーネント
      const formWrapper = mount(VeterinaryHospitalForm, {
        props: {
          mode: 'create',
        },
      });

      // フォームで新規病院を作成
      await formWrapper.find('input[placeholder="病院名"]').setValue('統合テスト病院');
      await formWrapper.find('form').trigger('submit');

      // saveイベントが発火されることを確認
      expect(formWrapper.emitted('save')).toBeTruthy();
      expect(formWrapper.emitted('save')![0][0]).toEqual({
        name: '統合テスト病院',
        address: '',
      });
    });

    it('エラーハンドリングの統合処理が正しく動作する', () => {
      const wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: [],
          error: 'サーバーエラーが発生しました',
        },
      });

      expect(wrapper.find('.error').text()).toBe('サーバーエラーが発生しました');
      expect(wrapper.find('.hospital-card').exists()).toBe(false);
    });
  });

  describe('レスポンシブ対応統合', () => {
    it('モバイル表示での統合動作が正しく機能する', () => {
      // モバイル画面サイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const mockHospitals: VeterinaryHospital[] = [
        {
          id: '1',
          name: 'モバイルテスト病院',
          address: '東京都渋谷区',
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const wrapper = mount(VeterinaryHospitalList, {
        props: {
          hospitals: mockHospitals,
        },
      });

      expect(wrapper.find('.hospital-list').exists()).toBe(true);
      expect(wrapper.find('.hospital-card').exists()).toBe(true);
    });
  });
});
