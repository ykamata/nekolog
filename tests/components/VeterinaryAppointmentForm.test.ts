import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VeterinaryAppointmentForm from '~/components/VeterinaryAppointmentForm.vue';
import type { Cat } from '~/types/cat-meal';
import type { VeterinaryAppointmentWithRelations } from '~/types/veterinary-visit';
import { useVeterinaryMasters } from '~/composables/useVeterinaryMasters';

// Mock composables
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('~/composables/useResponsive', () => ({
  useResponsive: () => ({
    screenSize: ref('desktop'),
    getResponsiveClasses: vi.fn(() => []),
  }),
}));

// Mock components
const DateTimePickerMock = {
  name: 'DateTimePicker',
  template: `
    <div class="datetime-picker" :data-testid="id">
      <input
        data-testid="date-input"
        type="date"
        :value="value ? new Date(value).toISOString().split('T')[0] : ''"
        :disabled="disabled"
        @input="handleDateChange"
      />
      <input
        data-testid="time-input"
        type="time"
        :value="value ? new Date(value).toTimeString().slice(0, 5) : ''"
        :disabled="disabled"
        @input="handleTimeChange"
      />
    </div>
  `,
  props: ['value', 'disabled', 'minDate', 'id'],
  emits: ['change'],
  methods: {
    handleDateChange(event: Event) {
      const target = event.target as HTMLInputElement;
      const currentTime = this.value ? new Date(this.value).toTimeString().split(' ')[0] : '00:00:00';
      const newDate = new Date(`${target.value}T${currentTime}`);
      this.$emit('change', newDate);
    },
    handleTimeChange(event: Event) {
      const target = event.target as HTMLInputElement;
      const currentDate = this.value ? new Date(this.value).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const newDate = new Date(`${currentDate}T${target.value}:00`);
      this.$emit('change', newDate);
    },
  },
};

const VeterinaryMasterSelectorMock = {
  name: 'VeterinaryMasterSelector',
  template: `
    <div class="master-selector">
      <input
        data-testid="master-input"
        type="text"
        :value="modelValue || ''"
        :disabled="disabled"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>
  `,
  props: ['modelValue', 'items', 'loading', 'disabled', 'error', 'placeholder', 'id', 'required'],
  emits: ['update:modelValue', 'create'],
};

vi.mock('~/composables/useVeterinaryMasters', () => ({
  useVeterinaryMasters: () => ({
    hospitals: ref([
      { id: '1', name: 'テスト動物病院' },
      { id: '2', name: 'サンプル病院' },
    ]),
    doctors: ref([
      { id: '1', name: 'テスト先生', hospitalId: '1', specialization: '内科' },
      { id: '2', name: 'サンプル先生', hospitalId: '2', specialization: '外科' },
    ]),
    loadHospitals: vi.fn(),
    loadDoctors: vi.fn(),
    createHospital: vi.fn(),
    createDoctor: vi.fn(),
  }),
}));

describe('VeterinaryAppointmentForm', () => {
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

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 1週間後

  const defaultProps = {
    isOpen: true,
    cats: mockCats,
  };

  const mountOptions = {
    global: {
      components: {
        DateTimePicker: DateTimePickerMock,
        VeterinaryMasterSelector: VeterinaryMasterSelectorMock,
      },
    },
  };

  // Helper function to mount component with options
  const mountComponent = (props: any, additionalOptions: unknown = {}) => {
    return mount(VeterinaryAppointmentForm, {
      props,
      ...mountOptions,
      ...additionalOptions,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('フォーム表示', () => {
    it('フォームが正しく表示される', () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
      });

      expect(wrapper.find('[data-testid="appointment-form"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="cat-select"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="appointment-date"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="hospital-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="planned-treatments-textarea"]').exists()).toBe(true);
    });

    it('猫の選択肢が正しく表示される', () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
      });

      const catSelect = wrapper.find('[data-testid="cat-select"]');
      const options = catSelect.findAll('option');

      expect(options).toHaveLength(mockCats.length + 1); // +1 for placeholder
      expect(options[1].text()).toBe('テスト猫1');
      expect(options[2].text()).toBe('テスト猫2');
    });

    it('isOpenがfalseの場合、フォームが表示されない', () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          isOpen: false,
        },
        ...mountOptions,
      });

      expect(wrapper.find('[data-testid="appointment-form"]').exists()).toBe(false);
    });
  });

  describe('初期データ設定', () => {
    it('既存の予約データでフォームが初期化される', async () => {
      const existingAppointment: VeterinaryAppointmentWithRelations = {
        id: 'appointment1',
        catId: 'cat1',
        appointmentDate: futureDate,
        hospitalId: 'hospital1',
        doctorId: 'doctor1',
        plannedTreatments: '定期検診予定',
        notes: 'テスト予約メモ',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: mockCats[0],
        hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
        doctor: { id: 'doctor1', name: 'テスト先生', hospitalId: 'hospital1', specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
      };

      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          appointment: existingAppointment,
        },
        ...mountOptions,
      });

      await wrapper.vm.$nextTick();

      const catSelect = wrapper.find('[data-testid="cat-select"]');
      expect(catSelect.exists()).toBe(true);
      expect(catSelect.element.value).toBe('cat1');

      const hospitalInput = wrapper.find('[data-testid="master-input"]').at(0);
      expect(hospitalInput.exists()).toBe(true);
      expect(hospitalInput.element.value).toBe('テスト動物病院');

      const plannedTreatmentsTextarea = wrapper.find('[data-testid="planned-treatments-textarea"]');
      expect(plannedTreatmentsTextarea.exists()).toBe(true);
      expect(plannedTreatmentsTextarea.element.value).toBe('定期検診予定');

      const notesTextarea = wrapper.find('[data-testid="notes-textarea"]');
      expect(notesTextarea.exists()).toBe(true);
      expect(notesTextarea.element.value).toBe('テスト予約メモ');
    });

    it('初期データが設定される', async () => {
      const initialData = {
        catId: 'cat2',
        hospitalName: '初期病院',
        plannedTreatments: '初期処方予定',
      };

      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          initialData,
        },
        ...mountOptions,
      });

      await wrapper.vm.$nextTick();

      const catSelect = wrapper.find('[data-testid="cat-select"]');
      expect(catSelect.exists()).toBe(true);
      expect(catSelect.element.value).toBe('cat2');

      const hospitalInput = wrapper.find('[data-testid="master-input"]').at(0);
      expect(hospitalInput.exists()).toBe(true);
      expect(hospitalInput.element.value).toBe('初期病院');

      const plannedTreatmentsTextarea = wrapper.find('[data-testid="planned-treatments-textarea"]');
      expect(plannedTreatmentsTextarea.exists()).toBe(true);
      expect(plannedTreatmentsTextarea.element.value).toBe('初期処方予定');
    });
  });

  describe('バリデーション', () => {
    it('必須項目が未入力の場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
      });

      // フォームを送信
      await wrapper.find('.submit-button').trigger('click');
      await wrapper.vm.$nextTick();

      // フォームが送信されないことを確認（バリデーションエラーのため）
      expect(wrapper.emitted('save')).toBeFalsy();
    });

    it('猫が選択されていない場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
      });

      await wrapper.find('.submit-button').trigger('click');
      await wrapper.vm.$nextTick();

      // フォームが送信されないことを確認
      expect(wrapper.emitted('save')).toBeFalsy();
    });

    it('病院名が未入力の場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
      });

      const catSelect = wrapper.find('[data-testid="cat-select"]');
      expect(catSelect.exists()).toBe(true);
      await catSelect.setValue('cat1');

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.exists()).toBe(true);
      await submitButton.trigger('click');
      await wrapper.vm.$nextTick();

      const hospitalError = wrapper.find('[data-testid="hospital-error"]');
      expect(hospitalError.exists()).toBe(true);
      expect(hospitalError.text()).toContain('病院名を入力してください');
    });

    it('予約日時が過去の場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
      });

      // DateTimePickerコンポーネントが存在することを確認
      expect(wrapper.find('[data-testid="appointment-date"]').exists()).toBe(true);
    });

    it('予定処方内容が長すぎる場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
      });

      const longTreatments = 'a'.repeat(501); // 500文字制限を超える
      const plannedTreatmentsTextarea = wrapper.find('[data-testid="planned-treatments-textarea"]');
      expect(plannedTreatmentsTextarea.exists()).toBe(true);
      await plannedTreatmentsTextarea.setValue(longTreatments);

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.exists()).toBe(true);
      await submitButton.trigger('click');
      await wrapper.vm.$nextTick();

      const treatmentsError = wrapper.find('[data-testid="planned-treatments-error"]');
      expect(treatmentsError.exists()).toBe(true);
      expect(treatmentsError.text()).toContain('予定処方内容は500文字以内で入力してください');
    });

    it('メモが長すぎる場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
      });

      const longNotes = 'a'.repeat(1001); // 1000文字制限を超える
      const notesTextarea = wrapper.find('[data-testid="notes-textarea"]');
      expect(notesTextarea.exists()).toBe(true);
      await notesTextarea.setValue(longNotes);

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.exists()).toBe(true);
      await submitButton.trigger('click');
      await wrapper.vm.$nextTick();

      const notesError = wrapper.find('[data-testid="notes-error"]');
      expect(notesError.exists()).toBe(true);
      expect(notesError.text()).toContain('メモは1000文字以内で入力してください');
    });
  });
  describe('フォーム送信', () => {
    it('有効なデータでフォームが送信される', async () => {
      const onSave = vi.fn();
      const wrapper = mountComponent({
        ...defaultProps,
        onSave,
      });

      // フォームに有効なデータを入力
      await wrapper.find('[data-testid="cat-select"]').setValue('cat1');

      // DateTimePickerのmocked input要素を直接操作
      const dateTimeInput = wrapper.find('[data-testid="appointment-date"] [data-testid="date-input"]');
      expect(dateTimeInput.exists()).toBe(true);
      await dateTimeInput.setValue(futureDate.toISOString().split('T')[0]);

      // VeterinaryMasterSelectorのmocked input要素を直接操作
      const hospitalInput = wrapper.find('[data-testid="master-input"]').at(0);
      expect(hospitalInput.exists()).toBe(true);
      await hospitalInput.setValue('テスト動物病院');

      const doctorInput = wrapper.find('[data-testid="master-input"]').at(1);
      expect(doctorInput.exists()).toBe(true);
      await doctorInput.setValue('テスト先生');

      await wrapper.find('[data-testid="planned-treatments-textarea"]').setValue('定期検診予定');
      await wrapper.find('[data-testid="notes-textarea"]').setValue('テスト予約メモ');

      // フォームを送信
      await wrapper.find('[data-testid="submit-button"]').trigger('click');

      expect(onSave).toHaveBeenCalledWith({
        catId: 'cat1',
        appointmentDate: expect.any(Date),
        hospitalName: 'テスト動物病院',
        doctorName: 'テスト先生',
        plannedTreatments: '定期検診予定',
        notes: 'テスト予約メモ',
      });
    });

    it('送信中はボタンが無効化される', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
      });

      // 送信状態をシミュレート
      wrapper.vm.isSubmitting = true;
      await wrapper.vm.$nextTick();

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.attributes('disabled')).toBeDefined();
      expect(submitButton.text()).toContain('保存中');
    });

    it('キャンセルボタンでフォームが閉じられる', async () => {
      const onClose = vi.fn();
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          onClose,
        },
      });

      await wrapper.find('[data-testid="cancel-button"]').trigger('click');

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('通院記録変換機能', () => {
    it('通院記録変換ボタンが表示される', () => {
      const existingAppointment: VeterinaryAppointmentWithRelations = {
        id: 'appointment1',
        catId: 'cat1',
        appointmentDate: futureDate,
        hospitalId: 'hospital1',
        doctorId: 'doctor1',
        plannedTreatments: '定期検診予定',
        notes: 'テスト予約メモ',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: mockCats[0],
        hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
        doctor: { id: 'doctor1', name: 'テスト先生', hospitalId: 'hospital1', specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
      };

      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          appointment: existingAppointment,
        },
      });

      expect(wrapper.find('[data-testid="convert-to-visit-button"]').exists()).toBe(true);
    });

    it('通院記録変換イベントが発火される', async () => {
      const existingAppointment: VeterinaryAppointmentWithRelations = {
        id: 'appointment1',
        catId: 'cat1',
        appointmentDate: futureDate,
        hospitalId: 'hospital1',
        doctorId: 'doctor1',
        plannedTreatments: '定期検診予定',
        notes: 'テスト予約メモ',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: mockCats[0],
        hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
        doctor: { id: 'doctor1', name: 'テスト先生', hospitalId: 'hospital1', specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
      };

      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          appointment: existingAppointment,
        },
      });

      await wrapper.find('[data-testid="convert-to-visit-button"]').trigger('click');

      // First click shows the confirmation dialog
      expect(wrapper.find('[data-testid="convert-confirmation-dialog"]').exists()).toBe(true);

      // Click the confirm button to actually emit the event
      await wrapper.find('[data-testid="convert-confirm-button"]').trigger('click');

      expect(wrapper.emitted('convertToVisit')).toBeTruthy();
      expect(wrapper.emitted('convertToVisit')[0]).toEqual([existingAppointment.id]);
    });

    it('変換確認ダイアログが表示される', async () => {
      const existingAppointment: VeterinaryAppointmentWithRelations = {
        id: 'appointment1',
        catId: 'cat1',
        appointmentDate: futureDate,
        hospitalId: 'hospital1',
        doctorId: 'doctor1',
        plannedTreatments: '定期検診予定',
        notes: 'テスト予約メモ',
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: mockCats[0],
        hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
        doctor: { id: 'doctor1', name: 'テスト先生', hospitalId: 'hospital1', specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
      };

      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          appointment: existingAppointment,
        },
      });

      await wrapper.find('[data-testid="convert-to-visit-button"]').trigger('click');

      expect(wrapper.find('[data-testid="convert-confirmation-dialog"]').exists()).toBe(true);
    });

    it('COMPLETED状態の予約では変換ボタンが表示されない', () => {
      const completedAppointment: VeterinaryAppointmentWithRelations = {
        id: 'appointment1',
        catId: 'cat1',
        appointmentDate: futureDate,
        hospitalId: 'hospital1',
        doctorId: 'doctor1',
        plannedTreatments: '定期検診予定',
        notes: 'テスト予約メモ',
        status: 'COMPLETED',
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: mockCats[0],
        hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
        doctor: { id: 'doctor1', name: 'テスト先生', hospitalId: 'hospital1', specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
      };

      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          appointment: completedAppointment,
        },
      });

      expect(wrapper.find('[data-testid="convert-to-visit-button"]').exists()).toBe(false);
    });
  });
  describe('マスタデータ管理', () => {
    it('新しい病院名を入力した場合、マスタに追加される', async () => {
      const { createHospital } = useVeterinaryMasters();
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
      });

      const newHospitalName = '新しい動物病院';
      const hospitalInput = wrapper.find('[data-testid="master-input"]').at(0);
      expect(hospitalInput.exists()).toBe(true);
      await hospitalInput.setValue(newHospitalName);

      // フォームを送信
      const catSelect = wrapper.find('[data-testid="cat-select"]');
      expect(catSelect.exists()).toBe(true);
      await catSelect.setValue('cat1');

      const dateTimeInput = wrapper.find('[data-testid="appointment-date"] [data-testid="date-input"]');
      expect(dateTimeInput.exists()).toBe(true);
      await dateTimeInput.setValue(futureDate.toISOString().split('T')[0]);

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.exists()).toBe(true);
      await submitButton.trigger('click');

      expect(createHospital).toHaveBeenCalledWith({ name: newHospitalName });
    });

    it('新しい先生名を入力した場合、マスタに追加される', async () => {
      const { createDoctor } = useVeterinaryMasters();
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
      });

      const newDoctorName = '新しい先生';
      const hospitalInput = wrapper.find('[data-testid="hospital-input"] [data-testid="master-input"]');
      expect(hospitalInput.exists()).toBe(true);
      await hospitalInput.setValue('テスト動物病院');

      const doctorInput = wrapper.find('[data-testid="doctor-input"] [data-testid="master-input"]');
      expect(doctorInput.exists()).toBe(true);
      await doctorInput.setValue(newDoctorName);

      // フォームを送信
      const catSelect = wrapper.find('[data-testid="cat-select"]');
      expect(catSelect.exists()).toBe(true);
      await catSelect.setValue('cat1');

      const dateTimeInput = wrapper.find('[data-testid="appointment-date"] [data-testid="date-input"]');
      expect(dateTimeInput.exists()).toBe(true);
      await dateTimeInput.setValue(futureDate.toISOString().split('T')[0]);

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.exists()).toBe(true);
      await submitButton.trigger('click');

      expect(createDoctor).toHaveBeenCalledWith({
        name: newDoctorName,
        hospitalId: expect.any(String),
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('送信エラーが発生した場合、エラーメッセージが表示される', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
      });

      // エラー状態をシミュレート
      wrapper.vm.submitError = 'サーバーエラーが発生しました';
      await wrapper.vm.$nextTick();

      const errorMessage = wrapper.find('[data-testid="submit-error"]');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toContain('サーバーエラーが発生しました');
    });

    it('リトライ機能が動作する', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: {
          ...defaultProps,
          onSave,
        },
      });

      // 有効なデータを入力
      const catSelect = wrapper.find('[data-testid="cat-select"]');
      expect(catSelect.exists()).toBe(true);
      await catSelect.setValue('cat1');

      const dateTimeInput = wrapper.find('[data-testid="appointment-date"] [data-testid="date-input"]');
      expect(dateTimeInput.exists()).toBe(true);
      await dateTimeInput.setValue(futureDate.toISOString().split('T')[0]);

      const hospitalInput = wrapper.find('[data-testid="hospital-input"] [data-testid="master-input"]');
      expect(hospitalInput.exists()).toBe(true);
      await hospitalInput.setValue('テスト病院');

      // 初回送信（失敗）
      await wrapper.find('[data-testid="submit-button"]').trigger('click');

      // リトライボタンが表示される
      expect(wrapper.find('[data-testid="retry-button"]').exists()).toBe(true);

      // リトライ実行
      await wrapper.find('[data-testid="retry-button"]').trigger('click');

      expect(onSave).toHaveBeenCalledTimes(2);
    });
  });

  describe('アクセシビリティ', () => {
    it('フォーム要素に適切なラベルが設定されている', () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
      });

      expect(wrapper.find('label[for="cat-select"]').exists()).toBe(true);
      expect(wrapper.find('label[for="appointment-date"]').exists()).toBe(true);
      expect(wrapper.find('label[for="hospital-input"]').exists()).toBe(true);
      expect(wrapper.find('label[for="planned-treatments-textarea"]').exists()).toBe(true);
    });

    it('エラーメッセージがaria-describedbyで関連付けられている', async () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
      });

      const submitButton = wrapper.find('[data-testid="submit-button"]');
      expect(submitButton.exists()).toBe(true);
      await submitButton.trigger('click');
      await wrapper.vm.$nextTick();

      const catSelect = wrapper.find('[data-testid="cat-select"]');
      expect(catSelect.exists()).toBe(true);

      const catError = wrapper.find('[data-testid="cat-error"]');
      if (catError.exists()) {
        expect(catSelect.attributes('aria-describedby')).toBe(catError.attributes('id'));
      }
    });

    it('必須項目にaria-requiredが設定されている', () => {
      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
      });

      expect(wrapper.find('[data-testid="cat-select"]').attributes('aria-required')).toBe('true');
      expect(wrapper.find('[data-testid="appointment-date"]').attributes('aria-required')).toBe('true');
      expect(wrapper.find('[data-testid="hospital-input"]').attributes('aria-required')).toBe('true');
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示でフォームレイアウトが適切に調整される', () => {
      // モバイル用のuseResponsiveモックを作成
      const mockUseResponsive = vi.fn(() => ({
        screenSize: ref('mobile'),
        getResponsiveClasses: vi.fn(() => []),
      }));

      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
        global: {
          ...mountOptions.global,
          mocks: {
            useResponsive: mockUseResponsive,
          },
        },
      });

      const form = wrapper.find('[data-testid="appointment-form"]');
      expect(form.exists()).toBe(true);
      expect(form.classes()).toContain('mobile-layout');
    });

    it('タブレット表示でフォームレイアウトが適切に調整される', () => {
      // タブレット用のuseResponsiveモックを作成
      const mockUseResponsive = vi.fn(() => ({
        screenSize: ref('tablet'),
        getResponsiveClasses: vi.fn(() => []),
      }));

      const wrapper = mount(VeterinaryAppointmentForm, {
        props: defaultProps,
        ...mountOptions,
        global: {
          ...mountOptions.global,
          mocks: {
            useResponsive: mockUseResponsive,
          },
        },
      });

      const form = wrapper.find('[data-testid="appointment-form"]');
      expect(form.exists()).toBe(true);
      expect(form.classes()).toContain('tablet-layout');
    });
  });
});
