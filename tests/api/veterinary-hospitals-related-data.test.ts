import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';

describe('Veterinary Hospitals Related Data API Logic', () => {
  let testUserId: number;
  let testHospitalId: number;
  let testDoctorId: number;

  beforeEach(async () => {
    // テスト用ユーザーを作成（ユニークなメールアドレス）
    const testUser = await prisma.user.create({
      data: {
        email: `test-hospital-related-${Date.now()}@example.com`,
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

    // 既存のテストデータをクリーンアップ
    await prisma.veterinaryDoctor.deleteMany({
      where: { userId: testUserId },
    });
    // VeterinaryVisitとVeterinaryAppointmentはcatIdを通じてユーザーと関連付けられているため、
    // 直接userIdでフィルタできない。代わりに、テスト用の猫を削除することでクリーンアップする
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

  describe('Hospital Related Data Check Logic', () => {
    it('関連データがない場合、すべてfalseを返す', async () => {
      // 関連データの存在をチェック
      const [doctorCount, visitCount, appointmentCount] = await Promise.all([
        prisma.veterinaryDoctor.count({
          where: {
            hospitalId: testHospitalId,
            userId: testUserId,
          },
        }),
        prisma.veterinaryVisit.count({
          where: {
            hospitalId: testHospitalId,
          },
        }),
        prisma.veterinaryAppointment.count({
          where: {
            hospitalId: testHospitalId,
          },
        }),
      ]);

      const result = {
        hasDoctors: doctorCount > 0,
        hasVisits: visitCount > 0,
        hasAppointments: appointmentCount > 0,
        counts: {
          doctors: doctorCount,
          visits: visitCount,
          appointments: appointmentCount,
        },
      };

      expect(result.hasDoctors).toBe(false);
      expect(result.hasVisits).toBe(false);
      expect(result.hasAppointments).toBe(false);
      expect(result.counts.doctors).toBe(0);
      expect(result.counts.visits).toBe(0);
      expect(result.counts.appointments).toBe(0);
    });

    it('先生が所属している場合、hasDoctorsがtrueになる', async () => {
      // 先生を作成
      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          name: 'テスト先生',
          hospitalId: testHospitalId,
          userId: testUserId,
        },
      });
      testDoctorId = doctor.id;

      // 関連データの存在をチェック
      const doctorCount = await prisma.veterinaryDoctor.count({
        where: {
          hospitalId: testHospitalId,
          userId: testUserId,
        },
      });

      expect(doctorCount).toBe(1);
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
          visitDate: new Date(),
          cost: 5000,
        },
      });

      // 関連データの存在をチェック
      const visitCount = await prisma.veterinaryVisit.count({
        where: {
          hospitalId: testHospitalId,
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
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
          notes: 'テスト予約',
        },
      });

      // 関連データの存在をチェック
      const appointmentCount = await prisma.veterinaryAppointment.count({
        where: {
          hospitalId: testHospitalId,
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

      // 先生を2人作成
      await prisma.veterinaryDoctor.createMany({
        data: [
          {
            name: 'テスト先生1',
            hospitalId: testHospitalId,
            userId: testUserId,
          },
          {
            name: 'テスト先生2',
            hospitalId: testHospitalId,
            userId: testUserId,
          },
        ],
      });

      // 通院記録を3件作成
      await prisma.veterinaryVisit.createMany({
        data: [
          {
            catId: cat.id,
            hospitalId: testHospitalId,
            visitDate: new Date('2024-01-01'),
            cost: 3000,
          },
          {
            catId: cat.id,
            hospitalId: testHospitalId,
            visitDate: new Date('2024-01-02'),
            cost: 4000,
          },
          {
            catId: cat.id,
            hospitalId: testHospitalId,
            visitDate: new Date('2024-01-03'),
            cost: 5000,
          },
        ],
      });

      // 予約を1件作成
      await prisma.veterinaryAppointment.create({
        data: {
          catId: cat.id,
          hospitalId: testHospitalId,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          notes: 'テスト予約',
        },
      });

      // 関連データの存在をチェック
      const [doctorCount, visitCount, appointmentCount] = await Promise.all([
        prisma.veterinaryDoctor.count({
          where: {
            hospitalId: testHospitalId,
            userId: testUserId,
          },
        }),
        prisma.veterinaryVisit.count({
          where: {
            hospitalId: testHospitalId,
          },
        }),
        prisma.veterinaryAppointment.count({
          where: {
            hospitalId: testHospitalId,
          },
        }),
      ]);

      expect(doctorCount).toBe(2);
      expect(visitCount).toBe(3);
      expect(appointmentCount).toBe(1);

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

    it('他のユーザーの先生は含まれない', async () => {
      // 他のユーザーを作成
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          password: 'password',
          name: 'Other User',
        },
      });

      // 他のユーザーの先生を作成（同じ病院ID）
      await prisma.veterinaryDoctor.create({
        data: {
          name: '他のユーザーの先生',
          hospitalId: testHospitalId,
          userId: otherUser.id,
        },
      });

      // 現在のユーザーの先生のみカウント
      const doctorCount = await prisma.veterinaryDoctor.count({
        where: {
          hospitalId: testHospitalId,
          userId: testUserId, // 重要：ユーザーIDでフィルタ
        },
      });

      expect(doctorCount).toBe(0);

      // クリーンアップ
      await prisma.veterinaryDoctor.deleteMany({
        where: { userId: otherUser.id },
      });
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });
  });

  describe('Error Handling', () => {
    it('存在しない病院IDの場合、適切にハンドリングされる', async () => {
      const nonExistentId = 999999;

      // 病院の存在確認
      const hospital = await prisma.veterinaryHospital.findFirst({
        where: {
          id: nonExistentId,
          userId: testUserId,
        },
      });

      expect(hospital).toBeNull();
    });

    it('他のユーザーの病院IDの場合、適切にハンドリングされる', async () => {
      // 他のユーザーを作成
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-hospital-${Date.now()}@example.com`,
          password: 'password',
          name: 'Other User',
        },
      });

      // 他のユーザーの病院を作成
      const otherHospital = await prisma.veterinaryHospital.create({
        data: {
          name: '他のユーザーの病院',
          userId: otherUser.id,
        },
      });

      // 現在のユーザーでは見つからない
      const hospital = await prisma.veterinaryHospital.findFirst({
        where: {
          id: otherHospital.id,
          userId: testUserId,
        },
      });

      expect(hospital).toBeNull();

      // クリーンアップ
      await prisma.veterinaryHospital.delete({
        where: { id: otherHospital.id },
      });
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });
  });
});
