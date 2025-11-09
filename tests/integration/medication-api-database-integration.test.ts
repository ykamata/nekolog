import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp, toNodeListener } from 'h3';
import { listen } from 'listhen';
import { prisma } from '~/lib/prisma';
import { MedicationType, MedicationStatus } from '~/types/medication';

// Import API handlers
import medicationsIndexGet from '~/server/api/medications/index.get';
import medicationsIndexPost from '~/server/api/medications/index.post';
import medicationsIdGet from '~/server/api/medications/[id].get';
import medicationsIdPut from '~/server/api/medications/[id].put';
import medicationsIdDelete from '~/server/api/medications/[id].delete';

import medicationRecordsIndexGet from '~/server/api/medication-records/index.get';
import medicationRecordsIndexPost from '~/server/api/medication-records/index.post';
import medicationRecordsIdGet from '~/server/api/medication-records/[id].get';
import medicationRecordsIdPut from '~/server/api/medication-records/[id].put';
import medicationRecordsIdDelete from '~/server/api/medication-records/[id].delete';

describe('Medication API Database Integration', () => {
  let testCatId: string;
  let testMedicationId: string;
  let testRecordId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.medicationReminder.deleteMany({
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
    await prisma.medicationSchedule.deleteMany({
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
    const testCat = await prisma.cat.create({
      data: {
        name: 'テスト猫',
        birthdate: new Date('2020-01-01'),
        weight: 4.5,
      },
    });
    testCatId = testCat.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.medicationReminder.deleteMany({
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
    await prisma.medicationSchedule.deleteMany({
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

  describe('Medication API Integration', () => {
    it('should handle complete medication CRUD workflow through API', async () => {
      // Create medication through API
      const createEvent = {
        node: {
          req: {
            method: 'POST',
            url: '/api/medications',
            headers: { 'content-type': 'application/json' },
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock readBody to return medication data
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          readBody: vi.fn().mockResolvedValue({
            name: 'テスト薬API',
            type: MedicationType.MEDICINE,
            description: 'API経由で作成されたテスト薬',
            dosage: '1日2回',
          }),
        };
      });

      const createdMedication = await medicationsIndexPost(createEvent);
      expect(createdMedication.name).toBe('テスト薬API');
      expect(createdMedication.type).toBe(MedicationType.MEDICINE);
      testMedicationId = createdMedication.id;

      // Verify medication was created in database
      const dbMedication = await prisma.medication.findUnique({
        where: { id: testMedicationId },
      });
      expect(dbMedication).not.toBeNull();
      expect(dbMedication?.name).toBe('テスト薬API');

      // Read medication through API
      const readEvent = {
        context: {
          params: { id: testMedicationId },
        },
      } as any;

      const readMedication = await medicationsIdGet(readEvent);
      expect(readMedication.id).toBe(testMedicationId);
      expect(readMedication.name).toBe('テスト薬API');

      // Update medication through API
      const updateEvent = {
        node: {
          req: {
            method: 'PUT',
            url: `/api/medications/${testMedicationId}`,
            headers: { 'content-type': 'application/json' },
          },
          res: {},
        },
        context: {
          params: { id: testMedicationId },
        },
      } as any;

      // Mock readBody for update
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          readBody: vi.fn().mockResolvedValue({
            name: '更新されたテスト薬API',
            dosage: '1日3回',
          }),
        };
      });

      const updatedMedication = await medicationsIdPut(updateEvent);
      expect(updatedMedication.name).toBe('更新されたテスト薬API');
      expect(updatedMedication.dosage).toBe('1日3回');

      // Verify update in database
      const dbUpdatedMedication = await prisma.medication.findUnique({
        where: { id: testMedicationId },
      });
      expect(dbUpdatedMedication?.name).toBe('更新されたテスト薬API');
      expect(dbUpdatedMedication?.dosage).toBe('1日3回');

      // List medications through API
      const listEvent = {
        node: {
          req: {
            method: 'GET',
            url: '/api/medications',
          },
          res: {},
        },
        context: {},
      } as any;

      const medications = await medicationsIndexGet(listEvent);
      expect(Array.isArray(medications)).toBe(true);
      expect(medications.length).toBeGreaterThan(0);
      const foundMedication = medications.find(m => m.id === testMedicationId);
      expect(foundMedication).toBeDefined();
      expect(foundMedication?.name).toBe('更新されたテスト薬API');

      // Delete medication through API
      const deleteEvent = {
        context: {
          params: { id: testMedicationId },
        },
      } as any;

      await medicationsIdDelete(deleteEvent);

      // Verify deletion in database
      const deletedMedication = await prisma.medication.findUnique({
        where: { id: testMedicationId },
      });
      expect(deletedMedication).toBeNull();
    });

    it('should handle medication filtering and pagination through API', async () => {
      // Create multiple medications
      const medications = await Promise.all([
        prisma.medication.create({
          data: {
            name: 'テスト薬A',
            type: MedicationType.MEDICINE,
            description: 'テスト用の薬A',
          },
        }),
        prisma.medication.create({
          data: {
            name: 'テストサプリB',
            type: MedicationType.SUPPLEMENT,
            description: 'テスト用のサプリB',
          },
        }),
        prisma.medication.create({
          data: {
            name: 'テストビタミンC',
            type: MedicationType.VITAMIN,
            description: 'テスト用のビタミンC',
          },
        }),
      ]);

      // Test filtering by type
      const filterEvent = {
        node: {
          req: {
            method: 'GET',
            url: '/api/medications?type=SUPPLEMENT',
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock getQuery to return filter parameters
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          getQuery: vi.fn().mockReturnValue({
            type: 'SUPPLEMENT',
          }),
        };
      });

      const filteredMedications = await medicationsIndexGet(filterEvent);
      expect(filteredMedications.length).toBe(1);
      expect(filteredMedications[0].type).toBe(MedicationType.SUPPLEMENT);
      expect(filteredMedications[0].name).toBe('テストサプリB');

      // Test pagination
      const paginationEvent = {
        node: {
          req: {
            method: 'GET',
            url: '/api/medications?limit=2&offset=0',
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock getQuery for pagination
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          getQuery: vi.fn().mockReturnValue({
            limit: '2',
            offset: '0',
          }),
        };
      });

      const paginatedMedications = await medicationsIndexGet(paginationEvent);
      expect(paginatedMedications.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Medication Record API Integration', () => {
    beforeEach(async () => {
      // Create test medication
      const medication = await prisma.medication.create({
        data: {
          name: 'テスト薬レコード',
          type: MedicationType.MEDICINE,
          description: 'レコードテスト用の薬',
          dosage: '1日1回',
        },
      });
      testMedicationId = medication.id;
    });

    it('should handle complete medication record CRUD workflow through API', async () => {
      // Create medication record through API
      const createEvent = {
        node: {
          req: {
            method: 'POST',
            url: '/api/medication-records',
            headers: { 'content-type': 'application/json' },
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock readBody for record creation
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          readBody: vi.fn().mockResolvedValue({
            catId: testCatId,
            medicationId: testMedicationId,
            quantity: 2,
            administeredAt: new Date('2024-01-15T08:00:00Z'),
            status: MedicationStatus.ADMINISTERED,
            notes: 'API経由で作成されたレコード',
          }),
        };
      });

      const createdRecord = await medicationRecordsIndexPost(createEvent);
      expect(createdRecord.catId).toBe(testCatId);
      expect(createdRecord.medicationId).toBe(testMedicationId);
      expect(createdRecord.quantity).toBe(2);
      expect(createdRecord.status).toBe(MedicationStatus.ADMINISTERED);
      testRecordId = createdRecord.id;

      // Verify record was created in database
      const dbRecord = await prisma.medicationRecord.findUnique({
        where: { id: testRecordId },
        include: { cat: true, medication: true },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.cat.name).toBe('テスト猫');
      expect(dbRecord?.medication.name).toBe('テスト薬レコード');

      // Read record through API
      const readEvent = {
        context: {
          params: { id: testRecordId },
        },
      } as any;

      const readRecord = await medicationRecordsIdGet(readEvent);
      expect(readRecord.id).toBe(testRecordId);
      expect(readRecord.notes).toBe('API経由で作成されたレコード');

      // Update record through API
      const updateEvent = {
        node: {
          req: {
            method: 'PUT',
            url: `/api/medication-records/${testRecordId}`,
            headers: { 'content-type': 'application/json' },
          },
          res: {},
        },
        context: {
          params: { id: testRecordId },
        },
      } as any;

      // Mock readBody for update
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          readBody: vi.fn().mockResolvedValue({
            quantity: 3,
            notes: '更新されたレコード',
          }),
        };
      });

      const updatedRecord = await medicationRecordsIdPut(updateEvent);
      expect(updatedRecord.quantity).toBe(3);
      expect(updatedRecord.notes).toBe('更新されたレコード');

      // Verify update in database
      const dbUpdatedRecord = await prisma.medicationRecord.findUnique({
        where: { id: testRecordId },
      });
      expect(dbUpdatedRecord?.quantity).toBe(3);
      expect(dbUpdatedRecord?.notes).toBe('更新されたレコード');

      // List records through API
      const listEvent = {
        node: {
          req: {
            method: 'GET',
            url: '/api/medication-records',
          },
          res: {},
        },
        context: {},
      } as any;

      const records = await medicationRecordsIndexGet(listEvent);
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);
      const foundRecord = records.find(r => r.id === testRecordId);
      expect(foundRecord).toBeDefined();
      expect(foundRecord?.notes).toBe('更新されたレコード');

      // Delete record through API
      const deleteEvent = {
        context: {
          params: { id: testRecordId },
        },
      } as any;

      await medicationRecordsIdDelete(deleteEvent);

      // Verify deletion in database
      const deletedRecord = await prisma.medicationRecord.findUnique({
        where: { id: testRecordId },
      });
      expect(deletedRecord).toBeNull();
    });

    it('should handle medication record filtering through API', async () => {
      // Create multiple records
      const records = await Promise.all([
        prisma.medicationRecord.create({
          data: {
            catId: testCatId,
            medicationId: testMedicationId,
            quantity: 1,
            administeredAt: new Date('2024-01-15T08:00:00Z'),
            status: MedicationStatus.ADMINISTERED,
          },
        }),
        prisma.medicationRecord.create({
          data: {
            catId: testCatId,
            medicationId: testMedicationId,
            quantity: 1,
            administeredAt: new Date('2024-01-16T08:00:00Z'),
            status: MedicationStatus.PENDING,
          },
        }),
        prisma.medicationRecord.create({
          data: {
            catId: testCatId,
            medicationId: testMedicationId,
            quantity: 1,
            administeredAt: new Date('2024-01-17T08:00:00Z'),
            status: MedicationStatus.SKIPPED,
          },
        }),
      ]);

      // Test filtering by cat
      const catFilterEvent = {
        node: {
          req: {
            method: 'GET',
            url: `/api/medication-records?catId=${testCatId}`,
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock getQuery for cat filtering
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          getQuery: vi.fn().mockReturnValue({
            catId: testCatId,
          }),
        };
      });

      const catFilteredRecords = await medicationRecordsIndexGet(catFilterEvent);
      expect(catFilteredRecords.length).toBe(3);
      catFilteredRecords.forEach((record) => {
        expect(record.catId).toBe(testCatId);
      });

      // Test filtering by status
      const statusFilterEvent = {
        node: {
          req: {
            method: 'GET',
            url: '/api/medication-records?status=ADMINISTERED',
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock getQuery for status filtering
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          getQuery: vi.fn().mockReturnValue({
            status: 'ADMINISTERED',
          }),
        };
      });

      const statusFilteredRecords = await medicationRecordsIndexGet(statusFilterEvent);
      expect(statusFilteredRecords.length).toBe(1);
      expect(statusFilteredRecords[0].status).toBe(MedicationStatus.ADMINISTERED);

      // Test filtering by date range
      const dateFilterEvent = {
        node: {
          req: {
            method: 'GET',
            url: '/api/medication-records?startDate=2024-01-15&endDate=2024-01-16',
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock getQuery for date filtering
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          getQuery: vi.fn().mockReturnValue({
            startDate: '2024-01-15',
            endDate: '2024-01-16',
          }),
        };
      });

      const dateFilteredRecords = await medicationRecordsIndexGet(dateFilterEvent);
      expect(dateFilteredRecords.length).toBe(2);
      dateFilteredRecords.forEach((record) => {
        const recordDate = new Date(record.administeredAt);
        expect(recordDate.getDate()).toBeGreaterThanOrEqual(15);
        expect(recordDate.getDate()).toBeLessThanOrEqual(16);
      });
    });
  });

  describe('API Error Handling Integration', () => {
    it('should handle validation errors properly', async () => {
      // Test medication creation with invalid data
      const invalidCreateEvent = {
        node: {
          req: {
            method: 'POST',
            url: '/api/medications',
            headers: { 'content-type': 'application/json' },
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock readBody with invalid data
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          readBody: vi.fn().mockResolvedValue({
            name: '', // Invalid: empty name
            type: 'INVALID_TYPE', // Invalid: wrong type
            description: 'a'.repeat(501), // Invalid: too long
          }),
        };
      });

      try {
        await medicationsIndexPost(invalidCreateEvent);
        expect.fail('Should have thrown validation error');
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.statusMessage).toContain('入力データが無効です');
      }
    });

    it('should handle not found errors properly', async () => {
      const nonExistentId = 999999;

      // Test reading non-existent medication
      const readEvent = {
        context: {
          params: { id: nonExistentId },
        },
      } as any;

      try {
        await medicationsIdGet(readEvent);
        expect.fail('Should have thrown not found error');
      }
      catch (error: any) {
        expect(error.statusCode).toBe(404);
      }

      // Test updating non-existent medication
      const updateEvent = {
        node: {
          req: {
            method: 'PUT',
            url: `/api/medications/${nonExistentId}`,
            headers: { 'content-type': 'application/json' },
          },
          res: {},
        },
        context: {
          params: { id: nonExistentId },
        },
      } as any;

      // Mock readBody for update
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          readBody: vi.fn().mockResolvedValue({
            name: '更新テスト',
          }),
        };
      });

      try {
        await medicationsIdPut(updateEvent);
        expect.fail('Should have thrown not found error');
      }
      catch (error: any) {
        expect(error.statusCode).toBe(404);
      }

      // Test deleting non-existent medication
      const deleteEvent = {
        context: {
          params: { id: nonExistentId },
        },
      } as any;

      try {
        await medicationsIdDelete(deleteEvent);
        expect.fail('Should have thrown not found error');
      }
      catch (error: any) {
        expect(error.statusCode).toBe(404);
      }
    });

    it('should handle foreign key constraint errors', async () => {
      // Test creating medication record with non-existent cat
      const invalidRecordEvent = {
        node: {
          req: {
            method: 'POST',
            url: '/api/medication-records',
            headers: { 'content-type': 'application/json' },
          },
          res: {},
        },
        context: {},
      } as any;

      // Mock readBody with non-existent catId
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3');
        return {
          ...actual,
          readBody: vi.fn().mockResolvedValue({
            catId: 999999,
            medicationId: testMedicationId || 'test-med-id',
            quantity: 1,
            administeredAt: new Date(),
          }),
        };
      });

      try {
        await medicationRecordsIndexPost(invalidRecordEvent);
        expect.fail('Should have thrown foreign key constraint error');
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400);
      }
    });
  });

  describe('Database Transaction Integration', () => {
    it('should handle complex operations with proper transaction rollback', async () => {
      // Create medication
      const medication = await prisma.medication.create({
        data: {
          name: 'テストトランザクション薬',
          type: MedicationType.MEDICINE,
          description: 'トランザクションテスト用',
        },
      });

      // Create schedule
      const schedule = await prisma.medicationSchedule.create({
        data: {
          catId: testCatId,
          medicationId: medication.id,
          frequency: 'daily',
          times: JSON.stringify(['08:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      // Create reminder
      const reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: schedule.id,
          catId: testCatId,
          medicationId: medication.id,
          scheduledAt: new Date('2024-01-15T08:00:00Z'),
          status: 'PENDING' as any,
        },
      });

      // Verify all entities exist
      expect(await prisma.medication.findUnique({ where: { id: medication.id } })).not.toBeNull();
      expect(await prisma.medicationSchedule.findUnique({ where: { id: schedule.id } })).not.toBeNull();
      expect(await prisma.medicationReminder.findUnique({ where: { id: reminder.id } })).not.toBeNull();

      // Test transaction rollback by attempting to delete medication with constraints
      try {
        await prisma.$transaction(async (tx) => {
          // This should fail due to foreign key constraints
          await tx.medication.delete({
            where: { id: medication.id },
          });
        });
        expect.fail('Transaction should have failed');
      }
      catch (error) {
        // Transaction should rollback, all entities should still exist
        expect(await prisma.medication.findUnique({ where: { id: medication.id } })).not.toBeNull();
        expect(await prisma.medicationSchedule.findUnique({ where: { id: schedule.id } })).not.toBeNull();
        expect(await prisma.medicationReminder.findUnique({ where: { id: reminder.id } })).not.toBeNull();
      }

      // Test successful transaction with proper cascade delete
      await prisma.$transaction(async (tx) => {
        // Delete in proper order
        await tx.medicationReminder.deleteMany({
          where: { medicationId: medication.id },
        });
        await tx.medicationSchedule.deleteMany({
          where: { medicationId: medication.id },
        });
        await tx.medication.delete({
          where: { id: medication.id },
        });
      });

      // Verify all entities are deleted
      expect(await prisma.medication.findUnique({ where: { id: medication.id } })).toBeNull();
      expect(await prisma.medicationSchedule.findUnique({ where: { id: schedule.id } })).toBeNull();
      expect(await prisma.medicationReminder.findUnique({ where: { id: reminder.id } })).toBeNull();
    });
  });
});
