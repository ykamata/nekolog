import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import {
  MedicationInputSchema,
  MedicationUpdateSchema,
} from '~/lib/validations/medication';
import { MedicationType } from '~/types/medication';

describe('Medication Management API Logic', () => {
  // Test data
  const testMedication = {
    name: 'テスト薬',
    type: MedicationType.MEDICINE,
    description: 'テスト用の薬です',
    dosage: '1日1回',
  };

  const testMedication2 = {
    name: 'テストサプリ',
    type: MedicationType.SUPPLEMENT,
    description: 'テスト用のサプリメントです',
    dosage: '1日2回',
  };

  let createdMedicationId: number;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.medicationReminder.deleteMany({
      where: {
        medication: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.medicationSchedule.deleteMany({
      where: {
        medication: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.medicationRecord.deleteMany({
      where: {
        medication: {
          name: {
            startsWith: 'テスト',
          },
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

  afterEach(async () => {
    // Clean up test data
    await prisma.medicationReminder.deleteMany({
      where: {
        medication: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.medicationSchedule.deleteMany({
      where: {
        medication: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.medicationRecord.deleteMany({
      where: {
        medication: {
          name: {
            startsWith: 'テスト',
          },
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

  describe('Medication Creation Logic', () => {
    it('should validate medication input schema with valid data', () => {
      const result = MedicationInputSchema.safeParse(testMedication);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(testMedication.name);
        expect(result.data.type).toBe(testMedication.type);
        expect(result.data.description).toBe(testMedication.description);
        expect(result.data.dosage).toBe(testMedication.dosage);
      }
    });

    it('should reject invalid medication input data', () => {
      const invalidMedication = {
        name: '', // Empty name
        type: 'INVALID_TYPE', // Invalid type
        description: 'a'.repeat(501), // Too long description
      };

      const result = MedicationInputSchema.safeParse(invalidMedication);
      expect(result.success).toBe(false);
    });

    it('should create medication in database', async () => {
      const validatedData = MedicationInputSchema.parse(testMedication);

      const medication = await prisma.medication.create({
        data: validatedData,
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          dosage: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(medication.name).toBe(testMedication.name);
      expect(medication.type).toBe(testMedication.type);
      expect(medication.description).toBe(testMedication.description);
      expect(medication.dosage).toBe(testMedication.dosage);
      expect(medication.id).toBeDefined();
      expect(medication.createdAt).toBeDefined();
      expect(medication.updatedAt).toBeDefined();

      createdMedicationId = medication.id;
    });

    it('should handle duplicate name validation', async () => {
      // Create first medication
      const medication1 = await prisma.medication.create({
        data: MedicationInputSchema.parse(testMedication),
      });

      // Check for existing medication with same name
      const existingMedication = await prisma.medication.findFirst({
        where: { name: testMedication.name },
      });

      expect(existingMedication).not.toBeNull();
      expect(existingMedication?.name).toBe(testMedication.name);

      createdMedicationId = medication1.id;
    });
  });

  describe('Medication Reading Logic', () => {
    beforeEach(async () => {
      const medication = await prisma.medication.create({
        data: MedicationInputSchema.parse(testMedication),
      });
      createdMedicationId = medication.id;
    });

    it('should find medication by ID', async () => {
      const medication = await prisma.medication.findUnique({
        where: { id: createdMedicationId },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          dosage: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              records: true,
              schedules: true,
            },
          },
        },
      });

      expect(medication).not.toBeNull();
      expect(medication?.id).toBe(createdMedicationId);
      expect(medication?.name).toBe(testMedication.name);
      expect(medication?._count.records).toBe(0);
      expect(medication?._count.schedules).toBe(0);
    });

    it('should list medications with filtering', async () => {
      // Create second medication
      await prisma.medication.create({
        data: MedicationInputSchema.parse(testMedication2),
      });

      // Get all test medications
      const medications = await prisma.medication.findMany({
        where: {
          name: {
            startsWith: 'テスト',
          },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          dosage: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              records: true,
              schedules: true,
            },
          },
        },
      });

      expect(medications).toHaveLength(2);
      expect(medications[0].name).toBe('テストサプリ');
      expect(medications[1].name).toBe('テスト薬');
    });

    it('should filter medications by type', async () => {
      // Create second medication
      await prisma.medication.create({
        data: MedicationInputSchema.parse(testMedication2),
      });

      // Filter by MEDICINE type
      const medicines = await prisma.medication.findMany({
        where: {
          type: MedicationType.MEDICINE,
          name: {
            startsWith: 'テスト',
          },
        },
        orderBy: { name: 'asc' },
      });

      expect(medicines).toHaveLength(1);
      expect(medicines[0].name).toBe('テスト薬');
      expect(medicines[0].type).toBe(MedicationType.MEDICINE);
    });

    it('should support pagination', async () => {
      // Create second medication
      await prisma.medication.create({
        data: MedicationInputSchema.parse(testMedication2),
      });

      const [medications, total] = await Promise.all([
        prisma.medication.findMany({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
          orderBy: { name: 'asc' },
          take: 1,
          skip: 0,
        }),
        prisma.medication.count({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
        }),
      ]);

      expect(medications).toHaveLength(1);
      expect(total).toBe(2);
      expect(medications[0].name).toBe('テストサプリ');
    });
  });

  describe('Medication Update Logic', () => {
    beforeEach(async () => {
      const medication = await prisma.medication.create({
        data: MedicationInputSchema.parse(testMedication),
      });
      createdMedicationId = medication.id;
    });

    it('should validate medication update schema', () => {
      const updateData = {
        name: '更新された薬',
        dosage: '1日3回',
      };

      const result = MedicationUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(updateData.name);
        expect(result.data.dosage).toBe(updateData.dosage);
      }
    });

    it('should update medication in database', async () => {
      const updateData = {
        name: '更新された薬',
        dosage: '1日3回',
      };

      const validatedData = MedicationUpdateSchema.parse(updateData);

      const updatedMedication = await prisma.medication.update({
        where: { id: createdMedicationId },
        data: validatedData,
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          dosage: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(updatedMedication.name).toBe(updateData.name);
      expect(updatedMedication.dosage).toBe(updateData.dosage);
      expect(updatedMedication.type).toBe(testMedication.type); // Should remain unchanged
      expect(updatedMedication.description).toBe(testMedication.description); // Should remain unchanged
    });

    it('should handle partial updates', async () => {
      const updateData = { dosage: '1日4回' };

      const validatedData = MedicationUpdateSchema.parse(updateData);

      const updatedMedication = await prisma.medication.update({
        where: { id: createdMedicationId },
        data: validatedData,
      });

      expect(updatedMedication.name).toBe(testMedication.name); // Should remain unchanged
      expect(updatedMedication.dosage).toBe(updateData.dosage);
    });

    it('should handle name conflict validation', async () => {
      // Create second medication
      await prisma.medication.create({
        data: MedicationInputSchema.parse(testMedication2),
      });

      // Check for name conflict
      const nameConflict = await prisma.medication.findFirst({
        where: {
          name: testMedication2.name,
          id: { not: createdMedicationId },
        },
      });

      expect(nameConflict).not.toBeNull();
      expect(nameConflict?.name).toBe(testMedication2.name);
    });
  });

  describe('Medication Deletion Logic', () => {
    beforeEach(async () => {
      const medication = await prisma.medication.create({
        data: MedicationInputSchema.parse(testMedication),
      });
      createdMedicationId = medication.id;
    });

    it('should delete medication without related records', async () => {
      // Check medication exists
      const existingMedication = await prisma.medication.findUnique({
        where: { id: createdMedicationId },
        include: {
          _count: {
            select: {
              records: true,
              schedules: true,
            },
          },
        },
      });

      expect(existingMedication).not.toBeNull();
      expect(existingMedication?._count.records).toBe(0);
      expect(existingMedication?._count.schedules).toBe(0);

      // Delete medication
      await prisma.medication.delete({
        where: { id: createdMedicationId },
      });

      // Verify deletion
      const deletedMedication = await prisma.medication.findUnique({
        where: { id: createdMedicationId },
      });

      expect(deletedMedication).toBeNull();
    });

    it('should check for related records before deletion', async () => {
      // Create a cat first (needed for medication record)
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
        },
      });

      // Create a medication record
      await prisma.medicationRecord.create({
        data: {
          catId: cat.id,
          medicationId: createdMedicationId,
          quantity: 1,
          administeredAt: new Date(),
        },
      });

      // Check for related records
      const medicationWithRecords = await prisma.medication.findUnique({
        where: { id: createdMedicationId },
        include: {
          _count: {
            select: {
              records: true,
              schedules: true,
            },
          },
        },
      });

      expect(medicationWithRecords?._count.records).toBe(1);

      // Clean up
      await prisma.medicationRecord.deleteMany({
        where: { medicationId: createdMedicationId },
      });
      await prisma.cat.delete({ where: { id: cat.id } });
    });

    it('should cascade delete related records when requested', async () => {
      // Create a cat first (needed for medication record)
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
        },
      });

      // Create a medication record
      const record = await prisma.medicationRecord.create({
        data: {
          catId: cat.id,
          medicationId: createdMedicationId,
          quantity: 1,
          administeredAt: new Date(),
        },
      });

      // Delete medication with cascade (using transaction)
      await prisma.$transaction(async (tx) => {
        // Delete reminders first
        await tx.medicationReminder.deleteMany({
          where: { medicationId: createdMedicationId },
        });

        // Delete schedules
        await tx.medicationSchedule.deleteMany({
          where: { medicationId: createdMedicationId },
        });

        // Delete records
        await tx.medicationRecord.deleteMany({
          where: { medicationId: createdMedicationId },
        });

        // Finally delete the medication
        await tx.medication.delete({
          where: { id: createdMedicationId },
        });
      });

      // Verify medication is deleted
      const deletedMedication = await prisma.medication.findUnique({
        where: { id: createdMedicationId },
      });
      expect(deletedMedication).toBeNull();

      // Verify record is also deleted
      const deletedRecord = await prisma.medicationRecord.findUnique({
        where: { id: record.id },
      });
      expect(deletedRecord).toBeNull();

      // Clean up cat
      await prisma.cat.delete({ where: { id: cat.id } });
    });
  });

  describe('Validation Edge Cases', () => {
    it('should reject medication with name too long', () => {
      const longNameMedication = {
        name: 'a'.repeat(101), // Exceeds 100 character limit
        type: MedicationType.MEDICINE,
      };

      const result = MedicationInputSchema.safeParse(longNameMedication);
      expect(result.success).toBe(false);
    });

    it('should reject medication with description too long', () => {
      const longDescMedication = {
        name: 'テスト薬',
        type: MedicationType.MEDICINE,
        description: 'a'.repeat(501), // Exceeds 500 character limit
      };

      const result = MedicationInputSchema.safeParse(longDescMedication);
      expect(result.success).toBe(false);
    });

    it('should reject medication with dosage too long', () => {
      const longDosageMedication = {
        name: 'テスト薬',
        type: MedicationType.MEDICINE,
        dosage: 'a'.repeat(101), // Exceeds 100 character limit
      };

      const result = MedicationInputSchema.safeParse(longDosageMedication);
      expect(result.success).toBe(false);
    });

    it('should reject medication with invalid type', () => {
      const invalidTypeMedication = {
        name: 'テスト薬',
        type: 'INVALID_TYPE',
      };

      const result = MedicationInputSchema.safeParse(invalidTypeMedication);
      expect(result.success).toBe(false);
    });

    it('should accept medication with minimal data', () => {
      const minimalMedication = {
        name: 'ミニマル薬',
        type: MedicationType.VITAMIN,
      };

      const result = MedicationInputSchema.safeParse(minimalMedication);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(minimalMedication.name);
        expect(result.data.type).toBe(minimalMedication.type);
        expect(result.data.description).toBeUndefined();
        expect(result.data.dosage).toBeUndefined();
      }
    });

    it('should handle empty strings as empty for optional fields', () => {
      const medicationWithEmptyStrings = {
        name: 'テスト薬',
        type: MedicationType.MEDICINE,
        description: '',
        dosage: '',
      };

      const result = MedicationInputSchema.safeParse(
        medicationWithEmptyStrings,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('');
        expect(result.data.dosage).toBe('');
      }
    });
  });
});
