import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MedicationReminder from '~/components/MedicationReminder.vue';
import type { MedicationReminder as MedicationReminderType, ReminderStatus } from '~/types/medication';

// Mock data
const createMockReminder = (overrides: Partial<MedicationReminderType> = {}): MedicationReminderType => ({
  id: 1,
  scheduleId: 1,
  catId: 1,
  medicationId: 1,
  scheduledAt: new Date('2024-01-15T08:00:00Z'),
  status: 'PENDING' as ReminderStatus,
  createdAt: new Date('2024-01-14T10:00:00Z'),
  updatedAt: new Date('2024-01-14T10:00:00Z'),
  medication: {
    id: 1,
    name: 'テスト薬',
    type: 'MEDICINE' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  cat: {
    id: 1,
    name: 'テスト猫',
    breed: 'テスト品種',
    birthDate: new Date('2020-01-01'),
    weight: 4.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ...overrides,
});

const mockReminders: MedicationReminderType[] = [
  createMockReminder({
    id: 1,
    status: 'PENDING',
    scheduledAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (overdue)
  }),
  createMockReminder({
    id: 2,
    status: 'PENDING',
    scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now (upcoming)
  }),
  createMockReminder({
    id: 3,
    status: 'SNOOZED',
    scheduledAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
  }),
  createMockReminder({
    id: 4,
    status: 'ACKNOWLEDGED',
    scheduledAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  }),
  createMockReminder({
    id: 5,
    status: 'DISMISSED',
    scheduledAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
  }),
];

describe('MedicationReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders component title correctly', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [],
        },
      });

      expect(wrapper.find('.medication-reminder__title').text()).toBe('薬のリマインダー');
    });

    it('shows loading state when loading prop is true', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [],
          loading: true,
        },
      });

      expect(wrapper.find('.medication-reminder__loading').exists()).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
      expect(wrapper.text()).toContain('リマインダーを読み込み中...');
    });

    it('shows empty state when no reminders', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [],
        },
      });

      expect(wrapper.find('.medication-reminder__empty').exists()).toBe(true);
      expect(wrapper.text()).toContain('リマインダーがありません');
      expect(wrapper.text()).toContain('薬のスケジュールを設定すると、リマインダーが表示されます。');
    });

    it('renders reminders when provided', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: mockReminders,
        },
      });

      expect(wrapper.find('.medication-reminder__content').exists()).toBe(true);
      expect(wrapper.find('.medication-reminder__empty').exists()).toBe(false);
    });
  });

  describe('Reminder Categorization', () => {
    it('categorizes overdue reminders correctly', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: mockReminders,
        },
      });

      const overdueSection = wrapper.find('.reminder-section--urgent');
      expect(overdueSection.exists()).toBe(true);
      expect(overdueSection.text()).toContain('期限切れ (1)');
    });

    it('categorizes upcoming reminders correctly', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: mockReminders,
        },
      });

      const upcomingSection = wrapper.find('.reminder-section--upcoming');
      expect(upcomingSection.exists()).toBe(true);
      expect(upcomingSection.text()).toContain('まもなく (1)');
    });

    it('categorizes snoozed reminders correctly', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: mockReminders,
        },
      });

      const snoozedSection = wrapper.findAll('.reminder-section').find(section =>
        section.text().includes('スヌーズ中 (1)'),
      );
      expect(snoozedSection).toBeDefined();
    });

    it('shows recent actions section for acknowledged and dismissed reminders', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: mockReminders,
        },
      });

      const recentSection = wrapper.find('.reminder-section--recent');
      expect(recentSection.exists()).toBe(true);
      expect(recentSection.text()).toContain('最近の操作');
    });
  });

  describe('Reminder Cards', () => {
    it('displays medication and cat information correctly', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
        },
      });

      const reminderCard = wrapper.find('.reminder-card');
      expect(reminderCard.find('.reminder-card__medication').text()).toBe('テスト薬');
      expect(reminderCard.find('.reminder-card__cat').text()).toBe('テスト猫');
    });

    it('displays time information correctly', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
        },
      });

      const reminderCard = wrapper.find('.reminder-card');
      expect(reminderCard.find('.reminder-card__date').exists()).toBe(true);
      expect(reminderCard.find('.reminder-card__clock').exists()).toBe(true);
    });

    it('shows action buttons for pending reminders when showActions is true', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]], // overdue reminder
          showActions: true,
        },
      });

      const actions = wrapper.find('.reminder-card__actions');
      expect(actions.exists()).toBe(true);

      const buttons = actions.findAll('button');
      expect(buttons).toHaveLength(3);
      expect(buttons[0].text()).toContain('投与完了');
      expect(buttons[1].text()).toContain('スヌーズ');
      expect(buttons[2].text()).toContain('無視');
    });

    it('hides action buttons when showActions is false', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: false,
        },
      });

      expect(wrapper.find('.reminder-card__actions').exists()).toBe(false);
    });

    it('shows status badge for completed reminders', () => {
      const acknowledgedReminder = mockReminders.find(r => r.status === 'ACKNOWLEDGED')!;
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [acknowledgedReminder],
        },
      });

      const statusBadge = wrapper.find('.status-badge');
      expect(statusBadge.exists()).toBe(true);
      expect(statusBadge.text()).toBe('確認済み');
      expect(statusBadge.classes()).toContain('status--acknowledged');
    });
  });

  describe('Actions', () => {
    it('emits acknowledge event when acknowledge button is clicked', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      const acknowledgeButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('投与完了'),
      )!;

      await acknowledgeButton.trigger('click');

      expect(wrapper.emitted('acknowledge')).toBeTruthy();
      expect(wrapper.emitted('acknowledge')![0]).toEqual([mockReminders[0]]);
    });

    it('opens snooze dialog when snooze button is clicked', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      const snoozeButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('スヌーズ'),
      )!;

      await snoozeButton.trigger('click');

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-title').text()).toBe('スヌーズ時間を選択');
    });

    it('emits dismiss event when dismiss button is clicked', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      const dismissButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('無視'),
      )!;

      await dismissButton.trigger('click');

      expect(wrapper.emitted('dismiss')).toBeTruthy();
      expect(wrapper.emitted('dismiss')![0]).toEqual([mockReminders[0]]);
    });

    it('emits refresh event when refresh button is clicked', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: mockReminders,
        },
      });

      const refreshButton = wrapper.find('button[class*="btn--secondary"]');
      await refreshButton.trigger('click');

      expect(wrapper.emitted('refresh')).toBeTruthy();
    });
  });

  describe('Snooze Dialog', () => {
    it('shows snooze options in dialog', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      // Open snooze dialog
      const snoozeButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('スヌーズ'),
      )!;
      await snoozeButton.trigger('click');

      const snoozeOptions = wrapper.findAll('.snooze-option');
      expect(snoozeOptions.length).toBeGreaterThan(0);

      const labels = snoozeOptions.map(option =>
        option.find('.snooze-option__label').text(),
      );
      expect(labels).toContain('15分');
      expect(labels).toContain('30分');
      expect(labels).toContain('1時間');
    });

    it('emits snooze event with selected minutes when confirmed', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      // Open snooze dialog
      const snoozeButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('スヌーズ'),
      )!;
      await snoozeButton.trigger('click');

      // Select 30 minutes option
      const thirtyMinOption = wrapper.findAll('.snooze-option').find(option =>
        option.text().includes('30分'),
      )!;
      const radioButton = thirtyMinOption.find('input[type="radio"]');
      await radioButton.setValue('30');

      // Confirm snooze
      const confirmButton = wrapper.findAll('.modal-actions button').find(btn =>
        btn.text().includes('スヌーズ'),
      )!;
      await confirmButton.trigger('click');

      expect(wrapper.emitted('snooze')).toBeTruthy();
      expect(wrapper.emitted('snooze')![0]).toEqual([mockReminders[0], 30]);
    });

    it('closes dialog when cancel button is clicked', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      // Open snooze dialog
      const snoozeButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('スヌーズ'),
      )!;
      await snoozeButton.trigger('click');

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);

      // Click cancel
      const cancelButton = wrapper.findAll('.modal-actions button').find(btn =>
        btn.text().includes('キャンセル'),
      )!;
      await cancelButton.trigger('click');

      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });

    it('closes dialog when overlay is clicked', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      // Open snooze dialog
      const snoozeButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('スヌーズ'),
      )!;
      await snoozeButton.trigger('click');

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);

      // Click overlay
      await wrapper.find('.modal-overlay').trigger('click');

      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });
  });

  describe('Time Formatting', () => {
    it('formats time correctly', () => {
      const testDate = new Date('2024-01-15T14:30:00Z');
      const reminder = createMockReminder({ scheduledAt: testDate });

      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [reminder],
        },
      });

      const timeElement = wrapper.find('.reminder-card__clock');
      expect(timeElement.exists()).toBe(true);
      // Time format will depend on locale, but should contain time information
      expect(timeElement.text()).toMatch(/\d{1,2}:\d{2}/);
    });

    it('formats date correctly for today', () => {
      const today = new Date();
      const reminder = createMockReminder({ scheduledAt: today });

      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [reminder],
        },
      });

      const dateElement = wrapper.find('.reminder-card__date');
      expect(dateElement.text()).toBe('今日');
    });
  });

  describe('Status Display', () => {
    it('displays correct status for different reminder states', () => {
      const statuses: ReminderStatus[] = ['PENDING', 'ACKNOWLEDGED', 'SNOOZED', 'DISMISSED'];
      const expectedTexts = ['待機中', '確認済み', 'スヌーズ中', '無視'];

      statuses.forEach((status, index) => {
        const reminder = createMockReminder({ status });
        const wrapper = mount(MedicationReminder, {
          props: {
            reminders: [reminder],
          },
        });

        if (status !== 'PENDING') {
          const statusBadge = wrapper.find('.status-badge');
          expect(statusBadge.text()).toBe(expectedTexts[index]);
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper button labels', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      const buttons = wrapper.findAll('button');
      buttons.forEach((button) => {
        expect(button.text().trim()).not.toBe('');
      });
    });

    it('has proper modal structure', async () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [mockReminders[0]],
          showActions: true,
        },
      });

      // Open snooze dialog
      const snoozeButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('スヌーズ'),
      )!;
      await snoozeButton.trigger('click');

      expect(wrapper.find('.modal-title').exists()).toBe(true);
      expect(wrapper.find('.modal-content').exists()).toBe(true);
      expect(wrapper.find('.modal-actions').exists()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles reminders without medication or cat data', () => {
      const reminderWithoutData = createMockReminder({
        medication: undefined,
        cat: undefined,
      });

      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [reminderWithoutData],
        },
      });

      expect(wrapper.find('.reminder-card__medication').text()).toBe('薬名不明');
      expect(wrapper.find('.reminder-card__cat').text()).toBe('猫名不明');
    });

    it('handles empty reminder arrays for each category', () => {
      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: [],
        },
      });

      expect(wrapper.find('.reminder-section--urgent').exists()).toBe(false);
      expect(wrapper.find('.reminder-section--upcoming').exists()).toBe(false);
      expect(wrapper.find('.reminder-section--recent').exists()).toBe(false);
    });

    it('limits recent actions to 5 items', () => {
      const manyCompletedReminders = Array.from({ length: 10 }, (_, i) =>
        createMockReminder({
          id: `reminder-${i}`,
          status: i % 2 === 0 ? 'ACKNOWLEDGED' : 'DISMISSED',
        }),
      );

      const wrapper = mount(MedicationReminder, {
        props: {
          reminders: manyCompletedReminders,
        },
      });

      const recentSection = wrapper.find('.reminder-section--recent');
      const reminderCards = recentSection.findAll('.reminder-card');
      expect(reminderCards.length).toBe(5);
    });
  });
});
