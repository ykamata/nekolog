import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import { MedicationType, MedicationStatus, ReminderStatus } from '~/types/medication';
import type { Medication, MedicationRecord, MedicationSchedule, MedicationReminder } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

describe('Medication Management Workflow Integration', () => {
  let testCat: Cat;
  let testMedication: Medication;
  let testSchedule: MedicationSchedule;

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

  describe('Complete Medication Administration Workflow', () => {
    it('should handle complete medication administration workflow', async () => {
      // Step 1: Create medication schedule
      testSchedule = await prisma.medicationSchedule.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          frequency: 'twice_daily',
          times: JSON.stringify(['08:00', '20:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      expect(testSchedule.catId).toBe(testCat.id);
      expect(testSchedule.medicationId).toBe(testMedication.id);
      expect(testSchedule.frequency).toBe('twice_daily');
      expect(JSON.parse(testSchedule.times)).toEqual(['08:00', '20:00']);

      // Step 2: Create reminders based on schedule
      const morningReminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T08:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      const eveningReminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T20:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      expect(morningReminder.status).toBe(ReminderStatus.PENDING);
      expect(eveningReminder.status).toBe(ReminderStatus.PENDING);

      // Step 3: Acknowledge morning reminder and create medication record
      await prisma.medicationReminder.update({
        where: { id: morningReminder.id },
        data: { status: ReminderStatus.ACKNOWLEDGED },
      });

      const morningRecord = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:05:00Z'),
          status: MedicationStatus.ADMINISTERED,
          notes: '朝の投与完了',
        },
      });

      expect(morningRecord.status).toBe(MedicationStatus.ADMINISTERED);
      expect(morningRecord.quantity).toBe(1);

      // Step 4: Skip evening reminder
      await prisma.medicationReminder.update({
        where: { id: eveningReminder.id },
        data: { status: ReminderStatus.DISMISSED },
      });

      const eveningRecord = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 0,
          administeredAt: new Date('2024-01-15T20:00:00Z'),
          status: MedicationStatus.SKIPPED,
          notes: '夜の投与をスキップ',
        },
      });

      expect(eveningRecord.status).toBe(MedicationStatus.SKIPPED);

      // Step 5: Verify complete workflow data integrity
      const finalSchedule = await prisma.medicationSchedule.findUnique({
        where: { id: testSchedule.id },
        include: {
          cat: true,
          medication: true,
        },
      });

      const finalReminders = await prisma.medicationReminder.findMany({
        where: { scheduleId: testSchedule.id },
        orderBy: { scheduledAt: 'asc' },
      });

      const finalRecords = await prisma.medicationRecord.findMany({
        where: {
          catId: testCat.id,
          medicationId: testMedication.id,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lt: new Date('2024-01-16T00:00:00Z'),
          },
        },
        orderBy: { administeredAt: 'asc' },
      });

      // Verify schedule integrity
      expect(finalSchedule).not.toBeNull();
      expect(finalSchedule?.cat.name).toBe('テスト猫');
      expect(finalSchedule?.medication.name).toBe('テスト薬');

      // Verify reminders integrity
      expect(finalReminders).toHaveLength(2);
      expect(finalReminders[0].status).toBe(ReminderStatus.ACKNOWLEDGED);
      expect(finalReminders[1].status).toBe(ReminderStatus.DISMISSED);

      // Verify records integrity
      expect(finalRecords).toHaveLength(2);
      expect(finalRecords[0].status).toBe(MedicationStatus.ADMINISTERED);
      expect(finalRecords[1].status).toBe(MedicationStatus.SKIPPED);
    });

    it('should handle medication schedule updates and cascade effects', async () => {
      // Create initial schedule
      testSchedule = await prisma.medicationSchedule.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          frequency: 'daily',
          times: JSON.stringify(['08:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      // Create reminder based on initial schedule
      const initialReminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T08:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      // Update schedule to twice daily
      const updatedSchedule = await prisma.medicationSchedule.update({
        where: { id: testSchedule.id },
        data: {
          frequency: 'twice_daily',
          times: JSON.stringify(['08:00', '20:00']),
        },
      });

      expect(updatedSchedule.frequency).toBe('twice_daily');
      expect(JSON.parse(updatedSchedule.times)).toEqual(['08:00', '20:00']);

      // Create new reminder for evening dose
      const eveningReminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T20:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      // Verify all reminders are linked to updated schedule
      const allReminders = await prisma.medicationReminder.findMany({
        where: { scheduleId: testSchedule.id },
        include: {
          schedule: true,
        },
      });

      expect(allReminders).toHaveLength(2);
      allReminders.forEach((reminder) => {
        expect(reminder.schedule.frequency).toBe('twice_daily');
        expect(JSON.parse(reminder.schedule.times)).toEqual(['08:00', '20:00']);
      });
    });

    it('should handle medication deletion with proper cascade cleanup', async () => {
      // Create complete medication workflow
      testSchedule = await prisma.medicationSchedule.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          frequency: 'daily',
          times: JSON.stringify(['08:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      const reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T08:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      const record = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:00:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });

      // Verify all entities exist
      expect(await prisma.medication.findUnique({ where: { id: testMedication.id } })).not.toBeNull();
      expect(await prisma.medicationSchedule.findUnique({ where: { id: testSchedule.id } })).not.toBeNull();
      expect(await prisma.medicationReminder.findUnique({ where: { id: reminder.id } })).not.toBeNull();
      expect(await prisma.medicationRecord.findUnique({ where: { id: record.id } })).not.toBeNull();

      // Delete medication with proper cascade
      await prisma.$transaction(async (tx) => {
        // Delete reminders first
        await tx.medicationReminder.deleteMany({
          where: { medicationId: testMedication.id },
        });

        // Delete schedules
        await tx.medicationSchedule.deleteMany({
          where: { medicationId: testMedication.id },
        });

        // Note: Records are kept for historical purposes in real app
        // but for test cleanup we delete them
        await tx.medicationRecord.deleteMany({
          where: { medicationId: testMedication.id },
        });

        // Finally delete the medication
        await tx.medication.delete({
          where: { id: testMedication.id },
        });
      });

      // Verify all entities are deleted
      expect(await prisma.medication.findUnique({ where: { id: testMedication.id } })).toBeNull();
      expect(await prisma.medicationSchedule.findUnique({ where: { id: testSchedule.id } })).toBeNull();
      expect(await prisma.medicationReminder.findUnique({ where: { id: reminder.id } })).toBeNull();
      expect(await prisma.medicationRecord.findUnique({ where: { id: record.id } })).toBeNull();
    });
  });

  describe('Multi-Cat Medication Management Integration', () => {
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

    it('should handle medication administration for multiple cats', async () => {
      // Create schedules for both cats with same medication
      const schedule1 = await prisma.medicationSchedule.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          frequency: 'daily',
          times: JSON.stringify(['08:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      const schedule2 = await prisma.medicationSchedule.create({
        data: {
          catId: secondCat.id,
          medicationId: testMedication.id,
          frequency: 'twice_daily',
          times: JSON.stringify(['08:00', '20:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      // Create reminders for both cats
      const cat1Reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: schedule1.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T08:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      const cat2MorningReminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: schedule2.id,
          catId: secondCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T08:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      const cat2EveningReminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: schedule2.id,
          catId: secondCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T20:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      // Administer medication to both cats
      const cat1Record = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:05:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });

      const cat2MorningRecord = await prisma.medicationRecord.create({
        data: {
          catId: secondCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:10:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });

      const cat2EveningRecord = await prisma.medicationRecord.create({
        data: {
          catId: secondCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T20:05:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });

      // Verify cat-specific filtering works
      const cat1Records = await prisma.medicationRecord.findMany({
        where: { catId: testCat.id },
        include: { cat: true, medication: true },
      });

      const cat2Records = await prisma.medicationRecord.findMany({
        where: { catId: secondCat.id },
        include: { cat: true, medication: true },
      });

      expect(cat1Records).toHaveLength(1);
      expect(cat1Records[0].cat.name).toBe('テスト猫');

      expect(cat2Records).toHaveLength(2);
      expect(cat2Records[0].cat.name).toBe('テスト猫2');
      expect(cat2Records[1].cat.name).toBe('テスト猫2');

      // Verify combined view
      const allRecords = await prisma.medicationRecord.findMany({
        where: {
          medicationId: testMedication.id,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lt: new Date('2024-01-16T00:00:00Z'),
          },
        },
        include: { cat: true, medication: true },
        orderBy: { administeredAt: 'asc' },
      });

      expect(allRecords).toHaveLength(3);
      expect(allRecords[0].cat.name).toBe('テスト猫');
      expect(allRecords[1].cat.name).toBe('テスト猫2');
      expect(allRecords[2].cat.name).toBe('テスト猫2');
    });

    it('should handle cat-specific schedule management', async () => {
      // Create different medications for each cat
      const medication2 = await prisma.medication.create({
        data: {
          name: 'テスト薬2',
          type: MedicationType.SUPPLEMENT,
          description: 'テスト用のサプリメント',
          dosage: '1日1回',
        },
      });

      // Create cat-specific schedules
      const cat1Schedule = await prisma.medicationSchedule.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          frequency: 'daily',
          times: JSON.stringify(['08:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      const cat2Schedule = await prisma.medicationSchedule.create({
        data: {
          catId: secondCat.id,
          medicationId: medication2.id,
          frequency: 'weekly',
          times: JSON.stringify(['10:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      // Verify cat-specific schedule filtering
      const cat1Schedules = await prisma.medicationSchedule.findMany({
        where: { catId: testCat.id },
        include: { cat: true, medication: true },
      });

      const cat2Schedules = await prisma.medicationSchedule.findMany({
        where: { catId: secondCat.id },
        include: { cat: true, medication: true },
      });

      expect(cat1Schedules).toHaveLength(1);
      expect(cat1Schedules[0].medication.name).toBe('テスト薬');
      expect(cat1Schedules[0].frequency).toBe('daily');

      expect(cat2Schedules).toHaveLength(1);
      expect(cat2Schedules[0].medication.name).toBe('テスト薬2');
      expect(cat2Schedules[0].frequency).toBe('weekly');

      // Verify cross-cat medication usage
      const medicationUsage = await prisma.medicationSchedule.groupBy({
        by: ['medicationId'],
        _count: {
          catId: true,
        },
        where: {
          medicationId: {
            in: [testMedication.id, medication2.id],
          },
        },
      });

      expect(medicationUsage).toHaveLength(2);
      const testMedUsage = medicationUsage.find(u => u.medicationId === testMedication.id);
      const testMed2Usage = medicationUsage.find(u => u.medicationId === medication2.id);

      expect(testMedUsage?._count.catId).toBe(1);
      expect(testMed2Usage?._count.catId).toBe(1);
    });
  });

  describe('Calendar-based Medication Management Integration', () => {
    it('should handle date-based medication record queries', async () => {
      // Create records across multiple days
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
            administeredAt: new Date('2024-01-15T20:00:00Z'),
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

      // Query records for specific date
      const jan15Records = await prisma.medicationRecord.findMany({
        where: {
          catId: testCat.id,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lt: new Date('2024-01-16T00:00:00Z'),
          },
        },
        orderBy: { administeredAt: 'asc' },
      });

      expect(jan15Records).toHaveLength(2);
      expect(jan15Records[0].administeredAt.getUTCHours()).toBe(8);
      expect(jan15Records[1].administeredAt.getUTCHours()).toBe(20);

      // Query records for date range
      const weekRecords = await prisma.medicationRecord.findMany({
        where: {
          catId: testCat.id,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lt: new Date('2024-01-18T00:00:00Z'),
          },
        },
        orderBy: { administeredAt: 'asc' },
      });

      expect(weekRecords).toHaveLength(4);

      // Group records by date
      const recordsByDate = weekRecords.reduce((acc, record) => {
        const date = record.administeredAt.toISOString().split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(record);
        return acc;
      }, {} as Record<string, typeof weekRecords>);

      expect(Object.keys(recordsByDate)).toHaveLength(3);
      expect(recordsByDate['2024-01-15']).toHaveLength(2);
      expect(recordsByDate['2024-01-16']).toHaveLength(1);
      expect(recordsByDate['2024-01-17']).toHaveLength(1);

      // Query records by status for calendar indicators
      const administeredCount = await prisma.medicationRecord.count({
        where: {
          catId: testCat.id,
          status: MedicationStatus.ADMINISTERED,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lt: new Date('2024-01-18T00:00:00Z'),
          },
        },
      });

      const pendingCount = await prisma.medicationRecord.count({
        where: {
          catId: testCat.id,
          status: MedicationStatus.PENDING,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lt: new Date('2024-01-18T00:00:00Z'),
          },
        },
      });

      expect(administeredCount).toBe(2);
      expect(pendingCount).toBe(1);
    });

    it('should handle multiple daily administrations', async () => {
      // Create schedule with multiple daily times
      testSchedule = await prisma.medicationSchedule.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          frequency: 'three_times_daily',
          times: JSON.stringify(['08:00', '14:00', '20:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      // Create records for all three times
      const morningRecord = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:00:00Z'),
          status: MedicationStatus.ADMINISTERED,
          notes: '朝の投与',
        },
      });

      const afternoonRecord = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T14:00:00Z'),
          status: MedicationStatus.ADMINISTERED,
          notes: '昼の投与',
        },
      });

      const eveningRecord = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T20:00:00Z'),
          status: MedicationStatus.PENDING,
          notes: '夜の投与予定',
        },
      });

      // Query and group by time periods
      const dayRecords = await prisma.medicationRecord.findMany({
        where: {
          catId: testCat.id,
          administeredAt: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lt: new Date('2024-01-16T00:00:00Z'),
          },
        },
        orderBy: { administeredAt: 'asc' },
      });

      expect(dayRecords).toHaveLength(3);

      // Group by time periods (morning, afternoon, evening)
      const timeGroups = dayRecords.reduce((acc, record) => {
        const hour = record.administeredAt.getHours();
        let period: string;
        if (hour < 12) period = 'morning';
        else if (hour < 18) period = 'afternoon';
        else period = 'evening';

        if (!acc[period]) acc[period] = [];
        acc[period].push(record);
        return acc;
      }, {} as Record<string, typeof dayRecords>);

      expect(timeGroups.morning).toHaveLength(1);
      expect(timeGroups.afternoon).toHaveLength(1);
      expect(timeGroups.evening).toHaveLength(1);

      expect(timeGroups.morning[0].status).toBe(MedicationStatus.ADMINISTERED);
      expect(timeGroups.afternoon[0].status).toBe(MedicationStatus.ADMINISTERED);
      expect(timeGroups.evening[0].status).toBe(MedicationStatus.PENDING);
    });
  });

  describe('Reminder System Integration', () => {
    it('should handle reminder lifecycle with medication records', async () => {
      // Create schedule
      testSchedule = await prisma.medicationSchedule.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          frequency: 'daily',
          times: JSON.stringify(['08:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      // Create reminder
      const reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-15T08:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      // Acknowledge reminder and create record
      await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: { status: ReminderStatus.ACKNOWLEDGED },
      });

      const record = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 1,
          administeredAt: new Date('2024-01-15T08:05:00Z'),
          status: MedicationStatus.ADMINISTERED,
        },
      });

      // Verify reminder-record relationship
      const reminderWithSchedule = await prisma.medicationReminder.findUnique({
        where: { id: reminder.id },
        include: {
          schedule: {
            include: {
              cat: true,
              medication: true,
            },
          },
        },
      });

      const relatedRecord = await prisma.medicationRecord.findFirst({
        where: {
          catId: testCat.id,
          medicationId: testMedication.id,
          administeredAt: {
            gte: new Date('2024-01-15T08:00:00Z'),
            lt: new Date('2024-01-15T09:00:00Z'),
          },
        },
      });

      expect(reminderWithSchedule?.status).toBe(ReminderStatus.ACKNOWLEDGED);
      expect(reminderWithSchedule?.schedule.cat.name).toBe('テスト猫');
      expect(reminderWithSchedule?.schedule.medication.name).toBe('テスト薬');
      expect(relatedRecord?.status).toBe(MedicationStatus.ADMINISTERED);
    });

    it('should handle overdue reminders and missed medications', async () => {
      // Create schedule
      testSchedule = await prisma.medicationSchedule.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          frequency: 'daily',
          times: JSON.stringify(['08:00']),
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });

      // Create overdue reminder (scheduled for yesterday)
      const overdueReminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date('2024-01-14T08:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      });

      // Create missed medication record
      const missedRecord = await prisma.medicationRecord.create({
        data: {
          catId: testCat.id,
          medicationId: testMedication.id,
          quantity: 0,
          administeredAt: new Date('2024-01-14T08:00:00Z'),
          status: MedicationStatus.MISSED,
          notes: '投与を忘れました',
        },
      });

      // Update reminder status
      await prisma.medicationReminder.update({
        where: { id: overdueReminder.id },
        data: { status: ReminderStatus.DISMISSED },
      });

      // Query overdue/missed items
      const overdueReminders = await prisma.medicationReminder.findMany({
        where: {
          scheduledAt: {
            lt: new Date('2024-01-15T00:00:00Z'),
          },
          status: ReminderStatus.DISMISSED,
        },
        include: {
          cat: true,
          medication: true,
        },
      });

      const missedRecords = await prisma.medicationRecord.findMany({
        where: {
          status: MedicationStatus.MISSED,
          administeredAt: {
            lt: new Date('2024-01-15T00:00:00Z'),
          },
        },
        include: {
          cat: true,
          medication: true,
        },
      });

      expect(overdueReminders).toHaveLength(1);
      expect(overdueReminders[0].cat.name).toBe('テスト猫');
      expect(overdueReminders[0].medication.name).toBe('テスト薬');

      expect(missedRecords).toHaveLength(1);
      expect(missedRecords[0].status).toBe(MedicationStatus.MISSED);
      expect(missedRecords[0].notes).toBe('投与を忘れました');
    });
  });
});
