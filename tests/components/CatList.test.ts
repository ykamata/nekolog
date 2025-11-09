import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CatList from '~/components/CatList.vue';
import ConfirmationDialog from '~/components/ConfirmationDialog.vue';
import type { Cat } from '~/types/cat-meal';

describe('CatList', () => {
  const mockCats: Cat[] = [
    {
      id: 1,
      name: 'テスト猫1',
      birthdate: new Date('2019-01-01'), // 5 years ago
      weight: 4.5,
      photoUrl: 'https://example.com/cat1.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: 'テスト猫2',
      birthdate: new Date('2019-06-15'),
      weight: 3.2,
      photoUrl: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cat list with provided cats', () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    expect(wrapper.findAll('.cat-card')).toHaveLength(2);
    expect(wrapper.text()).toContain('テスト猫1');
    expect(wrapper.text()).toContain('テスト猫2');
  });

  it('shows loading state when loading prop is true', () => {
    const wrapper = mount(CatList, {
      props: {
        cats: [],
        loading: true,
      },
    });

    expect(wrapper.find('.cat-list__loading').exists()).toBe(true);
    expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    expect(wrapper.text()).toContain('猫の情報を読み込み中...');
  });

  it('shows empty state when no cats are provided', () => {
    const wrapper = mount(CatList, {
      props: {
        cats: [],
      },
    });

    expect(wrapper.find('.cat-list__empty').exists()).toBe(true);
    expect(wrapper.text()).toContain('猫が登録されていません');
    expect(wrapper.text()).toContain(
      '最初の猫を追加して、食事管理を始めましょう。',
    );
  });

  it('emits add event when add button is clicked', async () => {
    const wrapper = mount(CatList, {
      props: {
        cats: [],
      },
    });

    await wrapper.find('.btn--primary').trigger('click');
    expect(wrapper.emitted('add')).toBeTruthy();
  });

  it('emits select event when cat card is clicked', async () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    await wrapper.find('.cat-card').trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0][0]).toEqual(mockCats[0]);
  });

  it('emits edit event when edit button is clicked', async () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    const editButtons = wrapper.findAll('.btn--secondary');
    const editButton = editButtons.find(btn => btn.text() === '編集');
    await editButton!.trigger('click');

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')![0][0]).toEqual(mockCats[0]);
  });

  it('shows delete confirmation dialog when delete button is clicked', async () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    const deleteButtons = wrapper.findAll('.btn--danger');
    const deleteButton = deleteButtons.find(btn => btn.text() === '削除');
    await deleteButton!.trigger('click');

    const confirmationDialog = wrapper.findComponent(ConfirmationDialog);
    expect(confirmationDialog.exists()).toBe(true);
    expect(confirmationDialog.props('isOpen')).toBe(true);
    expect(confirmationDialog.props('title')).toBe('テスト猫1を削除');
  });

  it('emits delete event when deletion is confirmed', async () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    // Click delete button
    const deleteButtons = wrapper.findAll('.btn--danger');
    const deleteButton = deleteButtons.find(btn => btn.text() === '削除');
    await deleteButton!.trigger('click');

    // Confirm deletion
    const confirmationDialog = wrapper.findComponent(ConfirmationDialog);
    await confirmationDialog.vm.$emit('confirm');

    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('delete')![0][0]).toEqual(mockCats[0]);
  });

  it('closes confirmation dialog when deletion is cancelled', async () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    // Click delete button
    const deleteButtons = wrapper.findAll('.btn--danger');
    const deleteButton = deleteButtons.find(btn => btn.text() === '削除');
    await deleteButton!.trigger('click');

    // Cancel deletion
    const confirmationDialog = wrapper.findComponent(ConfirmationDialog);
    await confirmationDialog.vm.$emit('cancel');

    await wrapper.vm.$nextTick();

    expect(confirmationDialog.props('isOpen')).toBe(false);
    expect(wrapper.emitted('delete')).toBeFalsy();
  });

  it('displays cat information correctly', () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    const firstCard = wrapper.find('.cat-card');
    expect(firstCard.text()).toContain('テスト猫1');
    expect(firstCard.text()).toContain('6歳'); // Age calculation
    expect(firstCard.text()).toContain('4.5kg');
  });

  it('handles cats without photos correctly', () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    const catCards = wrapper.findAll('.cat-card');
    const secondCard = catCards[1];

    // Second cat has no photo, should show placeholder
    expect(secondCard.find('.cat-card__image--placeholder').exists()).toBe(
      true,
    );
    expect(secondCard.find('.cat-card__image--placeholder').text()).toBe('🐱');
  });

  it('hides actions when showActions is false', () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
        showActions: false,
      },
    });

    expect(wrapper.find('.cat-card__actions').exists()).toBe(false);
    expect(wrapper.find('.cat-list__header .btn--primary').exists()).toBe(
      false,
    );
  });

  it('calculates age correctly for cats under 1 year', () => {
    const youngCat: Cat = {
      id: 100,
      name: '子猫',
      birthdate: new Date(Date.now() - 5 * 30.44 * 24 * 60 * 60 * 1000), // 5 months ago (using more precise month calculation)
      weight: 2.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const wrapper = mount(CatList, {
      props: {
        cats: [youngCat],
      },
    });

    expect(wrapper.text()).toContain('5ヶ月');
  });

  it('handles image load errors gracefully', async () => {
    const wrapper = mount(CatList, {
      props: {
        cats: mockCats,
      },
    });

    const img = wrapper.find('.cat-card__image');
    await img.trigger('error');

    // The image should be hidden on error
    expect((img.element as HTMLImageElement).style.display).toBe('none');
  });
});
