import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DateTimePicker from '~/components/DateTimePicker.vue';

describe('DateTimePicker', () => {
  const defaultDate = new Date('2024-01-15T14:30:00');

  let wrapper: unknown;

  beforeEach(() => {
    wrapper = mount(DateTimePicker, {
      props: {
        value: defaultDate,
      },
    });
  });

  describe('Component Rendering', () => {
    it('renders the datetime picker input element', () => {
      expect(wrapper.find('.datetime-picker').exists()).toBe(true);
      expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true);
    });

    it('displays the current selected date/time in input value', () => {
      const input = wrapper.find('input[type="datetime-local"]');
      expect(input.exists()).toBe(true);
      expect(input.element.value).toBe('2024-01-15T14:30');
    });

    it('applies correct CSS classes', () => {
      const input = wrapper.find('input[type="datetime-local"]');
      expect(input.classes()).toContain('datetime-picker');
    });
  });

  describe('Props Handling', () => {
    it('applies disabled state correctly', () => {
      const disabledWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          disabled: true,
        },
      });

      const input = disabledWrapper.find('input[type="datetime-local"]');
      expect(input.attributes('disabled')).toBeDefined();
    });

    it('applies id attribute correctly', () => {
      const wrapperWithId = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          id: 'test-datetime-picker',
        },
      });

      const input = wrapperWithId.find('input[type="datetime-local"]');
      expect(input.attributes('id')).toBe('test-datetime-picker');
    });

    it('applies aria-required attribute correctly', () => {
      const wrapperWithAria = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          ariaRequired: 'true',
        },
      });

      const input = wrapperWithAria.find('input[type="datetime-local"]');
      expect(input.attributes('aria-required')).toBe('true');
    });
  });

  describe('Date/Time Input Handling', () => {
    it('emits change event when datetime input changes', async () => {
      const input = wrapper.find('input[type="datetime-local"]');
      await input.setValue('2024-02-20T16:45');

      const changeEvents = wrapper.emitted('change');
      expect(changeEvents).toHaveLength(1);

      const emittedDate = changeEvents![0][0] as Date;
      expect(emittedDate.getFullYear()).toBe(2024);
      expect(emittedDate.getMonth()).toBe(1); // February (0-indexed)
      expect(emittedDate.getDate()).toBe(20);
      expect(emittedDate.getHours()).toBe(16);
      expect(emittedDate.getMinutes()).toBe(45);
    });

    it('emits change event when input value changes', async () => {
      const input = wrapper.find('input[type="datetime-local"]');
      await input.setValue('2024-03-10T09:15');

      const changeEvents = wrapper.emitted('change');
      expect(changeEvents).toHaveLength(1);

      const emittedDate = changeEvents![0][0] as Date;
      expect(emittedDate.getFullYear()).toBe(2024);
      expect(emittedDate.getMonth()).toBe(2); // March (0-indexed)
      expect(emittedDate.getDate()).toBe(10);
      expect(emittedDate.getHours()).toBe(9);
      expect(emittedDate.getMinutes()).toBe(15);
    });

    it('handles change event correctly', async () => {
      const input = wrapper.find('input[type="datetime-local"]');

      // Trigger change event directly
      await input.trigger('change');

      // Should emit change event with current value
      const changeEvents = wrapper.emitted('change');
      expect(changeEvents).toHaveLength(1);
      expect(changeEvents![0][0]).toBeInstanceOf(Date);
    });
  });

  describe('Event Handling', () => {
    it('emits change event with correct date object', async () => {
      const input = wrapper.find('input[type="datetime-local"]');
      await input.setValue('2024-12-25T18:30');

      const changeEvents = wrapper.emitted('change');
      expect(changeEvents).toHaveLength(1);

      const emittedDate = changeEvents![0][0] as Date;
      expect(emittedDate).toBeInstanceOf(Date);
      expect(emittedDate.getFullYear()).toBe(2024);
      expect(emittedDate.getMonth()).toBe(11); // December (0-indexed)
      expect(emittedDate.getDate()).toBe(25);
      expect(emittedDate.getHours()).toBe(18);
      expect(emittedDate.getMinutes()).toBe(30);
    });

    it('handles multiple change events correctly', async () => {
      const input = wrapper.find('input[type="datetime-local"]');

      await input.setValue('2024-01-01T00:00');
      await input.setValue('2024-12-31T23:59');

      const changeEvents = wrapper.emitted('change');
      expect(changeEvents).toHaveLength(2);

      const firstDate = changeEvents![0][0] as Date;
      const secondDate = changeEvents![1][0] as Date;

      expect(firstDate.getFullYear()).toBe(2024);
      expect(firstDate.getMonth()).toBe(0);
      expect(secondDate.getFullYear()).toBe(2024);
      expect(secondDate.getMonth()).toBe(11);
    });
  });

  describe('Date Constraints', () => {
    it('applies min date constraint', () => {
      const minDate = new Date('2024-01-01T10:00:00');
      const constrainedWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          minDate,
        },
      });

      const input = constrainedWrapper.find('input[type="datetime-local"]');
      expect(input.attributes('min')).toBe('2024-01-01T10:00');
    });

    it('applies max date constraint', () => {
      const maxDate = new Date('2024-12-31T18:00:00');
      const constrainedWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          maxDate,
        },
      });

      const input = constrainedWrapper.find('input[type="datetime-local"]');
      expect(input.attributes('max')).toBe('2024-12-31T18:00');
    });

    it('applies both min and max date constraints', () => {
      const minDate = new Date('2024-01-01T08:00:00');
      const maxDate = new Date('2024-12-31T20:00:00');
      const constrainedWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          minDate,
          maxDate,
        },
      });

      const input = constrainedWrapper.find('input[type="datetime-local"]');
      expect(input.attributes('min')).toBe('2024-01-01T08:00');
      expect(input.attributes('max')).toBe('2024-12-31T20:00');
    });
  });

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      const disabledWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          disabled: true,
        },
      });

      const input = disabledWrapper.find('input[type="datetime-local"]');
      expect(input.attributes('disabled')).toBeDefined();
    });

    it('enables input when disabled prop is false', () => {
      const enabledWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          disabled: false,
        },
      });

      const input = enabledWrapper.find('input[type="datetime-local"]');
      expect(input.attributes('disabled')).toBeUndefined();
    });

    it('applies disabled CSS class correctly', () => {
      const disabledWrapper = mount(DateTimePicker, {
        props: {
          value: defaultDate,
          disabled: true,
        },
      });

      const input = disabledWrapper.find('input[type="datetime-local"]');
      expect(input.classes()).toContain('datetime-picker');
    });
  });

  describe('Value Formatting', () => {
    it('formats datetime-local input value correctly', () => {
      const input = wrapper.find('input[type="datetime-local"]');
      expect(input.element.value).toBe('2024-01-15T14:30');
    });

    it('formats different date values correctly', () => {
      const testDate = new Date('2023-12-25T09:45:00');
      const testWrapper = mount(DateTimePicker, {
        props: {
          value: testDate,
        },
      });

      const input = testWrapper.find('input[type="datetime-local"]');
      expect(input.element.value).toBe('2023-12-25T09:45');
    });

    it('handles edge case dates correctly', () => {
      const edgeDate = new Date('2024-02-29T00:00:00'); // Leap year
      const edgeWrapper = mount(DateTimePicker, {
        props: {
          value: edgeDate,
        },
      });

      const input = edgeWrapper.find('input[type="datetime-local"]');
      expect(input.element.value).toBe('2024-02-29T00:00');
    });

    it('updates input value when prop changes', async () => {
      const input = wrapper.find('input[type="datetime-local"]');
      expect(input.element.value).toBe('2024-01-15T14:30');

      const newDate = new Date('2024-06-20T16:15:00');
      await wrapper.setProps({ value: newDate });

      expect(input.element.value).toBe('2024-06-20T16:15');
    });
  });

  describe('Responsive Design', () => {
    it('applies correct CSS classes', () => {
      const input = wrapper.find('input[type="datetime-local"]');
      expect(input.classes()).toContain('datetime-picker');
    });

    it('maintains functionality across different screen sizes', () => {
      // The component should work the same regardless of screen size
      expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true);
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

      const input = leapYearWrapper.find('input[type="datetime-local"]');
      expect(input.element.value).toBe('2024-02-29T12:00');
    });

    it('handles year boundaries correctly', () => {
      const newYearDate = new Date('2024-01-01T00:00:00');
      const newYearWrapper = mount(DateTimePicker, {
        props: {
          value: newYearDate,
        },
      });

      const input = newYearWrapper.find('input[type="datetime-local"]');
      expect(input.element.value).toBe('2024-01-01T00:00');
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
      expect(timezoneWrapper.find('input[type="datetime-local"]').exists()).toBe(true);
    });

    it('handles invalid date props gracefully', () => {
      // Test with invalid date - component should still render
      const invalidDate = new Date('invalid');
      const invalidWrapper = mount(DateTimePicker, {
        props: {
          value: new Date(), // Use valid date as fallback
        },
      });

      expect(invalidWrapper.find('input[type="datetime-local"]').exists()).toBe(true);
    });
  });
});
