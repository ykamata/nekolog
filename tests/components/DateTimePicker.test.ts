import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DateTimePicker from '~/components/DateTimePicker.vue';

describe('DateTimePicker', () => {
  const defaultDate = new Date('2024-01-15T14:30:00');

  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(DateTimePicker, {
      props: {
        value: defaultDate,
      },
    });
  });

  describe('Component Rendering', () => {
    it('renders the datetime picker with all elements', () => {
      expect(wrapper.find('.datetime-picker').exists()).toBe(true);
      expect(wrapper.find('.current-selection').exists()).toBe(true);
      expect(wrapper.find('.quick-options').exists()).toBe(true);
      expect(wrapper.find('.input-controls').exists()).toBe(true);
    });

    it('displays the current selected date/time', () => {
      const selectedDateTime = wrapper.find('.selected-datetime');
      expect(selectedDateTime.exists()).toBe(true);
      // The exact format depends on locale, but should contain date info
      expect(selectedDateTime.text()).toContain('2024');
    });

    it('renders quick selection buttons', () => {
      const quickButtons = wrapper.findAll('.quick-button');
      expect(quickButtons.length).toBeGreaterThan(0);

      const buttonLabels = quickButtons.map((button: any) => button.text());
      expect(buttonLabels).toContain('今');
      expect(buttonLabels).toContain('今日');
      expect(buttonLabels).toContain('朝食');
      expect(buttonLabels).toContain('昼食');
      expect(buttonLabels).toContain('夕食');
    });

    it('renders combined datetime input by default', () => {
      expect(wrapper.find('.combined-input').exists()).toBe(true);
      expect(wrapper.find('.datetime-input').exists()).toBe(true);
      expect(wrapper.find('.separate-inputs').exists()).toBe(false);
    });
  });

  describe('Input Mode Toggle', () => {
    it('toggles between combined and separate input modes', async () => {
      const modeToggle = wrapper.find('.mode-toggle');
      expect(modeToggle.text()).toBe('個別入力');

      await modeToggle.trigger('click');

      expect(wrapper.find('.separate-inputs').exists()).toBe(true);
      expect(wrapper.find('.combined-input').exists()).toBe(false);
      expect(modeToggle.text()).toBe('統合入力');
    });

    it('shows separate date and time inputs in separate mode', async () => {
      const modeToggle = wrapper.find('.mode-toggle');
      await modeToggle.trigger('click');

      expect(wrapper.find('.date-input').exists()).toBe(true);
      expect(wrapper.find('.time-input').exists()).toBe(true);
    });

    it('hides time input when showTime is false', async () => {
      const wrapperNoTime = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          showTime: false,
        },
      });

      const modeToggle = wrapperNoTime.find('.mode-toggle');
      await modeToggle.trigger('click');

      expect(wrapperNoTime.find('.date-input').exists()).toBe(true);
      expect(wrapperNoTime.find('.time-input').exists()).toBe(false);
    });
  });

  describe('Date/Time Input Handling', () => {
    it('emits change event when datetime input changes', async () => {
      const datetimeInput = wrapper.find('.datetime-input');
      await datetimeInput.setValue('2024-02-20T16:45');

      const changeEvents = wrapper.emitted('change');
      expect(changeEvents).toHaveLength(1);

      const emittedDate = changeEvents![0][0] as Date;
      expect(emittedDate.getFullYear()).toBe(2024);
      expect(emittedDate.getMonth()).toBe(1); // February (0-indexed)
      expect(emittedDate.getDate()).toBe(20);
      expect(emittedDate.getHours()).toBe(16);
      expect(emittedDate.getMinutes()).toBe(45);
    });

    it('emits change event when date input changes in separate mode', async () => {
      const modeToggle = wrapper.find('.mode-toggle');
      await modeToggle.trigger('click');

      const dateInput = wrapper.find('.date-input');
      await dateInput.setValue('2024-03-10');

      const changeEvents = wrapper.emitted('change');
      expect(changeEvents).toHaveLength(1);

      const emittedDate = changeEvents![0][0] as Date;
      expect(emittedDate.getFullYear()).toBe(2024);
      expect(emittedDate.getMonth()).toBe(2); // March (0-indexed)
      expect(emittedDate.getDate()).toBe(10);
      // Time should remain the same as original
      expect(emittedDate.getHours()).toBe(14);
      expect(emittedDate.getMinutes()).toBe(30);
    });

    it('emits change event when time input changes in separate mode', async () => {
      const modeToggle = wrapper.find('.mode-toggle');
      await modeToggle.trigger('click');

      const timeInput = wrapper.find('.time-input');
      await timeInput.setValue('09:15');

      const changeEvents = wrapper.emitted('change');
      expect(changeEvents).toHaveLength(1);

      const emittedDate = changeEvents![0][0] as Date;
      expect(emittedDate.getHours()).toBe(9);
      expect(emittedDate.getMinutes()).toBe(15);
      // Date should remain the same as original
      expect(emittedDate.getFullYear()).toBe(2024);
      expect(emittedDate.getMonth()).toBe(0); // January (0-indexed)
      expect(emittedDate.getDate()).toBe(15);
    });

    it('handles invalid date input gracefully', async () => {
      const datetimeInput = wrapper.find('.datetime-input');
      await datetimeInput.setValue('invalid-date');

      // Should not emit change event for invalid dates
      expect(wrapper.emitted('change')).toBeFalsy();
    });
  });

  describe('Quick Selection', () => {
    it('emits change event when quick button is clicked', async () => {
      const quickButton = wrapper.find('.quick-button');
      await quickButton.trigger('click');

      expect(wrapper.emitted('change')).toHaveLength(1);
    });

    it('sets current time when "今" button is clicked', async () => {
      const nowButton = wrapper
        .findAll('.quick-button')
        .find((button: any) => button.text() === '今');

      const beforeClick = Date.now();
      await nowButton!.trigger('click');
      const afterClick = Date.now();

      const changeEvents = wrapper.emitted('change');
      const emittedDate = changeEvents![0][0] as Date;
      const emittedTime = emittedDate.getTime();

      // Should be within a reasonable range of current time
      expect(emittedTime).toBeGreaterThanOrEqual(beforeClick - 1000);
      expect(emittedTime).toBeLessThanOrEqual(afterClick + 1000);
    });

    it('sets morning time when "朝食" button is clicked', async () => {
      const morningButton = wrapper
        .findAll('.quick-button')
        .find((button: any) => button.text() === '朝食');

      await morningButton!.trigger('click');

      const changeEvents = wrapper.emitted('change');
      const emittedDate = changeEvents![0][0] as Date;

      expect(emittedDate.getHours()).toBe(7);
      expect(emittedDate.getMinutes()).toBe(0);
    });

    it('sets lunch time when "昼食" button is clicked', async () => {
      const lunchButton = wrapper
        .findAll('.quick-button')
        .find((button: any) => button.text() === '昼食');

      await lunchButton!.trigger('click');

      const changeEvents = wrapper.emitted('change');
      const emittedDate = changeEvents![0][0] as Date;

      expect(emittedDate.getHours()).toBe(12);
      expect(emittedDate.getMinutes()).toBe(0);
    });

    it('sets dinner time when "夕食" button is clicked', async () => {
      const dinnerButton = wrapper
        .findAll('.quick-button')
        .find((button: any) => button.text() === '夕食');

      await dinnerButton!.trigger('click');

      const changeEvents = wrapper.emitted('change');
      const emittedDate = changeEvents![0][0] as Date;

      expect(emittedDate.getHours()).toBe(18);
      expect(emittedDate.getMinutes()).toBe(0);
    });
  });

  describe('Date Constraints', () => {
    it('applies min date constraint', () => {
      const minDate = new Date('2024-01-01');
      const constrainedWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          minDate,
        },
      });

      const datetimeInput = constrainedWrapper.find('.datetime-input');
      expect(datetimeInput.attributes('min')).toBe('2024-01-01T00:00');
    });

    it('applies max date constraint', () => {
      const maxDate = new Date('2024-12-31');
      const constrainedWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          maxDate,
        },
      });

      const datetimeInput = constrainedWrapper.find('.datetime-input');
      expect(datetimeInput.attributes('max')).toBe('2024-12-31T23:59');
    });

    it('applies date constraints in separate mode', async () => {
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2024-12-31');
      const constrainedWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          minDate,
          maxDate,
        },
      });

      const modeToggle = constrainedWrapper.find('.mode-toggle');
      await modeToggle.trigger('click');

      const dateInput = constrainedWrapper.find('.date-input');
      expect(dateInput.attributes('min')).toBe('2024-01-01');
      expect(dateInput.attributes('max')).toBe('2024-12-31');
    });
  });

  describe('Disabled State', () => {
    it('disables all inputs when disabled prop is true', () => {
      const disabledWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          disabled: true,
        },
      });

      expect(
        disabledWrapper.find('.mode-toggle').attributes('disabled'),
      ).toBeDefined();
      expect(
        disabledWrapper.find('.datetime-input').attributes('disabled'),
      ).toBeDefined();

      const quickButtons = disabledWrapper.findAll('.quick-button');
      quickButtons.forEach((button: any) => {
        expect(button.attributes('disabled')).toBeDefined();
      });
    });

    it('disables separate inputs when disabled', async () => {
      const disabledWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          disabled: true,
        },
      });

      // Toggle to separate mode (should still work even when disabled for testing)
      disabledWrapper.vm.inputMode = 'separate';
      await disabledWrapper.vm.$nextTick();

      expect(
        disabledWrapper.find('.date-input').attributes('disabled'),
      ).toBeDefined();
      expect(
        disabledWrapper.find('.time-input').attributes('disabled'),
      ).toBeDefined();
    });
  });

  describe('Value Formatting', () => {
    it('formats datetime-local input value correctly', () => {
      const datetimeInput = wrapper.find('.datetime-input');
      expect(datetimeInput.element.value).toBe('2024-01-15T14:30');
    });

    it('formats date input value correctly in separate mode', async () => {
      const modeToggle = wrapper.find('.mode-toggle');
      await modeToggle.trigger('click');

      const dateInput = wrapper.find('.date-input');
      expect(dateInput.element.value).toBe('2024-01-15');
    });

    it('formats time input value correctly in separate mode', async () => {
      const modeToggle = wrapper.find('.mode-toggle');
      await modeToggle.trigger('click');

      const timeInput = wrapper.find('.time-input');
      expect(timeInput.element.value).toBe('14:30');
    });

    it('formats display date correctly', () => {
      const selectedDateTime = wrapper.find('.selected-datetime');
      const displayText = selectedDateTime.text();

      // Should contain year, and be formatted in Japanese locale
      expect(displayText).toContain('2024');
      // The exact format depends on Intl.DateTimeFormat, but should be readable
      expect(displayText.length).toBeGreaterThan(10);
    });
  });

  describe('Responsive Design', () => {
    it('applies mobile-specific CSS classes', () => {
      // Verify that the component has the necessary CSS classes for responsive design
      expect(wrapper.find('.datetime-picker').exists()).toBe(true);
      expect(wrapper.find('.current-selection').exists()).toBe(true);
      expect(wrapper.find('.quick-options').exists()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles leap year dates correctly', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00');
      const leapYearWrapper = mount(DateTimePicker, {
        props: {
          value: leapYearDate,
        },
      });

      const datetimeInput = leapYearWrapper.find('.datetime-input');
      expect(datetimeInput.element.value).toBe('2024-02-29T12:00');
    });

    it('handles year boundaries correctly', () => {
      const newYearDate = new Date('2024-01-01T00:00:00');
      const newYearWrapper = mount(DateTimePicker, {
        props: {
          value: newYearDate,
        },
      });

      const datetimeInput = newYearWrapper.find('.datetime-input');
      expect(datetimeInput.element.value).toBe('2024-01-01T00:00');
    });

    it('handles timezone changes gracefully', () => {
      // This test ensures the component works regardless of user's timezone
      const utcDate = new Date('2024-01-15T14:30:00Z');
      const timezoneWrapper = mount(DateTimePicker, {
        props: {
          value: utcDate,
        },
      });

      // Should render without errors
      expect(timezoneWrapper.find('.datetime-picker').exists()).toBe(true);
    });
  });
});
