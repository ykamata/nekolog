import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import { veterinaryDoctorSchema } from '~/lib/validations/veterinary-master';

describe('Veterinary Doctors API Logic', () => {
  let testUserId: number;
  let testHospitalId: number;

  beforeEach(async () => {
    // テスト用ユーザーを作成
    const testUser = await prisma.user.create({
      data: {
        email: 'test-doctor@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
    testUserId = testUser.id;

    // テスト病院を作成
    const testHospital = await prisma.veterinaryHospital.create({
      data: {
        name: 'テスト動物病院',
        userId: testUserId,
      },
    });
    testHospitalId = testHospital.id;

    // 既存のテストデータをクリーンアップ
    await prisma.veterinaryDoctor.deleteMany({
      where: { userId: testUserId },
    });
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
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

  describe('Doctor Creation Logic', () => {
    it('should create a new doctor with valid data', async () => {
      const doctorData = {
        name: 'テスト先生',
        hospitalId: testHospitalId,
        specialty: '内科',
        memo: 'テスト用の先生です',
      };

      // バリデーションテスト
      const validatedData = veterinaryDoctorSchema.parse(doctorData);
      expect(validatedData.name).toBe(doctorData.name);

      // データベース作成テスト
      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          ...doctorData,
          userId: testUserId,
        },
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(doctor.name).toBe(doctorData.name);
      expect(doctor.hospitalId).toBe(doctorData.hospitalId);
      expect(doctor.specialty).toBe(doctorData.specialty);
      expect(doctor.hospital?.name).toBe('テスト動物病院');
    });

    it('should create a doctor without hospital', async () => {
      const doctorData = {
        name: '独立した先生',
        specialty: '皮膚科',
      };

      const validatedData = veterinaryDoctorSchema.parse(doctorData);
      expect(validatedData.name).toBe(doctorData.name);

      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          ...doctorData,
          userId: testUserId,
        },
      });

      expect(doctor.name).toBe(doctorData.name);
      expect(doctor.hospitalId).toBeNull();
      expect(doctor.specialty).toBe(doctorData.specialty);
    });

    it('should prevent duplicate doctor names for same user', async () => {
      const doctorData = {
        name: '重複テスト先生',
        userId: testUserId,
      };

      // 最初の先生を作成
      await prisma.veterinaryDoctor.create({
        data: doctorData,
      });

      // 同じ名前で作成を試行（エラーになるはず）
      await expect(
        prisma.veterinaryDoctor.create({
          data: doctorData,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Doctor Query Logic', () => {
    beforeEach(async () => {
      // テスト用の先生を複数作成
      await prisma.veterinaryDoctor.createMany({
        data: [
          {
            name: '田中先生',
            specialty: '内科',
            hospitalId: testHospitalId,
            userId: testUserId,
          },
          {
            name: '佐藤先生',
            specialty: '外科',
            hospitalId: testHospitalId,
            userId: testUserId,
          },
          {
            name: '鈴木先生',
            specialty: '皮膚科',
            userId: testUserId,
          },
        ],
      });
    });

    it('should fetch doctors by user', async () => {
      const doctors = await prisma.veterinaryDoctor.findMany({
        where: { userId: testUserId },
        orderBy: { name: 'asc' },
      });

      expect(doctors).toHaveLength(3);
      expect(doctors[0].name).toBe('佐藤先生');
      expect(doctors[1].name).toBe('田中先生');
      expect(doctors[2].name).toBe('鈴木先生');
    });

    it('should filter doctors by hospital', async () => {
      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          hospitalId: testHospitalId,
        },
      });

      expect(doctors).toHaveLength(2);
      expect(doctors.every(doctor => doctor.hospitalId === testHospitalId)).toBe(true);
    });

    it('should search doctors by name', async () => {
      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          name: {
            contains: '田中',
          },
        },
      });

      expect(doctors).toHaveLength(1);
      expect(doctors[0].name).toBe('田中先生');
    });

    it('should search doctors by specialty', async () => {
      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          userId: testUserId,
          specialty: {
            contains: '外科',
          },
        },
      });

      expect(doctors).toHaveLength(1);
      expect(doctors[0].name).toBe('佐藤先生');
    });
  });

  describe('Doctor Update Logic', () => {
    let doctorId: string;

    beforeEach(async () => {
      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          name: '更新テスト先生',
          specialty: '内科',
          userId: testUserId,
        },
      });
      doctorId = doctor.id;
    });

    it('should update doctor information', async () => {
      const updateData = {
        name: '更新された先生',
        specialty: '眼科',
        hospitalId: testHospitalId,
        memo: '更新されたメモ',
      };

      const updatedDoctor = await prisma.veterinaryDoctor.update({
        where: { id: doctorId },
        data: updateData,
      });

      expect(updatedDoctor.name).toBe(updateData.name);
      expect(updatedDoctor.specialty).toBe(updateData.specialty);
      expect(updatedDoctor.hospitalId).toBe(updateData.hospitalId);
      expect(updatedDoctor.memo).toBe(updateData.memo);
    });
  });

  describe('Doctor Deletion Logic', () => {
    let doctorId: string;

    beforeEach(async () => {
      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          name: '削除テスト先生',
          userId: testUserId,
        },
      });
      doctorId = doctor.id;
    });

    it('should delete doctor successfully', async () => {
      await prisma.veterinaryDoctor.delete({
        where: { id: doctorId },
      });

      const deletedDoctor = await prisma.veterinaryDoctor.findUnique({
        where: { id: doctorId },
      });

      expect(deletedDoctor).toBeNull();
    });

    it('should check for related records before deletion', async () => {
      // 通院記録の存在チェックをシミュレート
      const relatedVisits = await prisma.veterinaryVisit.count({
        where: { doctorId },
      });

      const relatedAppointments = await prisma.veterinaryAppointment.count({
        where: { doctorId },
      });

      expect(relatedVisits).toBe(0);
      expect(relatedAppointments).toBe(0);

      // 関連レコードがない場合は削除可能
      if (relatedVisits === 0 && relatedAppointments === 0) {
        await prisma.veterinaryDoctor.delete({
          where: { id: doctorId },
        });
      }

      const deletedDoctor = await prisma.veterinaryDoctor.findUnique({
        where: { id: doctorId },
      });

      expect(deletedDoctor).toBeNull();
    });
  });

  describe('Validation Logic', () => {
    it('should validate required fields', () => {
      expect(() => {
        veterinaryDoctorSchema.parse({});
      }).toThrow();

      expect(() => {
        veterinaryDoctorSchema.parse({ name: '' });
      }).toThrow();
    });

    it('should validate field lengths', () => {
      expect(() => {
        veterinaryDoctorSchema.parse({
          name: 'a'.repeat(51), // 50文字を超える
        });
      }).toThrow();

      expect(() => {
        veterinaryDoctorSchema.parse({
          name: 'テスト先生',
          specialty: 'a'.repeat(101), // 100文字を超える
        });
      }).toThrow();
    });

    it('should accept valid data', () => {
      const validData = {
        name: 'テスト先生',
        hospitalId: testHospitalId,
        specialty: '内科',
        memo: 'テストメモ',
      };

      const result = veterinaryDoctorSchema.parse(validData);
      expect(result.name).toBe(validData.name);
      expect(result.hospitalId).toBe(validData.hospitalId);
      expect(result.specialty).toBe(validData.specialty);
      expect(result.memo).toBe(validData.memo);
    });
  });
});
