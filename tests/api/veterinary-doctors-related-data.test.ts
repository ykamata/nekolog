import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';

describe('Veterinary Doctors Related Data API Logic', () => {
  let testUserId: number;
  let testHospitalId: number;
  let testDoctorId: number;

  beforeEach(async () => {
    // テスト用ユーザーを作成（ユニークなメールアドレス）
    const testUser = await prisma.user.create({
      data: {
        email: `test-doctor-related-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    testUserId = testUser.id;

    // テスト用病院を作成
    const testHospital = await prisma.veterinaryHospital.create({
      data: {
        name: 'テスト病院',
        userId: testUserId,
      },
    });
    testHospitalId = testHospital.id;

    // テスト用先生を作成
    const testDoctor = await prisma.veterinaryDoctor.create({
      data: {
        name: 'テスト先生',
        hospitalId: testHospitalId,
        userId: testUserId,
      },
    });
    testDoctorId = testDoctor.id;

    // 既存のテストデータをクリーンアップ
    await prisma.cat.deleteMany({
      where: { userId: testUserId },
    });
  });

  afterEach(async () => {
    // テストデータをクリーンアップ（関連順序に注意）
    await prisma.cat.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.veterinaryDoctor.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.veterinaryHospital.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe('Doctor Related Data Check Logic', () => {
    it('関連データがない場合、すべてfalseを返す', async () => {
      // 関連データの存在をチェック
      const [visitCount, appointmentCount] = await Promise.all([
        prisma.veterinaryVisit.count({
          where: {
            doctorId: testDoctorId,
          },
        }),
        prisma.veterinaryAppointment.count({
          where: {
            doctorId: testDoctorId,
          },
        }),
      ]);

      const result = {
        hasVisits: visitCount > 0,
        hasAppointments: appointmentCount > 0,
        counts: {
          visits: visitCount,
          appointments: appointmentCount,
        },
      };

      expect(result.hasVisits).toBe(false);
      expect(result.hasAppointments).toBe(false);
      expect(result.counts.visits).toBe(0);
      expect(result.counts.appointments).toBe(0);
    });

    it('通院記録が存在する場合、hasVisitsがtrueになる', async () => {
      // 猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
          userId: testUserId,
        },
      });

      // 通院記録を作成
      await prisma.veterinaryVisit.create({
        data: {
          catId: cat.id,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          visitDate: new Date(),
          cost: 5000,
        },
      });

      // 関連データの存在をチェック
      const visitCount = await prisma.veterinaryVisit.count({
        where: {
          doctorId: testDoctorId,
        },
      });

      expect(visitCount).toBe(1);

      // クリーンアップ
      await prisma.veterinaryVisit.deleteMany({
        where: { catId: cat.id },
      });
      await prisma.cat.delete({
        where: { id: cat.id },
      });
    });

    it('予約が存在する場合、hasAppointmentsがtrueになる', async () => {
      // 猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
          userId: testUserId,
        },
      });

      // 予約を作成
      await prisma.veterinaryAppointment.create({
        data: {
          catId: cat.id,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
          notes: 'テスト予約',
        },
      });

      // 関連データの存在をチェック
      const appointmentCount = await prisma.veterinaryAppointment.count({
        where: {
          doctorId: testDoctorId,
        },
      });

      expect(appointmentCount).toBe(1);

      // クリーンアップ
      await prisma.veterinaryAppointment.deleteMany({
        where: { catId: cat.id },
      });
      await prisma.cat.delete({
        where: { id: cat.id },
      });
    });

    it('複数の関連データが存在する場合、正確なカウントを返す', async () => {
      // 猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
          userId: testUserId,
        },
      });

      // 通院記録を3件作成
      await prisma.veterinaryVisit.createMany({
        data: [
          {
            catId: cat.id,
            hospitalId: testHospitalId,
            doctorId: testDoctorId,
            visitDate: new Date('2024-01-01'),
            cost: 3000,
          },
          {
            catId: cat.id,
            hospitalId: testHospitalId,
            doctorId: testDoctorId,
            visitDate: new Date('2024-01-02'),
            cost: 4000,
          },
          {
            catId: cat.id,
            hospitalId: testHospitalId,
            doctorId: testDoctorId,
            visitDate: new Date('2024-01-03'),
            cost: 5000,
          },
        ],
      });

      // 予約を2件作成
      await prisma.veterinaryAppointment.createMany({
        data: [
          {
            catId: cat.id,
            hospitalId: testHospitalId,
            doctorId: testDoctorId,
            appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            notes: 'テスト予約1',
          },
          {
            catId: cat.id,
            hospitalId: testHospitalId,
            doctorId: testDoctorId,
            appointmentDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
            notes: 'テスト予約2',
          },
        ],
      });

      // 関連データの存在をチェック
      const [visitCount, appointmentCount] = await Promise.all([
        prisma.veterinaryVisit.count({
          where: {
            doctorId: testDoctorId,
          },
        }),
        prisma.veterinaryAppointment.count({
          where: {
            doctorId: testDoctorId,
          },
        }),
      ]);

      expect(visitCount).toBe(3);
      expect(appointmentCount).toBe(2);

      // クリーンアップ
      await prisma.veterinaryAppointment.deleteMany({
        where: { catId: cat.id },
      });
      await prisma.veterinaryVisit.deleteMany({
        where: { catId: cat.id },
      });
      await prisma.cat.delete({
        where: { id: cat.id },
      });
    });

    it('他の先生の関連データは含まれない', async () => {
      // 別の先生を作成
      const otherDoctor = await prisma.veterinaryDoctor.create({
        data: {
          name: '別の先生',
          hospitalId: testHospitalId,
          userId: testUserId,
        },
      });

      // 猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
          userId: testUserId,
        },
      });

      // 別の先生の通院記録を作成
      await prisma.veterinaryVisit.create({
        data: {
          catId: cat.id,
          hospitalId: testHospitalId,
          doctorId: otherDoctor.id,
          visitDate: new Date(),
          cost: 6000,
        },
      });

      // テスト対象の先生の関連データをチェック（0件のはず）
      const visitCount = await prisma.veterinaryVisit.count({
        where: {
          doctorId: testDoctorId,
        },
      });

      expect(visitCount).toBe(0);

      // 別の先生の関連データをチェック（1件のはず）
      const otherVisitCount = await prisma.veterinaryVisit.count({
        where: {
          doctorId: otherDoctor.id,
        },
      });

      expect(otherVisitCount).toBe(1);

      // クリーンアップ
      await prisma.veterinaryVisit.deleteMany({
        where: { catId: cat.id },
      });
      await prisma.cat.delete({
        where: { id: cat.id },
      });
      await prisma.veterinaryDoctor.delete({
        where: { id: otherDoctor.id },
      });
    });
  });

  describe('Error Handling', () => {
    it('存在しない先生IDの場合、適切にハンドリングされる', async () => {
      const nonExistentId = 999999;

      // 先生の存在確認
      const doctor = await prisma.veterinaryDoctor.findFirst({
        where: {
          id: nonExistentId,
          userId: testUserId,
        },
      });

      expect(doctor).toBeNull();
    });

    it('他のユーザーの先生IDの場合、適切にハンドリングされる', async () => {
      // 他のユーザーを作成
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-doctor-${Date.now()}@example.com`,
          password: 'password',
          name: 'Other User',
        },
      });

      // 他のユーザーの先生を作成
      const otherDoctor = await prisma.veterinaryDoctor.create({
        data: {
          name: '他のユーザーの先生',
          userId: otherUser.id,
        },
      });

      // 現在のユーザーでは見つからない
      const doctor = await prisma.veterinaryDoctor.findFirst({
        where: {
          id: otherDoctor.id,
          userId: testUserId,
        },
      });

      expect(doctor).toBeNull();

      // クリーンアップ
      await prisma.veterinaryDoctor.delete({
        where: { id: otherDoctor.id },
      });
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });

    it('先生が削除された後、関連データが残っていても正しく処理される', async () => {
      // 猫を作成
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
          userId: testUserId,
        },
      });

      // 通院記録を作成
      await prisma.veterinaryVisit.create({
        data: {
          catId: cat.id,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          visitDate: new Date(),
          cost: 7000,
        },
      });

      // 先生を削除
      await prisma.veterinaryDoctor.delete({
        where: { id: testDoctorId },
      });

      // 削除された先生の関連データをチェック（0件になるはず）
      const visitCount = await prisma.veterinaryVisit.count({
        where: {
          doctorId: testDoctorId,
        },
      });

      // 通院記録は残っているが、先生が削除されているので関連性は失われる
      expect(visitCount).toBe(0);

      // クリーンアップ
      await prisma.veterinaryVisit.deleteMany({
        where: { catId: cat.id },
      });
      await prisma.cat.delete({
        where: { id: cat.id },
      });

      // 先生は既に削除済み
    });
  });
});
