import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MedicationStatusBadge from '~/components/MedicationStatusBadge.vue';
import { MedicationStatus } from '~/types/medication';

describe('MedicationStatusBadge', () => {
  it('renders PENDING status correctly', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.PENDING,
      },
    });

    expect(wrapper.text()).toBe('予定');
    expect(wrapper.classes()).toContain('bg-yellow-100');
    expect(wrapper.classes()).toContain('text-yellow-800');
  });

  it('renders ADMINISTERED status correctly', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.ADMINISTERED,
      },
    });

    expect(wrapper.text()).toBe('投与済み');
    expect(wrapper.classes()).toContain('bg-green-100');
    expect(wrapper.classes()).toContain('text-green-800');
  });

  it('renders SKIPPED status correctly', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.SKIPPED,
      },
    });

    expect(wrapper.text()).toBe('スキップ');
    expect(wrapper.classes()).toContain('bg-gray-100');
    expect(wrapper.classes()).toContain('text-gray-800');
  });

  it('renders MISSED status correctly', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.MISSED,
      },
    });

    expect(wrapper.text()).toBe('未投与');
    expect(wrapper.classes()).toContain('bg-red-100');
    expect(wrapper.classes()).toContain('text-red-800');
  });

  it('shows icon by default', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.ADMINISTERED,
      },
    });

    const icon = wrapper.find('.w-2.h-2.rounded-full');
    expect(icon.exists()).toBe(true);
    expect(icon.classes()).toContain('bg-green-400');
  });

  it('hides icon when showIcon is false', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.ADMINISTERED,
        showIcon: false,
      },
    });

    const icon = wrapper.find('.w-2.h-2.rounded-full');
    expect(icon.exists()).toBe(false);
  });

  it('applies correct size classes', () => {
    const smallWrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.ADMINISTERED,
        size: 'sm',
      },
    });

    const largeWrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.ADMINISTERED,
        size: 'lg',
      },
    });

    expect(smallWrapper.classes()).toContain('px-2');
    expect(smallWrapper.classes()).toContain('py-0.5');
    expect(smallWrapper.classes()).toContain('text-xs');

    expect(largeWrapper.classes()).toContain('px-3');
    expect(largeWrapper.classes()).toContain('py-1');
    expect(largeWrapper.classes()).toContain('text-sm');
  });

  it('handles unknown status gracefully', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: 'UNKNOWN' as MedicationStatus,
      },
    });

    expect(wrapper.text()).toBe('不明');
    expect(wrapper.classes()).toContain('bg-gray-100');
    expect(wrapper.classes()).toContain('text-gray-800');
  });

  it('has correct default props', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.PENDING,
      },
    });

    // Default size should be 'md'
    expect(wrapper.classes()).toContain('px-2.5');
    expect(wrapper.classes()).toContain('py-0.5');
    expect(wrapper.classes()).toContain('text-xs');

    // Default showIcon should be true
    const icon = wrapper.find('.w-2.h-2.rounded-full');
    expect(icon.exists()).toBe(true);
  });

  it('has proper accessibility attributes', () => {
    const wrapper = mount(MedicationStatusBadge, {
      props: {
        status: MedicationStatus.ADMINISTERED,
      },
    });

    const badge = wrapper.find('span');
    expect(badge.classes()).toContain('inline-flex');
    expect(badge.classes()).toContain('items-center');
    expect(badge.classes()).toContain('rounded-full');
    expect(badge.classes()).toContain('font-medium');
  });
});
