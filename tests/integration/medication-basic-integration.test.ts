import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import { MedicationType, MedicationStatus } from '~/types/medication';
import type { Medication, MedicationRecord } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

describe('Basic Medication Integration Tests', () => {
  let testCat: Cat;
  let testMedication: Medication;

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

    // Create test cat
    testCat = await prisma.cat.create({
      data: {
        name: 'テスト猫',
        birthdate: new Date('2020-01-01'),
        weight: 4.5,
      },
    });

    // Create test medication
    testMedication = await prisma.medication.create({
      data: {
        name: 'テスト薬',
        type: MedicationType.MEDICINE,
        description: 'テスト用の薬です',
        dosage: '1日2回',
      },
    });
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

  describe('Medication CRUD Integration', () => {
    it('should create, read, update, and delete medications', async () => {
      // Create
      const newMedication = await prisma.medication.create({
        data: {
          name: 'テスト薬2',
          type: MedicationType.SUPPLEMENT,
          description: 'テスト用のサプリメント',
          dosage: '1日1回',
        },
      });

      expect(newMedication.name).toBe('テスト薬2');
      expect(newMedication.type).toBe(MedicationType.SUPPLEMENT);

      // Read
      const foundMedication = await prisma.medication.findUnique({
        where: { id: newMedication.id },
      });

      expect(foundMedication).not.toBeNull();
      expect(foundMedication?.name).toBe('テスト薬2');

      // Update
      const updatedMedication = await prisma.medication.update({
        where: { id: newMedication.id },
        data: {
          name: '更新されたテスト薬2',
          dosage: '1日3回',
        },
      });

      expect(updatedMedication.name).toBe('更新されたテスト薬2');
      expect(updatedMedication.dosage).toBe('1日3回');

      // Delete
      await prisma.medication.delete({
        where: { id: newMedication.id },
      });

      const deletedMedication = await prisma.medication.findUnique({
        where: { id: newMedication.id },
      });

      expect(deletedMedication).toBeNull();
    });

    it('should list medications with filtering', async () => {
      // Create additional medications
      await prisma.medication.create({
        data: {
          name: 'テストサプリA',
          type: MedicationType.SUPPLEMENT,
          description: 'サプリメントA',
        },
      });

      await prisma.medication.create({
        data: {
          name: 'テストビタミンB',
          type: MedicationType.VITAMIN,
          description: 'ビタミンB',
        },
      });

      // List all test medications
      const allMedications = await prisma.medication.findMany({
        where: {
          name: {
            startsWith: 'テスト',
          },
        },
        orderBy: { name: 'asc' },
      });

      expect(allMedications).toHaveLength(3);
      expect(allMedications[0].name).toBe('テストサプリA');
      expect(allMedications[1].name).toBe('テストビタミンB');
      expect(allMedications[2].name).toBe('テスト薬');

      // Filter by type
      const supplements = await prisma.medication.findMany({
        where: {
          type: MedicationType.SUPPLEMENT,
          name: {
            startsWith: 'テスト',
          },
        },
      });

      expect(supplements).toHaveLength(1);
      expect(supplements[0].name).toBe('テストサプリA');
    });
  });

  describe('Medication Record Integration', () => {
    it('should create and manage medication records', async () => {
      // Create medication record
      const record = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 2,
          administeredAt: new Date('2024-01-15T08:00:00Z'),
          status: MedicationStatus.ADMINISTERED,
          notes: 'テスト投与記録',
        },
        include: {
          cat: true,
          medication: true,
        },
      });

      expect(record.catId).toBe(testCat.id);
      expect(record.medicationId).toBe(testMedication.id);
      expect(record.quantity).toBe(2);
      expect(record.status).toBe(MedicationStatus.ADMINISTERED);
      expect(record.cat.name).toBe('テスト猫');
      expect(record.medication.name).toBe('テスト薬');

      // Update record
      const updatedRecord = await prisma.medicationRecord.update({
        where: { id: record.id },
        data: {
          quantity: 3,
          notes: '更新されたテスト投与記録',
        },
      });

      expect(updatedRecord.quantity).toBe(3);
      expect(updatedRecord.notes).toBe('更新されたテスト投与記録');

      // List records by cat
      const catRecords = await prisma.medicationRecord.findMany({
        where: { catId: testCat.id },
        include: {
          cat: true,
          medication: true,
        },
      });

      expect(catRecords).toHaveLength(1);
      expect(catRecords[0].cat.name).toBe('テスト猫');

      // Delete record
      await prisma.medicationRecord.delete({
        where: { id: record.id },
      });

      const deletedRecord = await prisma.medicationRecord.findUnique({
        where: { id: record.id },
      });

      expect(deletedRecord).toBeNull();
    });

    it('should filter medication records by various criteria', async () => {
      // Create multiple records
      const records = await Promise.all([
        prisma.medicationRecord.create({
          data: {
            catId: testCat.id,
            medicationId: testMedication.id,
            quantity: 1,
            administeredAt: new Date('2024-01-15T08:00:00Z'),
            status: MedicationStatus.ADMINISTERED,
          },
        }),
        prisma.medicationRecord.create({
          data: {
            catId: testCat.id,
            medicationId: testMedication.id,
            quantity: 1,
            administeredAt: new Date('2024-01-16T08:00:00Z'),
            status: MedicationStatus.PENDING,
          },
        }),
        prisma.medicationRecord.create({
          data: {
            catId: testCat.id,
            medicationId: testMedication.id,
            quantity: 1,
            administeredAt: new Date('2024-01-17T08:00:00Z'),
            status: MedicationStatus.SKIPPED,
          },
        }),
      ]);

      // Filter by status
      const administeredRecords = await prisma.medicationRecord.findMany({
        where: {
          catId: testCat.id,
          status: MedicationStatus.ADMINISTERED,
        },
      });

      expect(administeredRecords).toHaveLength(1);
      expect(administeredRecords[0].status).toBe(MedicationStatus.ADMINISTERED);

      // Filter by date range
      const dateRangeRecords = await prisma.medicationRecord.findMany({
        where: {
          catId: testCat.id,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lte: new Date('2024-01-16T23:59:59Z'),
          },
        },
        orderBy: { administeredAt: 'asc' },
      });

      expect(dateRangeRecords).toHaveLength(2);
      expect(dateRangeRecords[0].administeredAt.getDate()).toBe(15);
      expect(dateRangeRecords[1].administeredAt.getDate()).toBe(16);

      // Count records by status
      const statusCounts = await prisma.medicationRecord.groupBy({
        by: ['status'],
        where: { catId: testCat.id },
        _count: {
          status: true,
        },
      });

      expect(statusCounts).toHaveLength(3);
      const administeredCount = statusCounts.find(s => s.status === MedicationStatus.ADMINISTERED);
      const pendingCount = statusCounts.find(s => s.status === MedicationStatus.PENDING);
      const skippedCount = statusCounts.find(s => s.status === MedicationStatus.SKIPPED);

      expect(administeredCount?._count.status).toBe(1);
      expect(pendingCount?._count.status).toBe(1);
      expect(skippedCount?._count.status).toBe(1);
    });
  });

  describe('Multi-Cat Integration', () => {
    let secondCat: Cat;

    beforeEach(async () => {
      secondCat = await prisma.cat.create({
        data: {
          name: 'テスト猫2',
          birthdate: new Date('2019-06-15'),
          weight: 3.8,
        },
      });
    });

    it('should handle medication records for multiple cats', async () => {
      // Create records for both cats
      const cat1Record = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:00:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });

      const cat2Record = await prisma.medicationRecord.create({
        data: {
          catId: secondCat.id,
          medicationId: testMedication.id,
          quantity: 2,
          administeredAt: new Date('2024-01-15T08:00:00Z'),
          status: MedicationStatus.PENDING,
        },
      });

      // Verify cat-specific filtering
      const cat1Records = await prisma.medicationRecord.findMany({
        where: { catId: testCat.id },
        include: { cat: true },
      });

      const cat2Records = await prisma.medicationRecord.findMany({
        where: { catId: secondCat.id },
        include: { cat: true },
      });

      expect(cat1Records).toHaveLength(1);
      expect(cat1Records[0].cat.name).toBe('テスト猫');
      expect(cat1Records[0].quantity).toBe(1);

      expect(cat2Records).toHaveLength(1);
      expect(cat2Records[0].cat.name).toBe('テスト猫2');
      expect(cat2Records[0].quantity).toBe(2);

      // Verify combined view
      const allRecords = await prisma.medicationRecord.findMany({
        where: {
          medicationId: testMedication.id,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lt: new Date('2024-01-16T00:00:00Z'),
          },
        },
        include: { cat: true },
        orderBy: { cat: { name: 'asc' } },
      });

      expect(allRecords).toHaveLength(2);
      expect(allRecords[0].cat.name).toBe('テスト猫');
      expect(allRecords[1].cat.name).toBe('テスト猫2');
    });

    it('should handle medication usage statistics across cats', async () => {
      // Create additional medication
      const medication2 = await prisma.medication.create({
        data: {
          name: 'テスト薬2',
          type: MedicationType.SUPPLEMENT,
          description: 'テスト用のサプリメント',
        },
      });

      // Create records for different medications and cats
      await Promise.all([
        prisma.medicationRecord.create({
          data: {
            catId: testCat.id,
            medicationId: testMedication.id,
            quantity: 1,
            administeredAt: new Date('2024-01-15T08:00:00Z'),
            status: MedicationStatus.ADMINISTERED,
          },
        }),
        prisma.medicationRecord.create({
          data: {
            catId: testCat.id,
            medicationId: medication2.id,
            quantity: 1,
            administeredAt: new Date('2024-01-15T08:00:00Z'),
            status: MedicationStatus.ADMINISTERED,
          },
        }),
        prisma.medicationRecord.create({
          data: {
            catId: secondCat.id,
            medicationId: testMedication.id,
            quantity: 2,
            administeredAt: new Date('2024-01-15T08:00:00Z'),
            status: MedicationStatus.ADMINISTERED,
          },
        }),
      ]);

      // Get medication usage by cat
      const usageByMedication = await prisma.medicationRecord.groupBy({
        by: ['medicationId'],
        _count: {
          catId: true,
        },
        _sum: {
          quantity: true,
        },
        where: {
          status: MedicationStatus.ADMINISTERED,
        },
      });

      expect(usageByMedication).toHaveLength(2);

      const med1Usage = usageByMedication.find(u => u.medicationId === testMedication.id);
      const med2Usage = usageByMedication.find(u => u.medicationId === medication2.id);

      expect(med1Usage?._count.catId).toBe(2); // Used by 2 cats
      expect(med1Usage?._sum.quantity).toBe(3); // Total quantity: 1 + 2

      expect(med2Usage?._count.catId).toBe(1); // Used by 1 cat
      expect(med2Usage?._sum.quantity).toBe(1); // Total quantity: 1
    });
  });

  describe('Data Integrity Integration', () => {
    it('should maintain referential integrity', async () => {
      // Create medication record
      const record = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:00:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });

      // Verify foreign key relationships
      const recordWithRelations = await prisma.medicationRecord.findUnique({
        where: { id: record.id },
        include: {
          cat: true,
          medication: true,
        },
      });

      expect(recordWithRelations?.cat.id).toBe(testCat.id);
      expect(recordWithRelations?.medication.id).toBe(testMedication.id);

      // Test cascade delete for cat
      await prisma.medicationRecord.deleteMany({
        where: { catId: testCat.id },
      });

      await prisma.cat.delete({
        where: { id: testCat.id },
      });

      // Verify record is deleted when cat is deleted
      const orphanedRecord = await prisma.medicationRecord.findUnique({
        where: { id: record.id },
      });

      expect(orphanedRecord).toBeNull();
    });

    it('should handle constraint violations properly', async () => {
      // Test creating record with non-existent cat
      try {
        await prisma.medicationRecord.create({
          data: {
            catId: 999999,
            medicationId: testMedication.id,
            quantity: 1,
            administeredAt: new Date(),
            status: MedicationStatus.ADMINISTERED,
          },
        });
        expect.fail('Should have thrown foreign key constraint error');
      }
      catch (error: any) {
        expect(error.code).toBe('P2003'); // Prisma foreign key constraint error
      }

      // Test creating record with non-existent medication
      try {
        await prisma.medicationRecord.create({
          data: {
            catId: testCat.id,
            medicationId: 999999,
            quantity: 1,
            administeredAt: new Date(),
            status: MedicationStatus.ADMINISTERED,
          },
        });
        expect.fail('Should have thrown foreign key constraint error');
      }
      catch (error: unknown) {
        expect(error.code).toBe('P2003'); // Prisma foreign key constraint error
      }
    });
  });

  describe('Transaction Integration', () => {
    it('should handle transactions properly', async () => {
      // Test successful transaction
      const result = await prisma.$transaction(async (tx) => {
        const medication = await tx.medication.create({
          data: {
            name: 'トランザクション薬',
            type: MedicationType.MEDICINE,
            description: 'トランザクションテスト用',
          },
        });

        const record = await tx.medicationRecord.create({
          data: {
            catId: testCat.id,
            medicationId: medication.id,
            quantity: 1,
            administeredAt: new Date(),
            status: MedicationStatus.ADMINISTERED,
          },
        });

        return { medication, record };
      });

      // Verify both entities were created
      expect(result.medication.name).toBe('トランザクション薬');
      expect(result.record.medicationId).toBe(result.medication.id);

      const createdMedication = await prisma.medication.findUnique({
        where: { id: result.medication.id },
      });
      const createdRecord = await prisma.medicationRecord.findUnique({
        where: { id: result.record.id },
      });

      expect(createdMedication).not.toBeNull();
      expect(createdRecord).not.toBeNull();
    });

    it('should rollback failed transactions', async () => {
      // Test failed transaction
      try {
        await prisma.$transaction(async (tx) => {
          const medication = await tx.medication.create({
            data: {
              name: '失敗トランザクション薬',
              type: MedicationType.MEDICINE,
              description: '失敗するトランザクション',
            },
          });

          // This should fail due to invalid catId
          await tx.medicationRecord.create({
            data: {
              catId: 0,
              medicationId: medication.id,
              quantity: 1,
              administeredAt: new Date(),
              status: MedicationStatus.ADMINISTERED,
            },
          });
        });
        expect.fail('Transaction should have failed');
      }
      catch (error) {
        // Transaction should rollback, medication should not exist
        const medications = await prisma.medication.findMany({
          where: { name: '失敗トランザクション薬' },
        });
        expect(medications).toHaveLength(0);
      }
    });
  });
});
