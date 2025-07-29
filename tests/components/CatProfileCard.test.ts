import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CatProfileCard from '~/components/CatProfileCard.vue';
import ConfirmationDialog from '~/components/ConfirmationDialog.vue';
import type { Cat } from '~/types/cat-meal';

// Mock $fetch
global.$fetch = vi.fn();

describe('CatProfileCard', () => {
  const mockCat: Cat = {
    id: 'cat-1',
    name: 'テスト猫',
    birthdate: new Date('2019-01-01'), // 5 years ago to match the expected age
    weight: 4.5,
    photoUrl: 'https://example.com/cat.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cat information correctly', () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
      },
    });

    expect(wrapper.text()).toContain('テスト猫');
    expect(wrapper.text()).toContain('6歳');
    expect(wrapper.text()).toContain('4.5kg');
  });

  it('displays cat photo when photoUrl is provided', () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
      },
    });

    const img = wrapper.find('.cat-card__image');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://example.com/cat.jpg');
    expect(img.attributes('alt')).toBe('テスト猫');
  });

  it('displays placeholder when no photo is provided', () => {
    const catWithoutPhoto = { ...mockCat, photoUrl: undefined };
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: catWithoutPhoto,
      },
    });

    expect(wrapper.find('.cat-card__image--placeholder').exists()).toBe(true);
    expect(wrapper.find('.cat-card__image--placeholder').text()).toBe('🐱');
  });

  it('expands and collapses when expand button is clicked', async () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
      },
    });

    const expandBtn = wrapper.find('.cat-card__expand-btn');
    expect(expandBtn.text()).toBe('▼');

    await expandBtn.trigger('click');
    expect(expandBtn.text()).toBe('▲');
    expect(wrapper.classes()).toContain('cat-card--expanded');
  });

  it('loads meal stats when expanded and showMealStats is true', async () => {
    const mockMealStats = {
      data: {
        summary: {
          totalMeals: 10,
          totalCalories: 500,
          averageCaloriesPerMeal: 50,
        },
        analytics: {
          dailyCalories: [{ date: '2023-01-01', calories: 100 }],
        },
      },
    };

    (global.$fetch as any).mockResolvedValue(mockMealStats);

    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
        showMealStats: true,
      },
    });

    await wrapper.find('.cat-card__expand-btn').trigger('click');
    await wrapper.vm.$nextTick();

    expect(global.$fetch).toHaveBeenCalledWith(
      `/api/meals/analytics?catId=${mockCat.id}&days=7`,
    );
  });

  it('emits select event when cat is selected', async () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
      },
    });

    // Simulate select action (this would typically be triggered by a click)
    wrapper.vm.selectCat();
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0][0]).toBe(mockCat.id);
  });

  it('emits edit event when edit button is clicked', async () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
      },
    });

    const editBtn = wrapper.find(
      '.cat-card__btn:not(.cat-card__btn--primary):not(.cat-card__btn--danger)',
    );
    await editBtn.trigger('click');

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')![0][0]).toEqual(mockCat);
  });

  it('emits quick-meal event when quick meal button is clicked', async () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
      },
    });

    const quickMealBtn = wrapper.find('.cat-card__btn--primary');
    await quickMealBtn.trigger('click');

    expect(wrapper.emitted('quick-meal')).toBeTruthy();
    expect(wrapper.emitted('quick-meal')![0][0]).toEqual(mockCat);
  });

  it('shows delete confirmation dialog when delete button is clicked', async () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
      },
    });

    const deleteBtn = wrapper.find('.cat-card__btn--danger');
    await deleteBtn.trigger('click');

    const confirmationDialog = wrapper.findComponent(ConfirmationDialog);
    expect(confirmationDialog.exists()).toBe(true);
    expect(confirmationDialog.props('isOpen')).toBe(true);
    expect(confirmationDialog.props('title')).toBe('テスト猫を削除');
  });

  it('emits delete event when deletion is confirmed', async () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
      },
    });

    // Click delete button
    const deleteBtn = wrapper.find('.cat-card__btn--danger');
    await deleteBtn.trigger('click');

    // Confirm deletion
    const confirmationDialog = wrapper.findComponent(ConfirmationDialog);
    await confirmationDialog.vm.$emit('confirm');

    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('delete')![0][0]).toBe(mockCat.id);
  });

  it('applies correct theme classes', () => {
    const lightWrapper = mount(CatProfileCard, {
      props: { cat: mockCat, theme: 'light' },
    });
    expect(lightWrapper.classes()).toContain('cat-card--light');

    const darkWrapper = mount(CatProfileCard, {
      props: { cat: mockCat, theme: 'dark' },
    });
    expect(darkWrapper.classes()).toContain('cat-card--dark');

    const colorfulWrapper = mount(CatProfileCard, {
      props: { cat: mockCat, theme: 'colorful' },
    });
    expect(colorfulWrapper.classes()).toContain('cat-card--colorful');
  });

  it('calculates weight status correctly', () => {
    const lightCat = { ...mockCat, weight: 2.5 };
    const heavyCat = { ...mockCat, weight: 7.0 };
    const normalCat = { ...mockCat, weight: 4.5 };

    const lightWrapper = mount(CatProfileCard, { props: { cat: lightCat } });
    const heavyWrapper = mount(CatProfileCard, { props: { cat: heavyCat } });
    const normalWrapper = mount(CatProfileCard, { props: { cat: normalCat } });

    expect(lightWrapper.text()).toContain('軽い');
    expect(heavyWrapper.text()).toContain('重い');
    expect(normalWrapper.text()).toContain('適正');
  });

  it('handles cats without birthdate', () => {
    const catWithoutBirthdate = { ...mockCat, birthdate: undefined };
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: catWithoutBirthdate,
      },
    });

    expect(wrapper.text()).toContain('不明');
  });

  it('handles cats without weight', () => {
    const catWithoutWeight = { ...mockCat, weight: undefined };
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: catWithoutWeight,
      },
    });

    expect(wrapper.text()).toContain('未記録');
  });

  it('does not load meal stats when showMealStats is false', async () => {
    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
        showMealStats: false,
      },
    });

    await wrapper.find('.cat-card__expand-btn').trigger('click');
    await wrapper.vm.$nextTick();

    expect(global.$fetch).not.toHaveBeenCalled();
    expect(wrapper.find('.cat-card__meal-stats').exists()).toBe(false);
  });

  it('handles meal stats loading error gracefully', async () => {
    (global.$fetch as unknown).mockRejectedValue(new Error('API Error'));

    const wrapper = mount(CatProfileCard, {
      props: {
        cat: mockCat,
        showMealStats: true,
      },
    });

    await wrapper.find('.cat-card__expand-btn').trigger('click');
    await wrapper.vm.$nextTick();

    // Should not crash and should show default stats
    expect(wrapper.find('.cat-card__meal-stats').exists()).toBe(true);
  });
});
