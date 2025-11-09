import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import {
  MedicationRecordInputSchema,
  MedicationRecordUpdateSchema,
  MedicationRecordFilterSchema,
} from '~/lib/validations/medication';
import { MedicationType, MedicationStatus } from '~/types/medication';

describe.skip('Medication Record Management API Logic', () => {
  // Test data
  let testCatId: number;
  let testMedicationId: number;
  let createdRecordId: number;

  const testMedication = {
    name: 'テスト薬',
    type: MedicationType.MEDICINE,
    description: 'テスト用の薬です',
    dosage: '1日1回',
  };

  const testCat = {
    name: 'テスト猫',
  };

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.medicationRecord.deleteMany({
      where: {
        OR: [
          {
            cat: {
              name: {
                startsWith: 'テスト',
              },
            },
          },
          {
            medication: {
              name: {
                startsWith: 'テスト',
              },
            },
          },
        ],
      },
    });
    await prisma.cat.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
    await prisma.medication.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });

    // Create test cat and medication
    const cat = await prisma.cat.create({
      data: testCat,
    });
    testCatId = cat.id;

    const medication = await prisma.medication.create({
      data: testMedication,
    });
    testMedicationId = medication.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.medicationRecord.deleteMany({
      where: {
        OR: [
          {
            cat: {
              name: {
                startsWith: 'テスト',
              },
            },
          },
          {
            medication: {
              name: {
                startsWith: 'テスト',
              },
            },
          },
        ],
      },
    });
    await prisma.cat.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
    await prisma.medication.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
  });

  describe('Medication Record Creation Logic', () => {
    it('should validate medication record input schema with valid data', () => {
      const testRecord = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 2,
        administeredAt: new Date('2024-01-01T08:00:00Z'),
        status: MedicationStatus.ADMINISTERED,
        notes: 'テストメモ',
      };

      const result = MedicationRecordInputSchema.safeParse(testRecord);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(testRecord.catId);
        expect(result.data.medicationId).toBe(testRecord.medicationId);
        expect(result.data.quantity).toBe(testRecord.quantity);
        expect(result.data.administeredAt).toEqual(testRecord.administeredAt);
        expect(result.data.status).toBe(testRecord.status);
        expect(result.data.notes).toBe(testRecord.notes);
      }
    });

    it('should validate medication record with minimal required fields', () => {
      const minimalRecord = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 1,
        administeredAt: new Date('2024-01-01T08:00:00Z'),
      };

      const result = MedicationRecordInputSchema.safeParse(minimalRecord);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(minimalRecord.catId);
        expect(result.data.medicationId).toBe(minimalRecord.medicationId);
        expect(result.data.quantity).toBe(minimalRecord.quantity);
        expect(result.data.administeredAt).toEqual(
          minimalRecord.administeredAt,
        );
        expect(result.data.status).toBeUndefined();
        expect(result.data.notes).toBeUndefined();
      }
    });

    it('should reject invalid medication record input data', () => {
      const invalidRecord = {
        catId: '', // Empty catId
        medicationId: '', // Empty medicationId
        quantity: 0, // Invalid quantity
        administeredAt: 'invalid-date', // Invalid date
        notes: 'a'.repeat(501), // Too long notes
      };

      const result = MedicationRecordInputSchema.safeParse(invalidRecord);
      expect(result.success).toBe(false);
    });

    it('should create medication record in database', async () => {
      const testRecord = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 2,
        administeredAt: new Date('2024-01-01T08:00:00Z'),
        status: MedicationStatus.ADMINISTERED,
        notes: 'テストメモ',
      };

      const validatedData = MedicationRecordInputSchema.parse(testRecord);

      const record = await prisma.medicationRecord.create({
        data: {
          ...validatedData,
          status: validatedData.status || MedicationStatus.PENDING,
        },
        include: {
          cat: {
            select: {
              id: true,
              name: true,
            },
          },
          medication: {
            select: {
              id: true,
              name: true,
              type: true,
              dosage: true,
            },
          },
        },
      });

      expect(record.catId).toBe(testRecord.catId);
      expect(record.medicationId).toBe(testRecord.medicationId);
      expect(record.quantity).toBe(testRecord.quantity);
      expect(record.administeredAt).toEqual(testRecord.administeredAt);
      expect(record.status).toBe(testRecord.status);
      expect(record.notes).toBe(testRecord.notes);
      expect(record.cat.name).toBe(testCat.name);
      expect(record.medication.name).toBe(testMedication.name);
      expect(record.id).toBeDefined();
      expect(record.createdAt).toBeDefined();
      expect(record.updatedAt).toBeDefined();

      createdRecordId = record.id;
    });

    it('should verify cat and medication existence', async () => {
      // Verify cat exists
      const cat = await prisma.cat.findUnique({
        where: { id: testCatId },
        select: { id: true, name: true },
      });
      expect(cat).not.toBeNull();
      expect(cat?.name).toBe(testCat.name);

      // Verify medication exists
      const medication = await prisma.medication.findUnique({
        where: { id: testMedicationId },
        select: { id: true, name: true, type: true },
      });
      expect(medication).not.toBeNull();
      expect(medication?.name).toBe(testMedication.name);
    });
  });

  describe('Medication Record Reading Logic', () => {
    beforeEach(async () => {
      const record = await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: testMedicationId,
          quantity: 1,
          administeredAt: new Date('2024-01-01T08:00:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });
      createdRecordId = record.id;
    });

    it('should find medication record by ID', async () => {
      const record = await prisma.medicationRecord.findUnique({
        where: { id: createdRecordId },
        include: {
          cat: {
            select: {
              id: true,
              name: true,
            },
          },
          medication: {
            select: {
              id: true,
              name: true,
              type: true,
              dosage: true,
            },
          },
        },
      });

      expect(record).not.toBeNull();
      expect(record?.id).toBe(createdRecordId);
      expect(record?.catId).toBe(testCatId);
      expect(record?.medicationId).toBe(testMedicationId);
      expect(record?.cat.name).toBe(testCat.name);
      expect(record?.medication.name).toBe(testMedication.name);
    });

    it('should list medication records with filtering', async () => {
      // Create additional records
      await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: testMedicationId,
          quantity: 2,
          administeredAt: new Date('2024-01-02T08:00:00Z'),
          status: MedicationStatus.PENDING,
        },
      });

      const records = await prisma.medicationRecord.findMany({
        where: {
          catId: testCatId,
        },
        orderBy: { administeredAt: 'desc' },
        include: {
          cat: {
            select: {
              id: true,
              name: true,
            },
          },
          medication: {
            select: {
              id: true,
              name: true,
              type: true,
              dosage: true,
            },
          },
        },
      });

      expect(records).toHaveLength(2);
      expect(records[0].administeredAt.getTime()).toBeGreaterThan(
        records[1].administeredAt.getTime(),
      );
    });

    it('should filter records by cat', async () => {
      // Create another cat and record
      const anotherCat = await prisma.cat.create({
        data: { name: 'テスト猫2' },
      });

      await prisma.medicationRecord.create({
        data: {
          catId: anotherCat.id,
          medicationId: testMedicationId,
          quantity: 1,
          administeredAt: new Date('2024-01-01T08:00:00Z'),
        },
      });

      const records = await prisma.medicationRecord.findMany({
        where: { catId: testCatId },
      });

      expect(records).toHaveLength(1);
      expect(records[0].catId).toBe(testCatId);

      // Clean up
      await prisma.medicationRecord.deleteMany({
        where: { catId: anotherCat.id },
      });
      await prisma.cat.delete({ where: { id: anotherCat.id } });
    });

    it('should filter records by medication', async () => {
      // Create another medication and record
      const anotherMedication = await prisma.medication.create({
        data: {
          name: 'テスト薬2',
          type: MedicationType.SUPPLEMENT,
        },
      });

      await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: anotherMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-01T08:00:00Z'),
        },
      });

      const records = await prisma.medicationRecord.findMany({
        where: { medicationId: testMedicationId },
      });

      expect(records).toHaveLength(1);
      expect(records[0].medicationId).toBe(testMedicationId);

      // Clean up
      await prisma.medicationRecord.deleteMany({
        where: { medicationId: anotherMedication.id },
      });
      await prisma.medication.delete({ where: { id: anotherMedication.id } });
    });

    it('should filter records by date range', async () => {
      // Create records with different dates
      await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: testMedicationId,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:00:00Z'),
        },
      });

      await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: testMedicationId,
          quantity: 1,
          administeredAt: new Date('2024-02-01T08:00:00Z'),
        },
      });

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      const records = await prisma.medicationRecord.findMany({
        where: {
          administeredAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { administeredAt: 'asc' },
      });

      expect(records).toHaveLength(2); // Original record + January record
      expect(records[0].administeredAt.getMonth()).toBe(0); // January
      expect(records[1].administeredAt.getMonth()).toBe(0); // January
    });

    it('should filter records by status', async () => {
      // Create records with different statuses
      await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: testMedicationId,
          quantity: 1,
          administeredAt: new Date('2024-01-02T08:00:00Z'),
          status: MedicationStatus.PENDING,
        },
      });

      await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: testMedicationId,
          quantity: 1,
          administeredAt: new Date('2024-01-03T08:00:00Z'),
          status: MedicationStatus.SKIPPED,
        },
      });

      const administeredRecords = await prisma.medicationRecord.findMany({
        where: { status: MedicationStatus.ADMINISTERED },
      });

      const pendingRecords = await prisma.medicationRecord.findMany({
        where: { status: MedicationStatus.PENDING },
      });

      expect(administeredRecords).toHaveLength(1);
      expect(pendingRecords).toHaveLength(1);
    });

    it('should support pagination', async () => {
      // Create additional records
      for (let i = 0; i < 5; i++) {
        await prisma.medicationRecord.create({
          data: {
            catId: testCatId,
            medicationId: testMedicationId,
            quantity: 1,
            administeredAt: new Date(`2024-01-0${i + 2}T08:00:00Z`),
          },
        });
      }

      const [records, total] = await Promise.all([
        prisma.medicationRecord.findMany({
          where: { catId: testCatId },
          orderBy: { administeredAt: 'desc' },
          take: 2,
          skip: 0,
        }),
        prisma.medicationRecord.count({
          where: { catId: testCatId },
        }),
      ]);

      expect(records).toHaveLength(2);
      expect(total).toBe(6); // Original + 5 new records
    });
  });

  describe('Medication Record Update Logic', () => {
    beforeEach(async () => {
      const record = await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: testMedicationId,
          quantity: 1,
          administeredAt: new Date('2024-01-01T08:00:00Z'),
          status: MedicationStatus.PENDING,
        },
      });
      createdRecordId = record.id;
    });

    it('should validate medication record update schema', () => {
      const updateData = {
        quantity: 2,
        status: MedicationStatus.ADMINISTERED,
        notes: '投与完了',
      };

      const result = MedicationRecordUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(updateData.quantity);
        expect(result.data.status).toBe(updateData.status);
        expect(result.data.notes).toBe(updateData.notes);
      }
    });

    it('should update medication record in database', async () => {
      const updateData = {
        quantity: 2,
        status: MedicationStatus.ADMINISTERED,
        notes: '投与完了',
      };

      const validatedData = MedicationRecordUpdateSchema.parse(updateData);

      const updatedRecord = await prisma.medicationRecord.update({
        where: { id: createdRecordId },
        data: validatedData,
        include: {
          cat: {
            select: {
              id: true,
              name: true,
            },
          },
          medication: {
            select: {
              id: true,
              name: true,
              type: true,
              dosage: true,
            },
          },
        },
      });

      expect(updatedRecord.quantity).toBe(updateData.quantity);
      expect(updatedRecord.status).toBe(updateData.status);
      expect(updatedRecord.notes).toBe(updateData.notes);
      expect(updatedRecord.catId).toBe(testCatId); // Should remain unchanged
      expect(updatedRecord.medicationId).toBe(testMedicationId); // Should remain unchanged
    });

    it('should handle partial updates', async () => {
      const updateData = { status: MedicationStatus.ADMINISTERED };

      const validatedData = MedicationRecordUpdateSchema.parse(updateData);

      const updatedRecord = await prisma.medicationRecord.update({
        where: { id: createdRecordId },
        data: validatedData,
      });

      expect(updatedRecord.status).toBe(updateData.status);
      expect(updatedRecord.quantity).toBe(1); // Should remain unchanged
    });

    it('should validate cat and medication existence when updating references', async () => {
      // Create another cat and medication
      const anotherCat = await prisma.cat.create({
        data: { name: 'テスト猫2' },
      });
      const anotherMedication = await prisma.medication.create({
        data: {
          name: 'テスト薬2',
          type: MedicationType.SUPPLEMENT,
        },
      });

      // Update to reference new cat and medication
      const updateData = {
        catId: anotherCat.id,
        medicationId: anotherMedication.id,
      };

      // Verify new cat exists
      const cat = await prisma.cat.findUnique({
        where: { id: updateData.catId },
        select: { id: true },
      });
      expect(cat).not.toBeNull();

      // Verify new medication exists
      const medication = await prisma.medication.findUnique({
        where: { id: updateData.medicationId },
        select: { id: true },
      });
      expect(medication).not.toBeNull();

      const validatedData = MedicationRecordUpdateSchema.parse(updateData);

      const updatedRecord = await prisma.medicationRecord.update({
        where: { id: createdRecordId },
        data: validatedData,
      });

      expect(updatedRecord.catId).toBe(anotherCat.id);
      expect(updatedRecord.medicationId).toBe(anotherMedication.id);

      // Clean up
      await prisma.cat.delete({ where: { id: anotherCat.id } });
      await prisma.medication.delete({ where: { id: anotherMedication.id } });
    });
  });

  describe('Medication Record Deletion Logic', () => {
    beforeEach(async () => {
      const record = await prisma.medicationRecord.create({
        data: {
          catId: testCatId,
          medicationId: testMedicationId,
          quantity: 1,
          administeredAt: new Date('2024-01-01T08:00:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });
      createdRecordId = record.id;
    });

    it('should delete medication record', async () => {
      // Check record exists
      const existingRecord = await prisma.medicationRecord.findUnique({
        where: { id: createdRecordId },
        select: {
          id: true,
          cat: { select: { name: true } },
          medication: { select: { name: true } },
          administeredAt: true,
        },
      });

      expect(existingRecord).not.toBeNull();
      expect(existingRecord?.cat.name).toBe(testCat.name);
      expect(existingRecord?.medication.name).toBe(testMedication.name);

      // Delete record
      await prisma.medicationRecord.delete({
        where: { id: createdRecordId },
      });

      // Verify deletion
      const deletedRecord = await prisma.medicationRecord.findUnique({
        where: { id: createdRecordId },
      });

      expect(deletedRecord).toBeNull();
    });

    it('should handle deletion of non-existent record', async () => {
      const nonExistentId = 999999;

      const existingRecord = await prisma.medicationRecord.findUnique({
        where: { id: nonExistentId },
      });

      expect(existingRecord).toBeNull();
    });
  });

  describe('Filter Validation', () => {
    it('should validate medication record filter schema', () => {
      const validFilter = {
        catId: testCatId,
        medicationId: testMedicationId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        status: MedicationStatus.ADMINISTERED,
        limit: 10,
        offset: 0,
      };

      const result = MedicationRecordFilterSchema.safeParse(validFilter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(validFilter.catId);
        expect(result.data.medicationId).toBe(validFilter.medicationId);
        expect(result.data.startDate).toEqual(validFilter.startDate);
        expect(result.data.endDate).toEqual(validFilter.endDate);
        expect(result.data.status).toBe(validFilter.status);
        expect(result.data.limit).toBe(validFilter.limit);
        expect(result.data.offset).toBe(validFilter.offset);
      }
    });

    it('should validate empty filter', () => {
      const emptyFilter = {};

      const result = MedicationRecordFilterSchema.safeParse(emptyFilter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('should reject filter with end date before start date', () => {
      const invalidFilter = {
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01'),
      };

      const result = MedicationRecordFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });

    it('should allow filter with end date equal to start date', () => {
      const validFilter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-01'),
      };

      const result = MedicationRecordFilterSchema.safeParse(validFilter);
      expect(result.success).toBe(true);
    });

    it('should reject filter with invalid limit', () => {
      const invalidFilter = {
        limit: 101, // Exceeds maximum
      };

      const result = MedicationRecordFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });

    it('should reject filter with negative offset', () => {
      const invalidFilter = {
        offset: -1,
      };

      const result = MedicationRecordFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should reject record with quantity less than 1', () => {
      const invalidRecord = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 0,
        administeredAt: new Date(),
      };

      const result = MedicationRecordInputSchema.safeParse(invalidRecord);
      expect(result.success).toBe(false);
    });

    it('should reject record with quantity greater than 100', () => {
      const invalidRecord = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 101,
        administeredAt: new Date(),
      };

      const result = MedicationRecordInputSchema.safeParse(invalidRecord);
      expect(result.success).toBe(false);
    });

    it('should reject record with non-integer quantity', () => {
      const invalidRecord = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 1.5,
        administeredAt: new Date(),
      };

      const result = MedicationRecordInputSchema.safeParse(invalidRecord);
      expect(result.success).toBe(false);
    });

    it('should reject record with notes too long', () => {
      const invalidRecord = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 1,
        administeredAt: new Date(),
        notes: 'a'.repeat(501),
      };

      const result = MedicationRecordInputSchema.safeParse(invalidRecord);
      expect(result.success).toBe(false);
    });

    it('should reject record with invalid status', () => {
      const invalidRecord = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 1,
        administeredAt: new Date(),
        status: 'INVALID_STATUS',
      };

      const result = MedicationRecordInputSchema.safeParse(invalidRecord);
      expect(result.success).toBe(false);
    });

    it('should handle empty strings for optional fields', () => {
      const recordWithEmptyStrings = {
        catId: testCatId,
        medicationId: testMedicationId,
        quantity: 1,
        administeredAt: new Date(),
        notes: '',
      };

      const result = MedicationRecordInputSchema.safeParse(
        recordWithEmptyStrings,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('');
      }
    });
  });
});
