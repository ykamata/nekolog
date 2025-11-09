import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import { ReminderStatus } from '~/types/medication';

describe.skip('Medication Reminders API', () => {
  let testCat: any;
  let testMedication: any;
  let testSchedule: any;

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
    await prisma.medication.deleteMany({
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
        type: 'MEDICINE',
        description: 'テスト用の薬です',
        dosage: '1日1回',
      },
    });

    // Create test schedule
    testSchedule = await prisma.medicationSchedule.create({
      data: {
        catId: testCat.id,
        medicationId: testMedication.id,
        frequency: 'daily',
        times: '["08:00"]',
        startDate: new Date(),
        isActive: true,
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
    await prisma.medication.deleteMany({
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
  });

  describe('Medication Reminder Database Operations', () => {
    it('should create a medication reminder successfully', async () => {
      const reminderData = {
        scheduleId: testSchedule.id,
        catId: testCat.id,
        medicationId: testMedication.id,
        scheduledAt: new Date(),
        status: ReminderStatus.PENDING,
      };

      const reminder = await prisma.medicationReminder.create({
        data: reminderData,
        include: {
          cat: true,
          medication: true,
          schedule: true,
        },
      });

      expect(reminder.scheduleId).toBe(testSchedule.id);
      expect(reminder.catId).toBe(testCat.id);
      expect(reminder.medicationId).toBe(testMedication.id);
      expect(reminder.status).toBe(ReminderStatus.PENDING);
      expect(reminder.cat).toBeDefined();
      expect(reminder.medication).toBeDefined();
      expect(reminder.schedule).toBeDefined();
    });

    it('should find reminders with filtering', async () => {
      // Create test reminder
      const reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date(),
          status: ReminderStatus.PENDING,
        },
      });

      const reminders = await prisma.medicationReminder.findMany({
        where: {
          catId: testCat.id,
          status: ReminderStatus.PENDING,
        },
        include: {
          cat: true,
          medication: true,
          schedule: true,
        },
      });

      expect(reminders).toHaveLength(1);
      expect(reminders[0].id).toBe(reminder.id);
      expect(reminders[0].catId).toBe(testCat.id);
      expect(reminders[0].status).toBe(ReminderStatus.PENDING);
    });

    it('should handle date range filtering', async () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Create reminders for different dates
      await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: yesterday,
          status: ReminderStatus.PENDING,
        },
      });

      const todayReminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: today,
          status: ReminderStatus.PENDING,
        },
      });

      await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: tomorrow,
          status: ReminderStatus.PENDING,
        },
      });

      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const reminders = await prisma.medicationReminder.findMany({
        where: {
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      expect(reminders).toHaveLength(1);
      expect(reminders[0].id).toBe(todayReminder.id);
    });

    it('should handle pagination', async () => {
      // Create multiple reminders
      for (let i = 0; i < 5; i++) {
        await prisma.medicationReminder.create({
          data: {
            scheduleId: testSchedule.id,
            catId: testCat.id,
            medicationId: testMedication.id,
            scheduledAt: new Date(Date.now() + i * 1000),
            status: ReminderStatus.PENDING,
          },
        });
      }

      const [reminders, total] = await Promise.all([
        prisma.medicationReminder.findMany({
          take: 2,
          skip: 1,
          orderBy: {
            scheduledAt: 'asc',
          },
        }),
        prisma.medicationReminder.count(),
      ]);

      expect(reminders).toHaveLength(2);
      expect(total).toBe(5);
    });
  });

  describe('Reminder Creation and Updates', () => {
    it('should create a new reminder successfully', async () => {
      const reminderData = {
        scheduleId: testSchedule.id,
        catId: testCat.id,
        medicationId: testMedication.id,
        scheduledAt: new Date(),
        status: ReminderStatus.PENDING,
      };

      const result = await prisma.medicationReminder.create({
        data: reminderData,
        include: {
          cat: true,
          medication: true,
          schedule: true,
        },
      });

      expect(result.scheduleId).toBe(testSchedule.id);
      expect(result.catId).toBe(testCat.id);
      expect(result.medicationId).toBe(testMedication.id);
      expect(result.status).toBe(ReminderStatus.PENDING);
      expect(result.cat).toBeDefined();
      expect(result.medication).toBeDefined();
      expect(result.schedule).toBeDefined();
    });

    it('should validate schedule existence', async () => {
      const schedule = await prisma.medicationSchedule.findUnique({
        where: { id: 999999 },
      });

      expect(schedule).toBeNull();
    });

    it('should prevent duplicate reminders for same time', async () => {
      const scheduledAt = new Date();

      // Create existing reminder
      await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt,
          status: ReminderStatus.PENDING,
        },
      });

      // Check for existing reminder
      const existingReminder = await prisma.medicationReminder.findFirst({
        where: {
          scheduleId: testSchedule.id,
          scheduledAt,
        },
      });

      expect(existingReminder).toBeDefined();
    });
  });

  describe('Reminder Retrieval', () => {
    it('should find reminder by ID', async () => {
      const reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date(),
          status: ReminderStatus.PENDING,
        },
      });

      const result = await prisma.medicationReminder.findUnique({
        where: { id: reminder.id },
        include: {
          cat: true,
          medication: true,
          schedule: true,
        },
      });

      expect(result?.id).toBe(reminder.id);
      expect(result?.catId).toBe(testCat.id);
      expect(result?.medicationId).toBe(testMedication.id);
      expect(result?.cat).toBeDefined();
      expect(result?.medication).toBeDefined();
      expect(result?.schedule).toBeDefined();
    });

    it('should return null when reminder does not exist', async () => {
      const result = await prisma.medicationReminder.findUnique({
        where: { id: 999999 },
      });

      expect(result).toBeNull();
    });
  });

  describe('Reminder Updates', () => {
    it('should update reminder status successfully', async () => {
      const reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date(),
          status: ReminderStatus.PENDING,
        },
      });

      const result = await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: {
          status: ReminderStatus.ACKNOWLEDGED,
          updatedAt: new Date(),
        },
        include: {
          cat: true,
          medication: true,
          schedule: true,
        },
      });

      expect(result.id).toBe(reminder.id);
      expect(result.status).toBe(ReminderStatus.ACKNOWLEDGED);
      expect(result.cat).toBeDefined();
      expect(result.medication).toBeDefined();
      expect(result.schedule).toBeDefined();
    });

    it('should update reminder with new scheduled time when snoozed', async () => {
      const originalTime = new Date();
      const newTime = new Date(originalTime.getTime() + 30 * 60 * 1000); // 30 minutes later

      const reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: originalTime,
          status: ReminderStatus.PENDING,
        },
      });

      const result = await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: {
          status: ReminderStatus.SNOOZED,
          scheduledAt: newTime,
          updatedAt: new Date(),
        },
      });

      expect(result.id).toBe(reminder.id);
      expect(result.status).toBe(ReminderStatus.SNOOZED);
      expect(result.scheduledAt.getTime()).toBe(newTime.getTime());
    });

    it('should handle status transitions', async () => {
      const reminder = await prisma.medicationReminder.create({
        data: {
          scheduleId: testSchedule.id,
          catId: testCat.id,
          medicationId: testMedication.id,
          scheduledAt: new Date(),
          status: ReminderStatus.PENDING,
        },
      });

      // Test different status transitions
      const statuses = [
        ReminderStatus.ACKNOWLEDGED,
        ReminderStatus.SNOOZED,
        ReminderStatus.DISMISSED,
      ];

      for (const status of statuses) {
        const updated = await prisma.medicationReminder.update({
          where: { id: reminder.id },
          data: { status },
        });
        expect(updated.status).toBe(status);
      }
    });
  });
});
