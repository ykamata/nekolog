import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SyncStatus from '~/components/SyncStatus.vue';
import type { SyncStatus as SyncStatusType } from '~/composables/useSync';

// Mock the useSync composable
const mockSyncStatus = ref<SyncStatusType>({
  isOnline: true,
  isSyncing: false,
  lastSync: new Date('2024-01-01T12:00:00Z'),
  pendingCount: 0,
  conflicts: [],
  error: null,
});

const mockManualSync = vi.fn();
const mockResolveConflict = vi.fn();

vi.mock('~/composables/useSync', () => ({
  useSync: () => ({
    syncStatus: mockSyncStatus,
    manualSync: mockManualSync,
    resolveConflict: mockResolveConflict,
  }),
}));

describe('SyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncStatus.value = {
      isOnline: true,
      isSyncing: false,
      lastSync: new Date('2024-01-01T12:00:00Z'),
      pendingCount: 0,
      conflicts: [],
      error: null,
    };
  });

  describe('online status display', () => {
    it('should show online status when connected', () => {
      const wrapper = mount(SyncStatus);

      expect(wrapper.text()).toContain('オンライン・同期済み');
      expect(wrapper.find('.bg-green-50').exists()).toBe(true);
      expect(wrapper.find('.bg-green-500').exists()).toBe(true);
    });

    it('should show offline status when disconnected', () => {
      mockSyncStatus.value.isOnline = false;

      const wrapper = mount(SyncStatus);

      expect(wrapper.text()).toContain('オフライン');
      expect(wrapper.find('.bg-red-50').exists()).toBe(true);
      expect(wrapper.find('.bg-red-500').exists()).toBe(true);
    });

    it('should show syncing status when syncing', () => {
      mockSyncStatus.value.isSyncing = true;

      const wrapper = mount(SyncStatus);

      expect(wrapper.text()).toContain('同期中...');
      expect(wrapper.find('.bg-blue-50').exists()).toBe(true);
      expect(wrapper.find('.bg-blue-500').exists()).toBe(true);
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });

    it('should show pending sync status when there are pending items', () => {
      mockSyncStatus.value.pendingCount = 3;

      const wrapper = mount(SyncStatus);

      expect(wrapper.text()).toContain('同期待ち (3件)');
      expect(wrapper.find('.bg-orange-50').exists()).toBe(true);
      expect(wrapper.find('.bg-orange-500').exists()).toBe(true);
    });

    it('should show conflict status when there are conflicts', () => {
      mockSyncStatus.value.conflicts = [
        {
          type: 'cat',
          localData: { name: 'Local Cat' },
          serverData: { name: 'Server Cat' },
          field: 'name',
          localId: 'local-1',
          serverId: 'server-1',
        },
      ];

      const wrapper = mount(SyncStatus);

      expect(wrapper.text()).toContain('競合あり (1件)');
      expect(wrapper.find('.bg-yellow-50').exists()).toBe(true);
      expect(wrapper.find('.bg-yellow-500').exists()).toBe(true);
    });
  });

  describe('manual sync button', () => {
    it('should show manual sync button when online and has pending items', () => {
      mockSyncStatus.value.pendingCount = 2;

      const wrapper = mount(SyncStatus);

      const syncButton = wrapper.find('button:contains("同期実行")');
      expect(syncButton.exists()).toBe(true);
    });

    it('should not show manual sync button when offline', () => {
      mockSyncStatus.value.isOnline = false;
      mockSyncStatus.value.pendingCount = 2;

      const wrapper = mount(SyncStatus);

      const syncButton = wrapper.find('button:contains("同期実行")');
      expect(syncButton.exists()).toBe(false);
    });

    it('should not show manual sync button when syncing', () => {
      mockSyncStatus.value.isSyncing = true;
      mockSyncStatus.value.pendingCount = 2;

      const wrapper = mount(SyncStatus);

      const syncButton = wrapper.find('button:contains("同期実行")');
      expect(syncButton.exists()).toBe(false);
    });

    it('should not show manual sync button when no pending items', () => {
      mockSyncStatus.value.pendingCount = 0;

      const wrapper = mount(SyncStatus);

      const syncButton = wrapper.find('button:contains("同期実行")');
      expect(syncButton.exists()).toBe(false);
    });

    it('should call manualSync when sync button is clicked', async () => {
      mockSyncStatus.value.pendingCount = 2;
      mockManualSync.mockResolvedValue({
        success: true,
        syncedCount: 2,
        conflicts: [],
      });

      const wrapper = mount(SyncStatus);

      const syncButton = wrapper.find('button:contains("同期実行")');
      await syncButton.trigger('click');

      expect(mockManualSync).toHaveBeenCalled();
    });
  });

  describe('details section', () => {
    it('should show details when showDetails is true', async () => {
      const wrapper = mount(SyncStatus);

      // Click to show details
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      expect(wrapper.text()).toContain('最後の同期:');
      expect(wrapper.text()).toContain('2024/01/01 21:00'); // JST time
    });

    it('should hide details when showDetails is false', () => {
      const wrapper = mount(SyncStatus, {
        props: { compact: true },
      });

      expect(wrapper.find('.mt-2.p-3.bg-gray-50').exists()).toBe(false);
    });

    it('should show pending count in details', async () => {
      mockSyncStatus.value.pendingCount = 5;

      const wrapper = mount(SyncStatus);

      // Show details
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      expect(wrapper.text()).toContain('同期待ち:');
      expect(wrapper.text()).toContain('5件');
    });

    it('should show error in details', async () => {
      mockSyncStatus.value.error = 'Network connection failed';

      const wrapper = mount(SyncStatus);

      // Show details
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      expect(wrapper.text()).toContain('エラー:');
      expect(wrapper.text()).toContain('Network connection failed');
    });

    it('should show conflicts in details', async () => {
      mockSyncStatus.value.conflicts = [
        {
          type: 'cat',
          localData: { name: 'Local Cat' },
          serverData: { name: 'Server Cat' },
          field: 'name',
          localId: 'local-1',
          serverId: 'server-1',
        },
        {
          type: 'food',
          localData: { name: 'Local Food' },
          serverData: { name: 'Server Food' },
          field: 'name',
          localId: 'local-2',
          serverId: 'server-2',
        },
      ];

      const wrapper = mount(SyncStatus);

      // Show details
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      expect(wrapper.text()).toContain('競合:');
      expect(wrapper.text()).toContain('2件の競合があります');
      expect(wrapper.find('button:contains("解決する")').exists()).toBe(true);
    });
  });

  describe('conflict resolution dialog', () => {
    beforeEach(() => {
      mockSyncStatus.value.conflicts = [
        {
          type: 'cat',
          localData: { name: 'Local Cat', weight: 4.5 },
          serverData: { name: 'Server Cat', weight: 5.0 },
          field: 'name',
          localId: 'local-1',
          serverId: 'server-1',
        },
      ];
    });

    it('should open conflict dialog when resolve button is clicked', async () => {
      const wrapper = mount(SyncStatus);

      // Show details first
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      // Click resolve button
      const resolveButton = wrapper.find('button:contains("解決する")');
      await resolveButton.trigger('click');

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true);
      expect(wrapper.text()).toContain('データ競合の解決');
    });

    it('should display conflict data in dialog', async () => {
      const wrapper = mount(SyncStatus);

      // Show details and open dialog
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      const resolveButton = wrapper.find('button:contains("解決する")');
      await resolveButton.trigger('click');

      expect(wrapper.text()).toContain('猫の競合');
      expect(wrapper.text()).toContain('ローカル版');
      expect(wrapper.text()).toContain('サーバー版');
      expect(wrapper.text()).toContain('Local Cat');
      expect(wrapper.text()).toContain('Server Cat');
    });

    it('should close dialog when close button is clicked', async () => {
      const wrapper = mount(SyncStatus);

      // Open dialog
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      const resolveButton = wrapper.find('button:contains("解決する")');
      await resolveButton.trigger('click');

      // Close dialog
      const closeButton = wrapper.find('button:contains("閉じる")');
      await closeButton.trigger('click');

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
    });

    it('should close dialog when clicking outside', async () => {
      const wrapper = mount(SyncStatus);

      // Open dialog
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      const resolveButton = wrapper.find('button:contains("解決する")');
      await resolveButton.trigger('click');

      // Click outside (on backdrop)
      const backdrop = wrapper.find('.fixed.inset-0');
      await backdrop.trigger('click');

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
    });

    it('should resolve conflict with local data when local button is clicked', async () => {
      mockResolveConflict.mockResolvedValue(undefined);

      const wrapper = mount(SyncStatus);

      // Open dialog
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      const resolveButton = wrapper.find('button:contains("解決する")');
      await resolveButton.trigger('click');

      // Click local version button
      const localButtons = wrapper.findAll('button:contains("この版を使用")');
      await localButtons[0].trigger('click'); // First button is local version

      expect(mockResolveConflict).toHaveBeenCalledWith(
        mockSyncStatus.value.conflicts[0],
        true,
      );
    });

    it('should resolve conflict with server data when server button is clicked', async () => {
      mockResolveConflict.mockResolvedValue(undefined);

      const wrapper = mount(SyncStatus);

      // Open dialog
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      const resolveButton = wrapper.find('button:contains("解決する")');
      await resolveButton.trigger('click');

      // Click server version button
      const serverButtons = wrapper.findAll('button:contains("この版を使用")');
      await serverButtons[1].trigger('click'); // Second button is server version

      expect(mockResolveConflict).toHaveBeenCalledWith(
        mockSyncStatus.value.conflicts[0],
        false,
      );
    });
  });

  describe('compact mode', () => {
    it('should not show details by default in compact mode', () => {
      const wrapper = mount(SyncStatus, {
        props: { compact: true },
      });

      expect(wrapper.find('.mt-2.p-3.bg-gray-50').exists()).toBe(false);
    });

    it('should still allow toggling details in compact mode', async () => {
      const wrapper = mount(SyncStatus, {
        props: { compact: true },
      });

      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      expect(wrapper.find('.mt-2.p-3.bg-gray-50').exists()).toBe(true);
    });
  });

  describe('date formatting', () => {
    it('should format date in Japanese locale', async () => {
      mockSyncStatus.value.lastSync = new Date('2024-03-15T14:30:00Z');

      const wrapper = mount(SyncStatus);

      // Show details
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      // Check for Japanese date format (JST)
      expect(wrapper.text()).toMatch(/2024\/03\/15.*23:30/);
    });
  });

  describe('conflict type titles', () => {
    it('should show correct titles for different conflict types', async () => {
      mockSyncStatus.value.conflicts = [
        {
          type: 'cat',
          localData: {},
          serverData: {},
          field: 'name',
          localId: 'local-1',
          serverId: 'server-1',
        },
        {
          type: 'food',
          localData: {},
          serverData: {},
          field: 'type',
          localId: 'local-2',
          serverId: 'server-2',
        },
        {
          type: 'meal',
          localData: {},
          serverData: {},
          field: 'quantity',
          localId: 'local-3',
          serverId: 'server-3',
        },
      ];

      const wrapper = mount(SyncStatus);

      // Open dialog
      const detailsButton = wrapper.find('button:contains("詳細を表示")');
      await detailsButton.trigger('click');

      const resolveButton = wrapper.find('button:contains("解決する")');
      await resolveButton.trigger('click');

      expect(wrapper.text()).toContain('猫の競合 (name)');
      expect(wrapper.text()).toContain('フードの競合 (type)');
      expect(wrapper.text()).toContain('食事記録の競合 (quantity)');
    });
  });
});
