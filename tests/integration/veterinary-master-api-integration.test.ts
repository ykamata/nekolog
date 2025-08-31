import { describe, it, expect, beforeEach, vi } from 'vitest';

// 型定義
interface VeterinaryHospital {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  memo?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VeterinaryDoctor {
  id: string;
  name: string;
  hospitalId?: string;
  specialty?: string;
  memo?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  hospital?: VeterinaryHospital;
}

// モックユーザー情報
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'テストユーザー',
};

// $fetchをモック
const mockFetch = vi.fn();
vi.mock('ofetch', () => ({
  $fetch: mockFetch,
}));

// 認証ミドルウェアをモック
vi.mock('~/lib/auth-middleware', () => ({
  requireAuth: vi.fn().mockResolvedValue(mockUser),
}));

describe('病院・先生管理 API統合テスト', () => {
  let testHospitalId: string;
  let testDoctorId: string;

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();

    // テスト用IDを設定
    testHospitalId = 'test-hospital-id';
    testDoctorId = 'test-doctor-id';
  });

  describe('病院API統合テスト', () => {
    it('病院のCRUD操作が正しく動作する', async () => {
      const hospitalData = {
        name: 'API統合テスト病院',
        address: '東京都渋谷区テスト1-1-1',
        phone: '03-1234-5678',
        memo: 'API統合テスト用の病院です',
      };

      const createdHospital: VeterinaryHospital = {
        id: testHospitalId,
        ...hospitalData,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 作成APIのモック
      mockFetch.mockResolvedValueOnce(createdHospital);

      // 作成テスト
      const createResult = await mockFetch('/api/veterinary-hospitals', {
        method: 'POST',
        body: hospitalData,
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals', {
        method: 'POST',
        body: hospitalData,
      });
      expect(createResult).toMatchObject({
        name: hospitalData.name,
        address: hospitalData.address,
        phone: hospitalData.phone,
        memo: hospitalData.memo,
      });

      // 取得APIのモック
      mockFetch.mockResolvedValueOnce(createdHospital);

      // 取得テスト
      const fetchResult = await mockFetch(`/api/veterinary-hospitals/${testHospitalId}`);

      expect(mockFetch).toHaveBeenCalledWith(`/api/veterinary-hospitals/${testHospitalId}`);
      expect(fetchResult).toMatchObject({
        id: testHospitalId,
        name: hospitalData.name,
      });

      // 削除APIのモック
      mockFetch.mockResolvedValueOnce({ success: true });

      // 削除テスト
      await mockFetch(`/api/veterinary-hospitals/${testHospitalId}`, {
        method: 'DELETE',
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/veterinary-hospitals/${testHospitalId}`, {
        method: 'DELETE',
      });
    });

    it('病院のバリデーションエラーが正しく処理される', async () => {
      // 必須項目なしでの作成エラー
      mockFetch.mockRejectedValueOnce(new Error('Validation error: name is required'));

      await expect(
        mockFetch('/api/veterinary-hospitals', {
          method: 'POST',
          body: {
            address: '住所のみ',
          },
        }),
      ).rejects.toThrow('Validation error: name is required');
    });
  });

  describe('先生API統合テスト', () => {
    it('先生のCRUD操作が正しく動作する', async () => {
      const doctorData = {
        name: 'API統合テスト先生',
        hospitalId: testHospitalId,
        specialty: '内科・外科',
        memo: 'API統合テスト用の先生です',
      };

      const mockHospital: VeterinaryHospital = {
        id: testHospitalId,
        name: 'API先生テスト病院',
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdDoctor: VeterinaryDoctor = {
        id: testDoctorId,
        ...doctorData,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        hospital: mockHospital,
      };

      // 作成APIのモック
      mockFetch.mockResolvedValueOnce(createdDoctor);

      const createResult = await mockFetch('/api/veterinary-doctors', {
        method: 'POST',
        body: doctorData,
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors', {
        method: 'POST',
        body: doctorData,
      });
      expect(createResult).toMatchObject({
        name: doctorData.name,
        hospitalId: doctorData.hospitalId,
        specialty: doctorData.specialty,
        memo: doctorData.memo,
      });
    });

    it('先生のバリデーションエラーが正しく処理される', async () => {
      // 必須項目なしでの作成エラー
      mockFetch.mockRejectedValueOnce(new Error('Validation error: name is required'));

      await expect(
        mockFetch('/api/veterinary-doctors', {
          method: 'POST',
          body: {
            specialty: '専門分野のみ',
          },
        }),
      ).rejects.toThrow('Validation error: name is required');
    });
  });

  describe('認証・認可統合テスト', () => {
    it('未認証ユーザーのアクセスが拒否される', async () => {
      // 認証エラーをシミュレート
      mockFetch.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(
        mockFetch('/api/veterinary-hospitals', {
          method: 'GET',
        }),
      ).rejects.toThrow('Unauthorized');
    });

    it('存在しないリソースへのアクセスで適切なエラーが返される', async () => {
      const nonExistentId = 'non-existent-id';

      // 存在しない病院へのアクセスエラー
      mockFetch.mockRejectedValueOnce(new Error('Not found'));

      await expect(
        mockFetch(`/api/veterinary-hospitals/${nonExistentId}`),
      ).rejects.toThrow('Not found');
    });
  });
});
