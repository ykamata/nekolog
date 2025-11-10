import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import {
  VeterinaryVisitInputSchema,
  VeterinaryVisitUpdateSchema,
  VeterinaryVisitFilterSchema,
} from '~/lib/validations/veterinary-visit';

describe.skip('Veterinary Visits API Logic', () => {
  // Test data
  const testCat = {
    name: 'テスト猫',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
  };

  const testVisitData = {
    catId: 0,
    visitDate: new Date('2024-01-15T10:00:00Z'),
    hospitalName: 'テスト動物病院',
    doctorName: 'テスト先生',
    treatments: ['健康診断', 'ワクチン接種'],
    cost: 5000,
    notes: 'テストメモ',
    hasBloodTest: true,
  };

  let testCatId: number;
  let testHospitalId: number;
  let testDoctorId: number;
  let testTreatmentIds: number[];
  let testVisitId: number;

  beforeEach(async () => {
    // Clean up existing test data
    await cleanupTestData();

    // Create test cat
    const cat = await prisma.cat.create({
      data: testCat,
    });
    testCatId = cat.id;
    testVisitData.catId = testCatId;

    // Create test hospital
    const hospital = await prisma.veterinaryHospital.create({
      data: { name: testVisitData.hospitalName },
    });
    testHospitalId = hospital.id;

    // Create test doctor
    const doctor = await prisma.veterinaryDoctor.create({
      data: {
        name: testVisitData.doctorName,
        hospitalId: testHospitalId,
      },
    });
    testDoctorId = doctor.id;

    // Create test treatments
    const treatments = await Promise.all(
      testVisitData.treatments.map(name =>
        prisma.veterinaryTreatment.create({
          data: { name },
        }),
      ),
    );
    testTreatmentIds = treatments.map(t => t.id);
  });

  afterEach(async () => {
    await cleanupTestData();
  });
  async function cleanupTestData() {
    // Delete in correct order to avoid foreign key constraints
    await prisma.veterinaryVisitTreatment.deleteMany({
      where: {
        visit: {
          cat: {
            name: {
              startsWith: 'テスト',
            },
          },
        },
      },
    });
    await prisma.veterinaryVisit.deleteMany({
      where: {
        cat: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.veterinaryAppointment.deleteMany({
      where: {
        cat: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.veterinaryTreatment.deleteMany({
      where: {
        name: {
          in: ['健康診断', 'ワクチン接種', 'テスト処方'],
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
    await prisma.cat.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
  }

  describe('Visit Creation Logic', () => {
    it('should validate visit input schema with valid data', () => {
      const result = VeterinaryVisitInputSchema.safeParse(testVisitData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(testCatId);
        expect(result.data.hospitalName).toBe(testVisitData.hospitalName);
        expect(result.data.cost).toBe(testVisitData.cost);
        expect(result.data.hasBloodTest).toBe(true);
      }
    });

    it('should reject invalid visit input data', () => {
      const invalidVisit = {
        catId: 0, // Invalid cat ID
        visitDate: 'invalid-date', // Invalid date
        hospitalName: '', // Empty hospital name
        treatments: [], // Empty treatments array
        cost: -100, // Negative cost
      };

      const result = VeterinaryVisitInputSchema.safeParse(invalidVisit);
      expect(result.success).toBe(false);
    });
    it('should create visit in database with treatments', async () => {
      const validatedData = VeterinaryVisitInputSchema.parse(testVisitData);

      // Create visit
      const visit = await prisma.veterinaryVisit.create({
        data: {
          catId: validatedData.catId,
          visitDate: validatedData.visitDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          cost: validatedData.cost,
          notes: validatedData.notes,
          hasBloodTest: validatedData.hasBloodTest,
          treatments: {
            create: testTreatmentIds.map(treatmentId => ({
              treatmentId,
            })),
          },
        },
        include: {
          cat: true,
          hospital: true,
          doctor: true,
          treatments: {
            include: {
              treatment: true,
            },
          },
        },
      });

      expect(visit.catId).toBe(testCatId);
      expect(visit.hospitalId).toBe(testHospitalId);
      expect(visit.doctorId).toBe(testDoctorId);
      expect(visit.cost).toBe(testVisitData.cost);
      expect(visit.hasBloodTest).toBe(true);
      expect(visit.treatments).toHaveLength(2);
      expect(visit.treatments.map(vt => vt.treatment.name)).toEqual(
        expect.arrayContaining(['健康診断', 'ワクチン接種']),
      );

      testVisitId = visit.id;
    });

    it('should handle master data creation during visit creation', async () => {
      const newVisitData = {
        ...testVisitData,
        hospitalName: '新しい動物病院',
        doctorName: '新しい先生',
        treatments: ['新しい処方'],
      };

      // Find or create hospital
      let hospital = await prisma.veterinaryHospital.findFirst({
        where: { name: newVisitData.hospitalName },
      });

      if (!hospital) {
        hospital = await prisma.veterinaryHospital.create({
          data: { name: newVisitData.hospitalName },
        });
      }

      // Find or create doctor
      let doctor = await prisma.veterinaryDoctor.findFirst({
        where: {
          name: newVisitData.doctorName,
          hospitalId: hospital.id,
        },
      });

      if (!doctor) {
        doctor = await prisma.veterinaryDoctor.create({
          data: {
            name: newVisitData.doctorName,
            hospitalId: hospital.id,
          },
        });
      }

      // Find or create treatments
      const treatments = [];
      for (const treatmentName of newVisitData.treatments) {
        let treatment = await prisma.veterinaryTreatment.findFirst({
          where: { name: treatmentName },
        });

        if (!treatment) {
          treatment = await prisma.veterinaryTreatment.create({
            data: { name: treatmentName },
          });
        }

        treatments.push(treatment);
      }

      expect(hospital.name).toBe(newVisitData.hospitalName);
      expect(doctor.name).toBe(newVisitData.doctorName);
      expect(treatments).toHaveLength(1);
      expect(treatments[0].name).toBe('新しい処方');
    });
  });
  describe('Visit Reading Logic', () => {
    beforeEach(async () => {
      // Create test visit
      const visit = await prisma.veterinaryVisit.create({
        data: {
          catId: testCatId,
          visitDate: testVisitData.visitDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          cost: testVisitData.cost,
          notes: testVisitData.notes,
          hasBloodTest: testVisitData.hasBloodTest,
          treatments: {
            create: testTreatmentIds.map(treatmentId => ({
              treatmentId,
            })),
          },
        },
      });
      testVisitId = visit.id;
    });

    it('should find visit by ID with all relations', async () => {
      const visit = await prisma.veterinaryVisit.findUnique({
        where: { id: testVisitId },
        include: {
          cat: {
            select: {
              id: true,
              name: true,
            },
          },
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
          treatments: {
            include: {
              treatment: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      expect(visit).not.toBeNull();
      expect(visit?.id).toBe(testVisitId);
      expect(visit?.cat.name).toBe(testCat.name);
      expect(visit?.hospital.name).toBe(testVisitData.hospitalName);
      expect(visit?.doctor?.name).toBe(testVisitData.doctorName);
      expect(visit?.treatments).toHaveLength(2);
      expect(visit?.hasBloodTest).toBe(true);
    });

    it('should list visits with filtering by cat', async () => {
      const filterData = {
        catId: testCatId,
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryVisitFilterSchema.parse(filterData);

      const [visits, total] = await Promise.all([
        prisma.veterinaryVisit.findMany({
          where: { catId: validatedFilter.catId },
          orderBy: { visitDate: 'desc' },
          take: validatedFilter.limit,
          skip: validatedFilter.offset,
          include: {
            cat: true,
            hospital: true,
            doctor: true,
            treatments: {
              include: {
                treatment: true,
              },
            },
          },
        }),
        prisma.veterinaryVisit.count({
          where: { catId: validatedFilter.catId },
        }),
      ]);

      expect(visits).toHaveLength(1);
      expect(total).toBe(1);
      expect(visits[0].catId).toBe(testCatId);
    });
    it('should filter visits by date range', async () => {
      // Create additional visit with different date
      const pastDate = new Date('2023-12-01T10:00:00Z');
      await prisma.veterinaryVisit.create({
        data: {
          catId: testCatId,
          visitDate: pastDate,
          hospitalId: testHospitalId,
          cost: 3000,
          hasBloodTest: false,
        },
      });

      const filterData = {
        catId: testCatId,
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryVisitFilterSchema.parse(filterData);

      const visits = await prisma.veterinaryVisit.findMany({
        where: {
          catId: validatedFilter.catId,
          visitDate: {
            gte: validatedFilter.startDate,
            lte: validatedFilter.endDate,
          },
        },
        orderBy: { visitDate: 'desc' },
      });

      expect(visits).toHaveLength(1);
      expect(visits[0].visitDate.getFullYear()).toBe(2024);
      expect(visits[0].visitDate.getMonth()).toBe(0); // January
    });

    it('should filter visits by blood test flag', async () => {
      // Create additional visit without blood test
      await prisma.veterinaryVisit.create({
        data: {
          catId: testCatId,
          visitDate: new Date('2024-01-20T10:00:00Z'),
          hospitalId: testHospitalId,
          cost: 2000,
          hasBloodTest: false,
        },
      });

      const filterData = {
        catId: testCatId,
        hasBloodTest: true,
        limit: 20,
        offset: 0,
      };

      const validatedFilter = VeterinaryVisitFilterSchema.parse(filterData);

      const visits = await prisma.veterinaryVisit.findMany({
        where: {
          catId: validatedFilter.catId,
          hasBloodTest: validatedFilter.hasBloodTest,
        },
        orderBy: { visitDate: 'desc' },
      });

      expect(visits).toHaveLength(1);
      expect(visits[0].hasBloodTest).toBe(true);
    });

    it('should support pagination', async () => {
      // Create additional visits
      for (let i = 0; i < 3; i++) {
        await prisma.veterinaryVisit.create({
          data: {
            catId: testCatId,
            visitDate: new Date(`2024-01-${10 + i}T10:00:00Z`),
            hospitalId: testHospitalId,
            cost: 1000 + i * 500,
            hasBloodTest: false,
          },
        });
      }

      const filterData = {
        catId: testCatId,
        limit: 2,
        offset: 0,
      };

      const validatedFilter = VeterinaryVisitFilterSchema.parse(filterData);

      const [visits, total] = await Promise.all([
        prisma.veterinaryVisit.findMany({
          where: { catId: validatedFilter.catId },
          orderBy: { visitDate: 'desc' },
          take: validatedFilter.limit,
          skip: validatedFilter.offset,
        }),
        prisma.veterinaryVisit.count({
          where: { catId: validatedFilter.catId },
        }),
      ]);

      expect(visits).toHaveLength(2);
      expect(total).toBe(4); // 1 original + 3 new
    });
  });
  describe('Visit Update Logic', () => {
    beforeEach(async () => {
      // Create test visit
      const visit = await prisma.veterinaryVisit.create({
        data: {
          catId: testCatId,
          visitDate: testVisitData.visitDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          cost: testVisitData.cost,
          notes: testVisitData.notes,
          hasBloodTest: testVisitData.hasBloodTest,
          treatments: {
            create: testTreatmentIds.map(treatmentId => ({
              treatmentId,
            })),
          },
        },
      });
      testVisitId = visit.id;
    });

    it('should validate visit update schema', () => {
      const updateData = {
        cost: 6000,
        notes: '更新されたメモ',
        hasBloodTest: false,
      };

      const result = VeterinaryVisitUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cost).toBe(updateData.cost);
        expect(result.data.notes).toBe(updateData.notes);
        expect(result.data.hasBloodTest).toBe(false);
      }
    });

    it('should update visit basic fields', async () => {
      const updateData = {
        cost: 6000,
        notes: '更新されたメモ',
        hasBloodTest: false,
      };

      const validatedData = VeterinaryVisitUpdateSchema.parse(updateData);

      const updatedVisit = await prisma.veterinaryVisit.update({
        where: { id: testVisitId },
        data: validatedData,
        include: {
          cat: true,
          hospital: true,
          doctor: true,
        },
      });

      expect(updatedVisit.cost).toBe(updateData.cost);
      expect(updatedVisit.notes).toBe(updateData.notes);
      expect(updatedVisit.hasBloodTest).toBe(false);
      expect(updatedVisit.visitDate).toEqual(testVisitData.visitDate); // Should remain unchanged
    });

    it('should update visit treatments', async () => {
      // Create new treatment with unique name
      const newTreatment = await prisma.veterinaryTreatment.create({
        data: { name: `新しい処方_${Date.now()}` },
      });

      // Update treatments in transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing treatment relationships
        await tx.veterinaryVisitTreatment.deleteMany({
          where: { visitId: testVisitId },
        });

        // Create new treatment relationships
        await tx.veterinaryVisitTreatment.create({
          data: {
            visitId: testVisitId,
            treatmentId: newTreatment.id,
          },
        });
      });

      // Verify update
      const updatedVisit = await prisma.veterinaryVisit.findUnique({
        where: { id: testVisitId },
        include: {
          treatments: {
            include: {
              treatment: true,
            },
          },
        },
      });

      expect(updatedVisit?.treatments).toHaveLength(1);
      expect(updatedVisit?.treatments[0].treatment.name).toContain('新しい処方');
    });
    it('should handle partial updates', async () => {
      const updateData = { cost: 7500 };

      const validatedData = VeterinaryVisitUpdateSchema.parse(updateData);

      const updatedVisit = await prisma.veterinaryVisit.update({
        where: { id: testVisitId },
        data: validatedData,
      });

      expect(updatedVisit.cost).toBe(updateData.cost);
      expect(updatedVisit.notes).toBe(testVisitData.notes); // Should remain unchanged
      expect(updatedVisit.hasBloodTest).toBe(testVisitData.hasBloodTest); // Should remain unchanged
    });

    it('should update hospital and doctor references', async () => {
      // Create new hospital and doctor with unique names
      const newHospital = await prisma.veterinaryHospital.create({
        data: { name: `新しい動物病院_${Date.now()}` },
      });

      const newDoctor = await prisma.veterinaryDoctor.create({
        data: {
          name: `新しい先生_${Date.now()}`,
          hospitalId: newHospital.id,
        },
      });

      const updateData = {
        hospitalName: newHospital.name,
        doctorName: newDoctor.name,
      };

      // Simulate the update logic from the API
      const updatedVisit = await prisma.veterinaryVisit.update({
        where: { id: testVisitId },
        data: {
          hospitalId: newHospital.id,
          doctorId: newDoctor.id,
        },
        include: {
          hospital: true,
          doctor: true,
        },
      });

      expect(updatedVisit.hospital.name).toBe(updateData.hospitalName);
      expect(updatedVisit.doctor?.name).toBe(updateData.doctorName);
    });
  });

  describe('Visit Deletion Logic', () => {
    beforeEach(async () => {
      // Create test visit
      const visit = await prisma.veterinaryVisit.create({
        data: {
          catId: testCatId,
          visitDate: testVisitData.visitDate,
          hospitalId: testHospitalId,
          doctorId: testDoctorId,
          cost: testVisitData.cost,
          notes: testVisitData.notes,
          hasBloodTest: testVisitData.hasBloodTest,
          treatments: {
            create: testTreatmentIds.map(treatmentId => ({
              treatmentId,
            })),
          },
        },
      });
      testVisitId = visit.id;
    });

    it('should delete visit and cascade delete treatments', async () => {
      // Verify visit exists with treatments
      const existingVisit = await prisma.veterinaryVisit.findUnique({
        where: { id: testVisitId },
        include: {
          treatments: true,
        },
      });

      expect(existingVisit).not.toBeNull();
      expect(existingVisit?.treatments).toHaveLength(2);

      // Delete visit
      await prisma.veterinaryVisit.delete({
        where: { id: testVisitId },
      });

      // Verify deletion
      const deletedVisit = await prisma.veterinaryVisit.findUnique({
        where: { id: testVisitId },
      });

      expect(deletedVisit).toBeNull();

      // Verify treatment relationships are also deleted (cascade)
      const remainingTreatmentRelations = await prisma.veterinaryVisitTreatment.findMany({
        where: { visitId: testVisitId },
      });

      expect(remainingTreatmentRelations).toHaveLength(0);
    });
    it('should not delete master data when deleting visit', async () => {
      // Delete visit
      await prisma.veterinaryVisit.delete({
        where: { id: testVisitId },
      });

      // Verify master data still exists
      const hospital = await prisma.veterinaryHospital.findUnique({
        where: { id: testHospitalId },
      });
      const doctor = await prisma.veterinaryDoctor.findUnique({
        where: { id: testDoctorId },
      });
      const treatments = await prisma.veterinaryTreatment.findMany({
        where: { id: { in: testTreatmentIds } },
      });

      expect(hospital).not.toBeNull();
      expect(doctor).not.toBeNull();
      expect(treatments).toHaveLength(2);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should reject visit with invalid cat ID', () => {
      const invalidVisit = {
        ...testVisitData,
        catId: 0, // Invalid cat ID should fail validation
      };

      const result = VeterinaryVisitInputSchema.safeParse(invalidVisit);
      expect(result.success).toBe(false);
    });

    it('should reject visit with empty hospital name', () => {
      const invalidVisit = {
        ...testVisitData,
        hospitalName: '',
      };

      const result = VeterinaryVisitInputSchema.safeParse(invalidVisit);
      expect(result.success).toBe(false);
    });

    it('should reject visit with empty treatments array', () => {
      const invalidVisit = {
        ...testVisitData,
        treatments: [],
      };

      const result = VeterinaryVisitInputSchema.safeParse(invalidVisit);
      expect(result.success).toBe(false);
    });

    it('should reject visit with negative cost', () => {
      const invalidVisit = {
        ...testVisitData,
        cost: -100,
      };

      const result = VeterinaryVisitInputSchema.safeParse(invalidVisit);
      expect(result.success).toBe(false);
    });

    it('should reject visit with cost too high', () => {
      const invalidVisit = {
        ...testVisitData,
        cost: 2000000, // Exceeds 1,000,000 limit
      };

      const result = VeterinaryVisitInputSchema.safeParse(invalidVisit);
      expect(result.success).toBe(false);
    });

    it('should reject visit with notes too long', () => {
      const invalidVisit = {
        ...testVisitData,
        notes: 'a'.repeat(1001), // Exceeds 1000 character limit
      };

      const result = VeterinaryVisitInputSchema.safeParse(invalidVisit);
      expect(result.success).toBe(false);
    });

    it('should accept visit with minimal data', () => {
      const minimalVisit = {
        catId: testCatId,
        visitDate: new Date(),
        hospitalName: 'ミニマル病院',
        treatments: ['基本診察'],
        cost: 0,
        hasBloodTest: false,
      };

      const result = VeterinaryVisitInputSchema.safeParse(minimalVisit);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.doctorName).toBeUndefined();
        expect(result.data.notes).toBeUndefined();
      }
    });
  });
});
