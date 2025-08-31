import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';

describe('Veterinary Master Delete Validation', () => {
  let testUserId: string;

  beforeEach(async () => {
    // テスト用ユーザーを作成
    const testUser = await prisma.user.create({
      data: {
        email: 'test-delete-validation@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    testUserId = testUser.id;
  });

  afterEach(async () => {
    // テストデータをクリア
    await prisma.veterinaryAppointment.deleteMany();
    await prisma.veterinaryVisit.deleteMany();
    await prisma.veterinaryDoctor.deleteMany();
    await prisma.veterinaryHospital.deleteMany();
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe('病院削除時の関連データチェック', () => {
    it('予約がある病院の関連データカウントが正しい', async () => {
      // テスト用の猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
        },
      });

      // テスト用の病院を作成
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          name: 'テスト病院',
          userId: testUserId,
        },
      });

      // テスト用の予約を作成
      await prisma.veterinaryAppointment.create({
        data: {
          catId: cat.id,
          hospitalId: hospital.id,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // 関連データの存在をチェック
      const appointmentCount = await prisma.veterinaryAppointment.count({
        where: { hospitalId: hospital.id },
      });

      expect(appointmentCount).toBe(1);
    });

    it('通院記録がある病院の関連データカウントが正しい', async () => {
      // テスト用の猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫2',
        },
      });

      // テスト用の病院を作成
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          name: 'テスト病院2',
          userId: testUserId,
        },
      });

      // テスト用の通院記録を作成
      await prisma.veterinaryVisit.create({
        data: {
          catId: cat.id,
          hospitalId: hospital.id,
          visitDate: new Date(),
          cost: 5000,
        },
      });

      // 関連データの存在をチェック
      const visitCount = await prisma.veterinaryVisit.count({
        where: { hospitalId: hospital.id },
      });

      expect(visitCount).toBe(1);
    });

    it('所属先生がいる病院の関連データカウントが正しい', async () => {
      // テスト用の病院を作成
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          name: 'テスト病院3',
          userId: testUserId,
        },
      });

      // テスト用の先生を作成
      await prisma.veterinaryDoctor.create({
        data: {
          name: 'テスト先生',
          hospitalId: hospital.id,
          userId: testUserId,
        },
      });

      // 関連データの存在をチェック
      const doctorCount = await prisma.veterinaryDoctor.count({
        where: {
          hospitalId: hospital.id,
          userId: testUserId,
        },
      });

      expect(doctorCount).toBe(1);
    });
  });

  describe('先生削除時の関連データチェック', () => {
    it('予約がある先生の関連データカウントが正しい', async () => {
      // テスト用の猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫4',
        },
      });

      // テスト用の病院を作成
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          name: 'テスト病院4',
          userId: testUserId,
        },
      });

      // テスト用の先生を作成
      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          name: 'テスト先生2',
          hospitalId: hospital.id,
          userId: testUserId,
        },
      });

      // テスト用の予約を作成
      await prisma.veterinaryAppointment.create({
        data: {
          catId: cat.id,
          hospitalId: hospital.id,
          doctorId: doctor.id,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // 関連データの存在をチェック
      const appointmentCount = await prisma.veterinaryAppointment.count({
        where: { doctorId: doctor.id },
      });

      expect(appointmentCount).toBe(1);
    });

    it('通院記録がある先生の関連データカウントが正しい', async () => {
      // テスト用の猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫5',
        },
      });

      // テスト用の病院を作成
      const hospital = await prisma.veterinaryHospital.create({
        data: {
          name: 'テスト病院5',
          userId: testUserId,
        },
      });

      // テスト用の先生を作成
      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          name: 'テスト先生3',
          hospitalId: hospital.id,
          userId: testUserId,
        },
      });

      // テスト用の通院記録を作成
      await prisma.veterinaryVisit.create({
        data: {
          catId: cat.id,
          hospitalId: hospital.id,
          doctorId: doctor.id,
          visitDate: new Date(),
          cost: 5000,
        },
      });

      // 関連データの存在をチェック
      const visitCount = await prisma.veterinaryVisit.count({
        where: { doctorId: doctor.id },
      });

      expect(visitCount).toBe(1);
    });
  });
});
