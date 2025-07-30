import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import {
  VeterinaryHospitalInputSchema,
  VeterinaryDoctorInputSchema,
  VeterinaryTreatmentInputSchema,
  VeterinaryHospitalFilterSchema,
  VeterinaryDoctorFilterSchema,
  VeterinaryTreatmentFilterSchema,
} from '~/lib/validations/veterinary-visit';

describe('Veterinary Master Data API Logic', () => {
  // Test data
  const testHospitalData = {
    name: 'テスト動物病院',
    address: 'テスト市テスト区1-1-1',
    phone: '03-1234-5678',
  };

  const testDoctorData = {
    name: 'テスト先生',
    hospitalId: '',
    specialization: '内科',
  };

  const testTreatmentData = {
    name: 'テスト処方',
    category: '診察',
    description: 'テスト用の処方内容',
  };

  let testHospitalId: string;
  let testDoctorId: string;
  let testTreatmentId: string;

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    // Delete in correct order to avoid foreign key constraints
    await prisma.veterinaryVisitTreatment.deleteMany({
      where: {
        treatment: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.veterinaryVisit.deleteMany({
      where: {
        hospital: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.veterinaryAppointment.deleteMany({
      where: {
        hospital: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.veterinaryTreatment.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
    await prisma.veterinaryDoctor.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
    await prisma.veterinaryHospital.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
  }
  describe('Hospital Master Data Logic', () => {
    it('should validate hospital input schema with valid data', () => {
      const result = VeterinaryHospitalInputSchema.safeParse(testHospitalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(testHospitalData.name);
        expect(result.data.address).toBe(testHospitalData.address);
        expect(result.data.phone).toBe(testHospitalData.phone);
      }
    });

    it('should reject invalid hospital input data', () => {
      const invalidHospital = {
        name: '', // Empty name
        address: 'a'.repeat(201), // Too long address
        phone: 'invalid-phone-number-format', // Invalid phone format
      };

      const result = VeterinaryHospitalInputSchema.safeParse(invalidHospital);
      expect(result.success).toBe(false);
    });

    it('should create hospital in database', async () => {
      const validatedData = VeterinaryHospitalInputSchema.parse(testHospitalData);

      const hospital = await prisma.veterinaryHospital.create({
        data: validatedData,
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

      expect(hospital.name).toBe(testHospitalData.name);
      expect(hospital.address).toBe(testHospitalData.address);
      expect(hospital.phone).toBe(testHospitalData.phone);
      expect(hospital._count.visits).toBe(0);
      expect(hospital._count.appointments).toBe(0);
      expect(hospital._count.doctors).toBe(0);

      testHospitalId = hospital.id;
    });

    it('should handle duplicate hospital name validation', async () => {
      // Create first hospital
      const hospital1 = await prisma.veterinaryHospital.create({
        data: VeterinaryHospitalInputSchema.parse(testHospitalData),
      });

      // Check for existing hospital with same name
      const existingHospital = await prisma.veterinaryHospital.findFirst({
        where: { name: testHospitalData.name },
      });

      expect(existingHospital).not.toBeNull();
      expect(existingHospital?.name).toBe(testHospitalData.name);

      testHospitalId = hospital1.id;
    });

    it('should list hospitals with filtering', async () => {
      // Create test hospitals
      await prisma.veterinaryHospital.create({
        data: { name: 'テスト動物病院A' },
      });
      await prisma.veterinaryHospital.create({
        data: { name: 'テスト動物病院B' },
      });
      await prisma.veterinaryHospital.create({
        data: { name: '別の病院' },
      });

      const filterData = {
        name: 'テスト',
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryHospitalFilterSchema.parse(filterData);

      const [hospitals, total] = await Promise.all([
        prisma.veterinaryHospital.findMany({
          where: {
            name: {
              contains: validatedFilter.name,
              mode: 'insensitive',
            },
          },
          orderBy: { name: 'asc' },
          take: validatedFilter.limit,
          skip: validatedFilter.offset,
          include: {
            _count: {
              select: {
                visits: true,
                appointments: true,
                doctors: true,
              },
            },
          },
        }),
        prisma.veterinaryHospital.count({
          where: {
            name: {
              contains: validatedFilter.name,
              mode: 'insensitive',
            },
          },
        }),
      ]);

      expect(hospitals).toHaveLength(2);
      expect(total).toBe(2);
      expect(hospitals.every(h => h.name.includes('テスト'))).toBe(true);
    });

    it('should support pagination for hospitals', async () => {
      // Create multiple hospitals
      for (let i = 1; i <= 5; i++) {
        await prisma.veterinaryHospital.create({
          data: { name: `テスト動物病院${i}` },
        });
      }

      const filterData = {
        limit: 2,
        offset: 0,
      };

      const validatedFilter = VeterinaryHospitalFilterSchema.parse(filterData);

      const [hospitals, total] = await Promise.all([
        prisma.veterinaryHospital.findMany({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
          orderBy: { name: 'asc' },
          take: validatedFilter.limit,
          skip: validatedFilter.offset,
        }),
        prisma.veterinaryHospital.count({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
        }),
      ]);

      expect(hospitals).toHaveLength(2);
      expect(total).toBe(5);
    });
  });
  describe('Doctor Master Data Logic', () => {
    beforeEach(async () => {
      // Create test hospital for doctor
      const hospital = await prisma.veterinaryHospital.create({
        data: { name: testHospitalData.name },
      });
      testHospitalId = hospital.id;
      testDoctorData.hospitalId = testHospitalId;
    });

    it('should validate doctor input schema with valid data', () => {
      const result = VeterinaryDoctorInputSchema.safeParse(testDoctorData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(testDoctorData.name);
        expect(result.data.hospitalId).toBe(testHospitalId);
        expect(result.data.specialization).toBe(testDoctorData.specialization);
      }
    });

    it('should reject invalid doctor input data', () => {
      const invalidDoctor = {
        name: '', // Empty name
        specialization: 'a'.repeat(101), // Too long specialization
      };

      const result = VeterinaryDoctorInputSchema.safeParse(invalidDoctor);
      expect(result.success).toBe(false);
    });

    it('should create doctor in database', async () => {
      const validatedData = VeterinaryDoctorInputSchema.parse(testDoctorData);

      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          name: validatedData.name,
          hospitalId: validatedData.hospitalId,
          specialization: validatedData.specialization,
        },
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
          _count: {
            select: {
              visits: true,
              appointments: true,
            },
          },
        },
      });

      expect(doctor.name).toBe(testDoctorData.name);
      expect(doctor.hospitalId).toBe(testHospitalId);
      expect(doctor.specialization).toBe(testDoctorData.specialization);
      expect(doctor.hospital?.name).toBe(testHospitalData.name);
      expect(doctor._count.visits).toBe(0);
      expect(doctor._count.appointments).toBe(0);

      testDoctorId = doctor.id;
    });

    it('should create doctor without hospital', async () => {
      const doctorWithoutHospital = {
        name: 'フリーランス先生',
        specialization: '外科',
      };

      const validatedData = VeterinaryDoctorInputSchema.parse(doctorWithoutHospital);

      const doctor = await prisma.veterinaryDoctor.create({
        data: {
          name: validatedData.name,
          hospitalId: null,
          specialization: validatedData.specialization,
        },
      });

      expect(doctor.name).toBe(doctorWithoutHospital.name);
      expect(doctor.hospitalId).toBeNull();
      expect(doctor.specialization).toBe(doctorWithoutHospital.specialization);
    });

    it('should handle duplicate doctor name in same hospital validation', async () => {
      // Create first doctor
      const doctor1 = await prisma.veterinaryDoctor.create({
        data: VeterinaryDoctorInputSchema.parse(testDoctorData),
      });

      // Check for existing doctor with same name and hospital
      const existingDoctor = await prisma.veterinaryDoctor.findFirst({
        where: {
          name: testDoctorData.name,
          hospitalId: testHospitalId,
        },
      });

      expect(existingDoctor).not.toBeNull();
      expect(existingDoctor?.name).toBe(testDoctorData.name);
      expect(existingDoctor?.hospitalId).toBe(testHospitalId);

      testDoctorId = doctor1.id;
    });

    it('should list doctors with filtering by hospital', async () => {
      // Create another hospital
      const hospital2 = await prisma.veterinaryHospital.create({
        data: { name: 'テスト動物病院2' },
      });

      // Create doctors in different hospitals
      await prisma.veterinaryDoctor.create({
        data: { name: 'テスト先生A', hospitalId: testHospitalId },
      });
      await prisma.veterinaryDoctor.create({
        data: { name: 'テスト先生B', hospitalId: testHospitalId },
      });
      await prisma.veterinaryDoctor.create({
        data: { name: 'テスト先生C', hospitalId: hospital2.id },
      });

      const filterData = {
        hospitalId: testHospitalId,
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryDoctorFilterSchema.parse(filterData);

      const [doctors, total] = await Promise.all([
        prisma.veterinaryDoctor.findMany({
          where: { hospitalId: validatedFilter.hospitalId },
          orderBy: { name: 'asc' },
          take: validatedFilter.limit,
          skip: validatedFilter.offset,
          include: {
            hospital: true,
            _count: {
              select: {
                visits: true,
                appointments: true,
              },
            },
          },
        }),
        prisma.veterinaryDoctor.count({
          where: { hospitalId: validatedFilter.hospitalId },
        }),
      ]);

      expect(doctors).toHaveLength(2);
      expect(total).toBe(2);
      expect(doctors.every(d => d.hospitalId === testHospitalId)).toBe(true);
    });
    it('should filter doctors by name and specialization', async () => {
      // Create doctors with different specializations
      await prisma.veterinaryDoctor.create({
        data: { name: 'テスト内科先生', hospitalId: testHospitalId, specialization: '内科' },
      });
      await prisma.veterinaryDoctor.create({
        data: { name: 'テスト外科先生', hospitalId: testHospitalId, specialization: '外科' },
      });
      await prisma.veterinaryDoctor.create({
        data: { name: '別の先生', hospitalId: testHospitalId, specialization: '内科' },
      });

      const filterData = {
        name: 'テスト',
        specialization: '内科',
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryDoctorFilterSchema.parse(filterData);

      const doctors = await prisma.veterinaryDoctor.findMany({
        where: {
          name: {
            contains: validatedFilter.name,
            mode: 'insensitive',
          },
          specialization: {
            contains: validatedFilter.specialization,
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
      });

      expect(doctors).toHaveLength(1);
      expect(doctors[0].name).toBe('テスト内科先生');
      expect(doctors[0].specialization).toBe('内科');
    });
  });

  describe('Treatment Master Data Logic', () => {
    it('should validate treatment input schema with valid data', () => {
      const result = VeterinaryTreatmentInputSchema.safeParse(testTreatmentData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(testTreatmentData.name);
        expect(result.data.category).toBe(testTreatmentData.category);
        expect(result.data.description).toBe(testTreatmentData.description);
      }
    });

    it('should reject invalid treatment input data', () => {
      const invalidTreatment = {
        name: '', // Empty name
        category: 'a'.repeat(51), // Too long category
        description: 'a'.repeat(501), // Too long description
      };

      const result = VeterinaryTreatmentInputSchema.safeParse(invalidTreatment);
      expect(result.success).toBe(false);
    });

    it('should create treatment in database', async () => {
      const validatedData = VeterinaryTreatmentInputSchema.parse(testTreatmentData);

      const treatment = await prisma.veterinaryTreatment.create({
        data: validatedData,
        include: {
          _count: {
            select: {
              visitTreatments: true,
            },
          },
        },
      });

      expect(treatment.name).toBe(testTreatmentData.name);
      expect(treatment.category).toBe(testTreatmentData.category);
      expect(treatment.description).toBe(testTreatmentData.description);
      expect(treatment._count.visitTreatments).toBe(0);

      testTreatmentId = treatment.id;
    });

    it('should handle duplicate treatment name validation', async () => {
      // Create first treatment
      const treatment1 = await prisma.veterinaryTreatment.create({
        data: VeterinaryTreatmentInputSchema.parse(testTreatmentData),
      });

      // Check for existing treatment with same name
      const existingTreatment = await prisma.veterinaryTreatment.findFirst({
        where: { name: testTreatmentData.name },
      });

      expect(existingTreatment).not.toBeNull();
      expect(existingTreatment?.name).toBe(testTreatmentData.name);

      testTreatmentId = treatment1.id;
    });

    it('should list treatments with filtering by category', async () => {
      // Create treatments with different categories
      await prisma.veterinaryTreatment.create({
        data: { name: 'テスト診察A', category: '診察' },
      });
      await prisma.veterinaryTreatment.create({
        data: { name: 'テスト診察B', category: '診察' },
      });
      await prisma.veterinaryTreatment.create({
        data: { name: 'テスト手術', category: '手術' },
      });

      const filterData = {
        category: '診察',
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryTreatmentFilterSchema.parse(filterData);

      const [treatments, total] = await Promise.all([
        prisma.veterinaryTreatment.findMany({
          where: {
            category: {
              contains: validatedFilter.category,
              mode: 'insensitive',
            },
          },
          orderBy: { name: 'asc' },
          take: validatedFilter.limit,
          skip: validatedFilter.offset,
          include: {
            _count: {
              select: {
                visitTreatments: true,
              },
            },
          },
        }),
        prisma.veterinaryTreatment.count({
          where: {
            category: {
              contains: validatedFilter.category,
              mode: 'insensitive',
            },
          },
        }),
      ]);

      expect(treatments).toHaveLength(2);
      expect(total).toBe(2);
      expect(treatments.every(t => t.category === '診察')).toBe(true);
    });
    it('should filter treatments by name', async () => {
      // Create treatments with different names
      await prisma.veterinaryTreatment.create({
        data: { name: 'テスト健康診断', category: '診察' },
      });
      await prisma.veterinaryTreatment.create({
        data: { name: 'テストワクチン', category: '予防' },
      });
      await prisma.veterinaryTreatment.create({
        data: { name: '別の処方', category: '診察' },
      });

      const filterData = {
        name: 'テスト',
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryTreatmentFilterSchema.parse(filterData);

      const treatments = await prisma.veterinaryTreatment.findMany({
        where: {
          name: {
            contains: validatedFilter.name,
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
      });

      expect(treatments).toHaveLength(2);
      expect(treatments.every(t => t.name.includes('テスト'))).toBe(true);
    });

    it('should support pagination for treatments', async () => {
      // Create multiple treatments
      for (let i = 1; i <= 5; i++) {
        await prisma.veterinaryTreatment.create({
          data: { name: `テスト処方${i}`, category: '診察' },
        });
      }

      const filterData = {
        limit: 2,
        offset: 0,
      };

      const validatedFilter = VeterinaryTreatmentFilterSchema.parse(filterData);

      const [treatments, total] = await Promise.all([
        prisma.veterinaryTreatment.findMany({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
          orderBy: { name: 'asc' },
          take: validatedFilter.limit,
          skip: validatedFilter.offset,
        }),
        prisma.veterinaryTreatment.count({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
        }),
      ]);

      expect(treatments).toHaveLength(2);
      expect(total).toBe(5);
    });
  });

  describe('Master Data Validation Edge Cases', () => {
    it('should reject hospital with name too long', () => {
      const invalidHospital = {
        name: 'a'.repeat(101), // Exceeds 100 character limit
      };

      const result = VeterinaryHospitalInputSchema.safeParse(invalidHospital);
      expect(result.success).toBe(false);
    });

    it('should reject doctor with name too long', () => {
      const invalidDoctor = {
        name: 'a'.repeat(51), // Exceeds 50 character limit
      };

      const result = VeterinaryDoctorInputSchema.safeParse(invalidDoctor);
      expect(result.success).toBe(false);
    });

    it('should reject treatment with name too long', () => {
      const invalidTreatment = {
        name: 'a'.repeat(101), // Exceeds 100 character limit
      };

      const result = VeterinaryTreatmentInputSchema.safeParse(invalidTreatment);
      expect(result.success).toBe(false);
    });

    it('should accept hospital with minimal data', () => {
      const minimalHospital = { name: 'ミニマル病院' };

      const result = VeterinaryHospitalInputSchema.safeParse(minimalHospital);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(minimalHospital.name);
        expect(result.data.address).toBeUndefined();
        expect(result.data.phone).toBeUndefined();
      }
    });

    it('should accept doctor with minimal data', () => {
      const minimalDoctor = { name: 'ミニマル先生' };

      const result = VeterinaryDoctorInputSchema.safeParse(minimalDoctor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(minimalDoctor.name);
        expect(result.data.hospitalId).toBeUndefined();
        expect(result.data.specialization).toBeUndefined();
      }
    });

    it('should accept treatment with minimal data', () => {
      const minimalTreatment = { name: 'ミニマル処方' };

      const result = VeterinaryTreatmentInputSchema.safeParse(minimalTreatment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(minimalTreatment.name);
        expect(result.data.category).toBeUndefined();
        expect(result.data.description).toBeUndefined();
      }
    });

    it('should validate phone number format', () => {
      const validPhones = ['03-1234-5678', '090-1234-5678', '+81-3-1234-5678', '(03) 1234-5678'];
      const invalidPhones = ['abc-defg-hijk', '123456789012345678901', 'phone'];

      validPhones.forEach((phone) => {
        const result = VeterinaryHospitalInputSchema.safeParse({
          name: 'テスト病院',
          phone,
        });
        expect(result.success).toBe(true);
      });

      invalidPhones.forEach((phone) => {
        const result = VeterinaryHospitalInputSchema.safeParse({
          name: 'テスト病院',
          phone,
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
