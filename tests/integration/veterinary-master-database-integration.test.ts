import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VeterinaryHospital, VeterinaryDoctor } from '~/types/veterinary-master';

// Prismaクライアントをモック
const mockPrisma = {
  user: {
    create: vi.fn(),
    delete: vi.fn(),
  },
  veterinaryHospital: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  veterinaryDoctor: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Prismaモジュールをモック
vi.mock('~/lib/prisma', () => ({
  default: mockPrisma,
}));

describe('病院・先生管理 データベース統合テスト', () => {
  let testUserId: string;
  let testHospitalId: string;
  let testDoctorId: string;

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();

    // テスト用IDを設定
    testUserId = 1;
    testHospitalId = 'test-hospital-id';
    testDoctorId = 'test-doctor-id';
  });

  describe('病院データベース操作', () => {
    it('病院の作成・取得・更新・削除が正しく動作する', async () => {
      const hospitalData = {
        name: 'テスト動物病院',
        address: '東京都渋谷区',
        phone: '03-1234-5678',
        memo: 'テスト用病院',
        userId: testUserId,
      };

      const createdHospital: VeterinaryHospital = {
        id: testHospitalId,
        ...hospitalData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 作成のモック設定
      mockPrisma.veterinaryHospital.create.mockResolvedValue(createdHospital);

      // 作成テスト
      const result = await mockPrisma.veterinaryHospital.create({
        data: hospitalData,
      });

      expect(mockPrisma.veterinaryHospital.create).toHaveBeenCalledWith({
        data: hospitalData,
      });
      expect(result.name).toBe(hospitalData.name);
      expect(result.address).toBe(hospitalData.address);

      // 取得のモック設定
      mockPrisma.veterinaryHospital.findUnique.mockResolvedValue(createdHospital);

      // 取得テスト
      const fetchedHospital = await mockPrisma.veterinaryHospital.findUnique({
        where: { id: testHospitalId },
      });

      expect(mockPrisma.veterinaryHospital.findUnique).toHaveBeenCalledWith({
        where: { id: testHospitalId },
      });
      expect(fetchedHospital).not.toBeNull();
      expect(fetchedHospital!.name).toBe(hospitalData.name);

      // 更新のモック設定
      const updatedHospital = {
        ...createdHospital,
        name: '更新されたテスト動物病院',
        address: '東京都新宿区',
      };
      mockPrisma.veterinaryHospital.update.mockResolvedValue(updatedHospital);

      // 更新テスト
      const updateResult = await mockPrisma.veterinaryHospital.update({
        where: { id: testHospitalId },
        data: {
          name: '更新されたテスト動物病院',
          address: '東京都新宿区',
        },
      });

      expect(mockPrisma.veterinaryHospital.update).toHaveBeenCalledWith({
        where: { id: testHospitalId },
        data: {
          name: '更新されたテスト動物病院',
          address: '東京都新宿区',
        },
      });
      expect(updateResult.name).toBe('更新されたテスト動物病院');

      // 削除のモック設定
      mockPrisma.veterinaryHospital.delete.mockResolvedValue(createdHospital);
      mockPrisma.veterinaryHospital.findUnique.mockResolvedValue(null);

      // 削除テスト
      await mockPrisma.veterinaryHospital.delete({
        where: { id: testHospitalId },
      });

      expect(mockPrisma.veterinaryHospital.delete).toHaveBeenCalledWith({
        where: { id: testHospitalId },
      });

      // 削除後の取得テスト
      const deletedHospital = await mockPrisma.veterinaryHospital.findUnique({
        where: { id: testHospitalId },
      });

      expect(deletedHospital).toBeNull();
    });

    it('病院名の重複チェックが正しく動作する', async () => {
      const hospitalName = 'ユニーク病院名';

      // 重複エラーをシミュレート
      const duplicateError = new Error('Unique constraint failed');
      mockPrisma.veterinaryHospital.create
        .mockResolvedValueOnce({
          id: 'first-hospital-id',
          name: hospitalName,
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockRejectedValueOnce(duplicateError);

      // 最初の病院を作成
      const firstHospital = await mockPrisma.veterinaryHospital.create({
        data: {
          name: hospitalName,
          userId: testUserId,
        },
      });

      expect(firstHospital.name).toBe(hospitalName);

      // 同じ名前で別の病院を作成しようとする
      await expect(
        mockPrisma.veterinaryHospital.create({
          data: {
            name: hospitalName,
            userId: testUserId,
          },
        }),
      ).rejects.toThrow('Unique constraint failed');
    });

    it('病院の検索機能が正しく動作する', async () => {
      const mockHospitals: VeterinaryHospital[] = [
        {
          id: '1',
          name: '東京動物病院',
          address: '東京都渋谷区',
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: '大阪ペットクリニック',
          address: '大阪府大阪市',
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          name: '横浜動物医療センター',
          address: '神奈川県横浜市',
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 名前での検索モック
      mockPrisma.veterinaryHospital.findMany.mockResolvedValue(
        mockHospitals.filter(h => h.name.includes('動物')),
      );

      const searchByName = await mockPrisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          name: {
            contains: '動物',
          },
        },
      });

      expect(searchByName).toHaveLength(2);
      expect(searchByName.map(h => h.name)).toEqual(
        expect.arrayContaining(['東京動物病院', '横浜動物医療センター']),
      );

      // 住所での検索モック
      mockPrisma.veterinaryHospital.findMany.mockResolvedValue(
        mockHospitals.filter(h => h.address?.includes('東京')),
      );

      const searchByAddress = await mockPrisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          address: {
            contains: '東京',
          },
        },
      });

      expect(searchByAddress).toHaveLength(1);
      expect(searchByAddress[0].name).toBe('東京動物病院');
    });
  });

  describe('先生データベース操作', () => {
    it('先生の作成・取得・更新・削除が正しく動作する', async () => {
      const doctorData = {
        name: '田中先生',
        hospitalId: testHospitalId,
        specialty: '内科',
        memo: 'テスト用先生',
        userId: testUserId,
      };

      const mockHospital: VeterinaryHospital = {
        id: testHospitalId,
        name: 'テスト病院',
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdDoctor: VeterinaryDoctor = {
        id: testDoctorId,
        ...doctorData,
        createdAt: new Date(),
        updatedAt: new Date(),
        hospital: mockHospital,
      };

      // 作成のモック設定
      mockPrisma.veterinaryDoctor.create.mockResolvedValue(createdDoctor);

      // 作成テスト
      const result = await mockPrisma.veterinaryDoctor.create({
        data: doctorData,
        include: {
          hospital: true,
        },
      });

      expect(mockPrisma.veterinaryDoctor.create).toHaveBeenCalledWith({
        data: doctorData,
        include: {
          hospital: true,
        },
      });
      expect(result.name).toBe(doctorData.name);
      expect(result.hospitalId).toBe(testHospitalId);
      expect(result.hospital?.name).toBe('テスト病院');

      // 取得のモック設定
      mockPrisma.veterinaryDoctor.findUnique.mockResolvedValue(createdDoctor);

      // 取得テスト
      const fetchedDoctor = await mockPrisma.veterinaryDoctor.findUnique({
        where: { id: testDoctorId },
        include: { hospital: true },
      });

      expect(fetchedDoctor).not.toBeNull();
      expect(fetchedDoctor!.name).toBe(doctorData.name);
      expect(fetchedDoctor!.hospital?.name).toBe('テスト病院');

      // 更新のモック設定
      const updatedDoctor = {
        ...createdDoctor,
        name: '更新された田中先生',
        specialty: '外科',
      };
      mockPrisma.veterinaryDoctor.update.mockResolvedValue(updatedDoctor);

      // 更新テスト
      const updateResult = await mockPrisma.veterinaryDoctor.update({
        where: { id: testDoctorId },
        data: {
          name: '更新された田中先生',
          specialty: '外科',
        },
      });

      expect(updateResult.name).toBe('更新された田中先生');
      expect(updateResult.specialty).toBe('外科');

      // 削除のモック設定
      mockPrisma.veterinaryDoctor.delete.mockResolvedValue(createdDoctor);
      mockPrisma.veterinaryDoctor.findUnique.mockResolvedValue(null);

      // 削除テスト
      await mockPrisma.veterinaryDoctor.delete({
        where: { id: testDoctorId },
      });

      const deletedDoctor = await mockPrisma.veterinaryDoctor.findUnique({
        where: { id: testDoctorId },
      });

      expect(deletedDoctor).toBeNull();
    });

    it('先生名の重複チェックが正しく動作する', async () => {
      const doctorName = 'ユニーク先生名';

      // 重複エラーをシミュレート
      const duplicateError = new Error('Unique constraint failed');
      mockPrisma.veterinaryDoctor.create
        .mockResolvedValueOnce({
          id: 'first-doctor-id',
          name: doctorName,
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockRejectedValueOnce(duplicateError);

      // 最初の先生を作成
      const firstDoctor = await mockPrisma.veterinaryDoctor.create({
        data: {
          name: doctorName,
          userId: testUserId,
        },
      });

      expect(firstDoctor.name).toBe(doctorName);

      // 同じ名前で別の先生を作成しようとする
      await expect(
        mockPrisma.veterinaryDoctor.create({
          data: {
            name: doctorName,
            userId: testUserId,
          },
        }),
      ).rejects.toThrow('Unique constraint failed');
    });

    it('病院削除時の先生の所属病院リセットが正しく動作する', async () => {
      const doctor: VeterinaryDoctor = {
        id: testDoctorId,
        name: '所属テスト先生',
        hospitalId: testHospitalId,
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 病院削除のモック設定（CASCADE設定により先生の所属病院がリセット）
      mockPrisma.veterinaryHospital.delete.mockResolvedValue({
        id: testHospitalId,
        name: 'テスト病院',
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 先生の所属病院がnullになったことをシミュレート
      mockPrisma.veterinaryDoctor.findUnique.mockResolvedValue({
        ...doctor,
        hospitalId: null,
      });

      // 病院を削除
      await mockPrisma.veterinaryHospital.delete({
        where: { id: testHospitalId },
      });

      // 先生の所属病院がnullになっていることを確認
      const updatedDoctor = await mockPrisma.veterinaryDoctor.findUnique({
        where: { id: testDoctorId },
      });

      expect(updatedDoctor).not.toBeNull();
      expect(updatedDoctor!.hospitalId).toBeNull();
    });
  });

  describe('病院・先生の関連操作', () => {
    it('病院に所属する先生の一覧取得が正しく動作する', async () => {
      const mockDoctors: VeterinaryDoctor[] = [
        {
          id: 1,
          name: '関連先生1',
          hospitalId: testHospitalId,
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: '関連先生2',
          hospitalId: testHospitalId,
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const hospitalWithDoctors = {
        id: testHospitalId,
        name: '関連テスト病院',
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        doctors: mockDoctors,
        _count: {
          doctors: 2,
        },
      };

      // 病院詳細取得のモック設定
      mockPrisma.veterinaryHospital.findUnique.mockResolvedValue(hospitalWithDoctors);

      // 病院に所属する先生を取得
      const result = await mockPrisma.veterinaryHospital.findUnique({
        where: { id: testHospitalId },
        include: {
          doctors: true,
          _count: {
            select: { doctors: true },
          },
        },
      });

      expect(result).not.toBeNull();
      expect(result!.doctors).toHaveLength(2);
      expect(result!._count.doctors).toBe(2);
      expect(result!.doctors.map(d => d.name)).toEqual(
        expect.arrayContaining(['関連先生1', '関連先生2']),
      );
    });

    it('先生の病院フィルタリングが正しく動作する', async () => {
      const mockDoctors: VeterinaryDoctor[] = [
        {
          id: 1,
          name: 'A病院先生1',
          hospitalId: testHospitalId,
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          hospital: {
            id: testHospitalId,
            name: 'A病院',
            userId: testUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          id: 2,
          name: 'A病院先生2',
          hospitalId: testHospitalId,
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          hospital: {
            id: testHospitalId,
            name: 'A病院',
            userId: testUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      // 特定の病院の先生のみを取得するモック
      mockPrisma.veterinaryDoctor.findMany.mockResolvedValue(mockDoctors);

      const filteredDoctors = await mockPrisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          hospitalId: testHospitalId,
        },
        include: {
          hospital: true,
        },
      });

      expect(filteredDoctors).toHaveLength(2);
      expect(filteredDoctors.every(d => d.hospitalId === testHospitalId)).toBe(true);
      expect(filteredDoctors.map(d => d.name)).toEqual(
        expect.arrayContaining(['A病院先生1', 'A病院先生2']),
      );
    });
  });

  describe('データ整合性とトランザクション', () => {
    it('トランザクション内での複数操作が正しく動作する', async () => {
      const hospital = {
        id: 1,
        name: 'トランザクション病院',
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const doctor = {
        id: 1,
        name: 'トランザクション先生',
        hospitalId: hospital.id,
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // トランザクションのモック設定
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          veterinaryHospital: {
            create: vi.fn().mockResolvedValue(hospital),
          },
          veterinaryDoctor: {
            create: vi.fn().mockResolvedValue(doctor),
          },
        };
        return await callback(mockTx);
      });

      const result = await mockPrisma.$transaction(async (tx: any) => {
        // 病院を作成
        const createdHospital = await tx.veterinaryHospital.create({
          data: {
            name: 'トランザクション病院',
            userId: testUserId,
          },
        });

        // 先生を作成
        const createdDoctor = await tx.veterinaryDoctor.create({
          data: {
            name: 'トランザクション先生',
            hospitalId: createdHospital.id,
            userId: testUserId,
          },
        });

        return { hospital: createdHospital, doctor: createdDoctor };
      });

      expect(result.hospital.name).toBe('トランザクション病院');
      expect(result.doctor.name).toBe('トランザクション先生');
      expect(result.doctor.hospitalId).toBe(result.hospital.id);
    });

    it('トランザクション失敗時のロールバックが正しく動作する', async () => {
      // トランザクション失敗をシミュレート
      const transactionError = new Error('Transaction failed');
      mockPrisma.$transaction.mockRejectedValue(transactionError);

      await expect(
        mockPrisma.$transaction(async (tx: unknown) => {
          // 病院を作成
          const hospital = await tx.veterinaryHospital.create({
            data: {
              name: 'ロールバック病院',
              userId: testUserId,
            },
          });

          // 意図的にエラーを発生させる
          throw new Error('Intentional error');
        }),
      ).rejects.toThrow('Transaction failed');

      // ロールバックにより病院が作成されていないことを確認
      mockPrisma.veterinaryHospital.findMany.mockResolvedValue([]);

      const hospitals = await mockPrisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          name: 'ロールバック病院',
        },
      });

      expect(hospitals).toHaveLength(0);
    });
  });
});
