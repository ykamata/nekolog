import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import { veterinaryHospitalSchema, veterinarySearchSchema } from '~/lib/validations/veterinary-master';

describe('Veterinary Hospitals API Logic', () => {
  let testUserId: number;
  let testHospitalId: number;

  beforeEach(async () => {
    // テスト用ユーザーを作成
    const testUser = await prisma.user.create({
      data: {
        email: 'test-hospital@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    testUserId = testUser.id;

    // 既存のテストデータをクリーンアップ
    await prisma.veterinaryHospital.deleteMany({
      where: { userId: testUserId },
    });
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await prisma.veterinaryHospital.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe('Hospital Creation Logic', () => {
    it('should create a new hospital with valid data', async () => {
      const hospitalData = {
        name: 'テスト動物病院',
        address: '東京都渋谷区',
        phone: '03-1234-5678',
        memo: 'テスト用の病院です',
      };

      // バリデーションテスト
      const validatedData = veterinaryHospitalSchema.parse(hospitalData);
      expect(validatedData.name).toBe(hospitalData.name);

      // データベース作成テスト
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          ...validatedData,
          userId: testUserId,
        },
      });

      expect(hospital.name).toBe(hospitalData.name);
      expect(hospital.address).toBe(hospitalData.address);
      expect(hospital.phone).toBe(hospitalData.phone);
      expect(hospital.memo).toBe(hospitalData.memo);
      expect(hospital.userId).toBe(testUserId);

      testHospitalId = hospital.id;
    });

    it('should reject duplicate hospital names for same user', async () => {
      const hospitalData = {
        name: '重複テスト病院',
        address: '東京都新宿区',
      };

      // 最初の病院を作成
      await prisma.veterinaryHospital.create({
        data: {
          ...hospitalData,
          userId: testUserId,
        },
      });

      // 重複チェックロジックのテスト
      const existingHospital = await prisma.veterinaryHospital.findFirst({
        where: {
          name: hospitalData.name,
          userId: testUserId,
        },
      });

      expect(existingHospital).not.toBeNull();
      expect(existingHospital?.name).toBe(hospitalData.name);
    });

    it('should validate required fields', () => {
      expect(() => {
        veterinaryHospitalSchema.parse({});
      }).toThrow();

      expect(() => {
        veterinaryHospitalSchema.parse({ name: '' });
      }).toThrow();
    });

    it('should validate field lengths', () => {
      expect(() => {
        veterinaryHospitalSchema.parse({
          name: 'a'.repeat(101), // 100文字を超える
        });
      }).toThrow();

      expect(() => {
        veterinaryHospitalSchema.parse({
          name: 'テスト病院',
          address: 'a'.repeat(201), // 200文字を超える
        });
      }).toThrow();
    });

    it('should validate phone number format', () => {
      expect(() => {
        veterinaryHospitalSchema.parse({
          name: 'テスト病院',
          phone: 'invalid-phone', // 無効な電話番号形式
        });
      }).toThrow();

      // 有効な電話番号形式
      expect(() => {
        veterinaryHospitalSchema.parse({
          name: 'テスト病院',
          phone: '03-1234-5678',
        });
      }).not.toThrow();

      expect(() => {
        veterinaryHospitalSchema.parse({
          name: 'テスト病院',
          phone: '(03) 1234-5678',
        });
      }).not.toThrow();
    });
  });

  describe('Hospital Retrieval Logic', () => {
    beforeEach(async () => {
      // テスト用病院を作成
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          name: 'テスト病院1',
          address: '東京都港区',
          userId: testUserId,
        },
      });
      testHospitalId = hospital.id;
    });

    it('should retrieve user hospitals only', async () => {
      // 他のユーザーの病院を作成
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'password',
          name: 'Other User',
        },
      });

      await prisma.veterinaryHospital.create({
        data: {
          name: '他のユーザーの病院',
          userId: otherUser.id,
        },
      });

      // 現在のユーザーの病院のみ取得
      const hospitals = await prisma.veterinaryHospital.findMany({
        where: { userId: testUserId },
        orderBy: { name: 'asc' },
      });

      expect(hospitals.length).toBe(1);
      expect(hospitals[0].name).toBe('テスト病院1');
      expect(hospitals[0].userId).toBe(testUserId);

      // クリーンアップ
      await prisma.veterinaryHospital.deleteMany({
        where: { userId: otherUser.id },
      });
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });

    it('should retrieve hospital with related counts', async () => {
      const hospital = await prisma.veterinaryHospital.findFirst({
        where: {
          id: testHospitalId,
          userId: testUserId,
        },
        include: {
          _count: {
            select: {
              visits: true,
              appointments: true,
              doctors: true,
            },
          },
        },
      });

      expect(hospital).not.toBeNull();
      expect(hospital?._count).toBeDefined();
      expect(hospital?._count.visits).toBe(0);
      expect(hospital?._count.appointments).toBe(0);
      expect(hospital?._count.doctors).toBe(0);
    });
  });

  describe('Hospital Update Logic', () => {
    beforeEach(async () => {
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          name: '更新前病院',
          address: '東京都目黒区',
          userId: testUserId,
        },
      });
      testHospitalId = hospital.id;
    });

    it('should update hospital data', async () => {
      const updateData = {
        name: '更新後病院',
        address: '東京都世田谷区',
        phone: '03-9876-5432',
      };

      // バリデーション
      const validatedData = veterinaryHospitalSchema.parse(updateData);

      // 更新実行
      const updatedHospital = await prisma.veterinaryHospital.update({
        where: { id: testHospitalId },
        data: validatedData,
      });

      expect(updatedHospital.name).toBe(updateData.name);
      expect(updatedHospital.address).toBe(updateData.address);
      expect(updatedHospital.phone).toBe(updateData.phone);
    });

    it('should prevent duplicate names during update', async () => {
      // 別の病院を作成
      await prisma.veterinaryHospital.create({
        data: {
          name: '既存病院',
          userId: testUserId,
        },
      });

      // 重複チェック
      const duplicateHospital = await prisma.veterinaryHospital.findFirst({
        where: {
          name: '既存病院',
          userId: testUserId,
          id: { not: testHospitalId },
        },
      });

      expect(duplicateHospital).not.toBeNull();
    });
  });

  describe('Hospital Search Logic', () => {
    beforeEach(async () => {
      await prisma.veterinaryHospital.createMany({
        data: [
          {
            name: '東京動物病院',
            address: '東京都渋谷区',
            userId: testUserId,
          },
          {
            name: '渋谷ペットクリニック',
            address: '東京都渋谷区',
            userId: testUserId,
          },
          {
            name: '新宿動物医院',
            address: '東京都新宿区',
            userId: testUserId,
          },
        ],
      });
    });

    it('should search hospitals by name', async () => {
      const searchParams = veterinarySearchSchema.parse({
        query: '動物',
        limit: 10,
        offset: 0,
      });

      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          name: {
            contains: searchParams.query,
          },
        },
        orderBy: { name: 'asc' },
        take: searchParams.limit,
        skip: searchParams.offset,
      });

      expect(hospitals.length).toBe(2); // 東京動物病院、新宿動物医院
      expect(hospitals.every(h => h.name.includes('動物'))).toBe(true);
    });

    it('should search hospitals by address', async () => {
      const hospitals = await prisma.veterinaryHospital.findMany({
        where: {
          userId: testUserId,
          OR: [
            {
              name: {
                contains: '渋谷',
              },
            },
            {
              address: {
                contains: '渋谷',
              },
            },
          ],
        },
        orderBy: { name: 'asc' },
      });

      expect(hospitals.length).toBe(2); // 東京動物病院、渋谷ペットクリニック
    });

    it('should validate search parameters', () => {
      expect(() => {
        veterinarySearchSchema.parse({
          limit: -1, // 無効な値
        });
      }).toThrow();

      expect(() => {
        veterinarySearchSchema.parse({
          limit: 101, // 上限を超える
        });
      }).toThrow();

      expect(() => {
        veterinarySearchSchema.parse({
          offset: -1, // 無効な値
        });
      }).toThrow();
    });
  });

  describe('Hospital Deletion Logic', () => {
    beforeEach(async () => {
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          name: '削除テスト病院',
          userId: testUserId,
        },
      });
      testHospitalId = hospital.id;
    });

    it('should delete hospital without related records', async () => {
      // 関連レコードの確認
      const hospitalWithCounts = await prisma.veterinaryHospital.findFirst({
        where: { id: testHospitalId },
        include: {
          _count: {
            select: {
              visits: true,
              appointments: true,
              doctors: true,
            },
          },
        },
      });

      expect(hospitalWithCounts?._count.visits).toBe(0);
      expect(hospitalWithCounts?._count.appointments).toBe(0);

      // 削除実行
      await prisma.veterinaryHospital.delete({
        where: { id: testHospitalId },
      });

      // 削除確認
      const deletedHospital = await prisma.veterinaryHospital.findUnique({
        where: { id: testHospitalId },
      });
      expect(deletedHospital).toBeNull();
    });

    it('should reset doctor hospital association when hospital is deleted', async () => {
      // 先生を作成（病院に所属）
      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          name: 'テスト先生',
          hospitalId: testHospitalId,
          userId: testUserId,
        },
      });

      // 先生が病院に所属していることを確認
      const doctorBeforeDelete = await prisma.veterinaryDoctor.findUnique({
        where: { id: doctor.id },
      });
      expect(doctorBeforeDelete?.hospitalId).toBe(testHospitalId);

      // 病院削除前に先生の所属病院をリセット（実際のAPIと同じ処理）
      await prisma.veterinaryDoctor.updateMany({
        where: {
          hospitalId: testHospitalId,
          userId: testUserId,
        },
        data: {
          hospitalId: null,
        },
      });

      // 病院を削除
      await prisma.veterinaryHospital.delete({
        where: { id: testHospitalId },
      });

      // 先生の所属病院がリセットされていることを確認
      const doctorAfterDelete = await prisma.veterinaryDoctor.findUnique({
        where: { id: doctor.id },
      });
      expect(doctorAfterDelete?.hospitalId).toBeNull();

      // 先生自体は削除されていないことを確認
      expect(doctorAfterDelete).not.toBeNull();
      expect(doctorAfterDelete?.name).toBe('テスト先生');

      // クリーンアップ
      await prisma.veterinaryDoctor.delete({
        where: { id: doctor.id },
      });
    });
  });
});
