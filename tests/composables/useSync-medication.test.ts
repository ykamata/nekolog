import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineStorage } from '~/utils/offline-storage';
import type {
  Medication,
  MedicationRecord,
  MedicationSchedule,
  MedicationReminder,
  MedicationType,
  MedicationStatus,
  ReminderStatus,
} from '~/types/medication';
import { json } from 'stream/consumers';
import { type } from 'os';
import { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';
import { off } from 'process';
import { type } from 'os';
import { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';
import { type } from 'os';
import { y } from 'happy-dom/lib/PropertySymbol.js';
import { json } from 'stream/consumers';
import { json } from 'stream/consumers';
import { type } from 'os';
import { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';
import { type } from 'os';
import { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';
import { type } from 'os';
import { type } from 'os';

// Mock $fetch
const mockFetch = vi.fn();
global.$fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Medication Data Synchronization', () => {
  let offlineStorage: OfflineStorage;

  const mockMedication: Medication = {
    id: 'med-1',
    name: 'テスト薬',
    type: 'MEDICINE' as MedicationType,
    description: 'テスト用の薬です',
    dosage: '1日1回',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMedicationRecord: MedicationRecord = {
    id: 'record-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    quantity: 1,
    administeredAt: new Date(),
    status: 'ADMINISTERED' as MedicationStatus,
    notes: 'テスト投与記録',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMedicationSchedule: MedicationSchedule = {
    id: 'schedule-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    frequency: 'daily',
    times: ['08:00', '20:00'],
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMedicationReminder: MedicationReminder = {
    id: 'reminder-1',
    scheduleId: 'schedule-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    scheduledAt: new Date(),
    status: 'PENDING' as ReminderStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    navigator.onLine = true;
    offlineStorage = OfflineStorage.getInstance();
    offlineStorage.clear();
  });

  afterEach(() => {
    offlineStorage.clear();
  });

  describe('Offline Storage Operations',{
    it('should add medication offline', () => {
      const medicationInput = {

        type: mockMedication.type,
        description: mockMedication.description,
        dosage: mockMedication.dosage,
      };

      const localId = offlineStorage.addMedicationOffline(medicationI);

      expect(localId).toMatch(/^local-medication-/);

      const medications = offlineStorage.getMedications();
      expect(medications).toHaveLength(1);
      expect(medications[0]).toMatchObject(medicationInput);

();
      expect(pendingData.medications).toHaveLen(1);
      expect(pendingData.medications[0].action
 });

    it('should add medication reco=> {
      const recordInput = {
        catId: mockMedicationRecord.catId,
        medicationId: mockMedicationReationId,
        y,
t,
        status: mockMedicationRecord.status,
ord.notes,
      };

      const localId = offlineStorage.addMedicationRecordOf;

      expect(localId).toMatch(/^local-medication-record-/);

cords();
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject(recordI);

      const pendingData = ocData();
      expect(pendingData.medicationRecordsh(1);
      expect(pendingData.medicationRecords[0].action).to
    });

    it('should add medication schedule offli> {
      const scheduleInput = {
        d,
d,
        frequency: mockMedicationSchedule.frequency,

        startDate: mockMedicationSchedule.startDate,
ate,
        isActive: mockMedicationSchedule.isActive,
      };

      ceInput);

      expect(localId).toMatch(/^local-medication-schedule-/);

les();
      expect(schedules).toHav(1);
      expect(schedules[0]).toMatchObject(schut);

      const pendingData = offlineStorage.getPendingSata();
      expect(pendingData.medicationSchedules;
      expect(pendingData.medicationSchedules[0].acti);
    });

    it('
 {
        scheduleId: mockMedicationReminder.scheduleId,

        medicationId: mockMedicationReminder.medicationId,

        status: mockMedicationReminder.status,
      };

      c;

      expect(localId).toMatch(/^local-medication-reminder-/);

();
      expect(reminders).toHav(1);
      expect(reminders[0]).toMatchObject(reminderInput;

      const pendingData = offlineStorage.getPendingSyncDat
      expect(pendingData.medicationReminders).toHaveLength(1);
      expect(pendingData.medicationReminders[0e');
    });

    it('should update medication offline', () => {

        name: 'Original Name',
ype,
      });

      const updates = {
        Name',

      };

s);

      const medications = offls();
      expect(medications[0].name).toBe('Upd
      expon');

      const pendingData
      expect(pendingData.mediupdate
    });

() => {
      const localId = offlineStorage.addMedicationOffline({
ion',
        type: 'MEDICINE' as MedicationType,
      });

      oId);

      const medications = offlineStorage.getMedica);
      expect(medications).toHaveLength(0);

      const pendingData = offlineStorage.getPendingSync;
      expect(pendingData.medicat
    });
  });

  describe('Data Synchronization Logic', () => {
{
      // Add various medication entities offline
      offlineStorage.addMedicationOffline({

     ,
);

      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',

        quantity: 1,
        administeredAt: new Date(),
        status: 'ADMINISTERED' a
      });

      offlineStorage.adffline({
        c: 'cat-1',
'med-1',
        frequency: 'daily',
        times: ],
        startDate: new Date(),
        isActive: true,
      });

      offlineStorage.addMedicationReminderOffline({
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: new Date(),
        status: 'PENDING' as ReminderStatus,
      });

      const pendingData = offlineStora
1);
      expect(pendingData.medicationRecor;
      expect(pendingData.medicationSchedules).toHave(1);
      expect(pendingData.medicationReminders).toHaveLength(1);
    });

    it('should update local to ser() => {
      const localId = offli
        name: 'Test Medication',
        type: 'MEDICINE' ype,
      });


      offlineStorage.updateLocalToServerId('medicatio

      const medications = offlineStorage.getMedicatio();
      eerverId);


    it('should remove pending sync items after successfu{
({
        name: 'Test Medication',
        type: 'MEDICINE' asnType,
      });

      let pendingDatta();
      expect(pendingData.medication

      offlineStorage.remove);

;
      expect(pendingData.medications).toHaveLength(0);
   });

    it('should ', () => {
      // Add multiple items
      offlineStorage.addMedicationOffline({
        name: 'Test Medication',
        type: 'MEDICINE' as MedicationType,
      });
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date(),
        status: 'ADMINISTERED' as MedicationStatus,
});


      expect(pendingData.medications.len(0);

      offlineStorage.cl);

      pencData();

      expect(pendingData.medicationRecords).toHaveLenth(0);
      expect(pendingData.medicationSchedules).toHaveLength(0);
      expect(pendingData.medicationReminders).toHave0);
    });

    it('should update from server with medication data', () => {
      const medications = [mockMedication];
ord];
      const medicationSchedules = [mockM;
      const medicationRemindeer];

      offlineStorage.updateFroer(
        [], // cats
        [], // foods
        [], // meals
        medications,


        medicationReminders,
   );

      expect(of
      expect(offlineStorage.getM);
      expect(offlineStorage.getMedicationSchedules()).toEqual(medicationSchules);
      expect(offlineStorage.grs);
    });

    it('should filter old medication data when updat> {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const oldRecord = {
        ...mockMedicationRecord,
',
        administeredAt: twoMonthsAgo,


      const recentRecord = {
        ...mockMedicatid,
        id: 'recent-record',
        ae(),
   };

      offlineStorage.updateFromServer(
        [], // cats
       s
eals
        [mockMedication],
        [oldRecord, recentRecord],
],
        [],
      );

      const records = o();
      expect(records).toHaveLe1);
      expect(records[0].id).toBe;
    });
  });

  describe('Data Filtering and Querying', () => {
> {
      // Add test data
      offlineSt
        name: 'Medication A',
        type: 'MEDICINE' as MedicationType,
      });
      offlineStorage.addMedicationOffline({
        name: 'Medication B',
        type: 'SUPPLEMENT' as MedicationType,
      });

      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
ty: 1,
        administeredAt: new Date(),
s,
      });
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-2',
        medicationId: 'med-1',
        q 2,
(),
        status: 'PENDING' as MedicationStatus,
      });
    });


      const cat1Records = offlineStorage.getMedicationRecords('c
      const cat2Records = offlineStorage.getMedicationRe');

      expect(cat1Records).toHaveLength(1);
      expect(cat2Records).toHaveLength(1);
      expect(cat1Records[0].ca);
      expect(cat2Records[0].catId).toBe('ca;
    });

    it('should filter medication records by medicat() => {
      const med1Records = off
      expect(med1Records).toHaveLength(2);
      exp);


    it('should
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 00);
      const tomorrow = new Da1000);

      // Add record for yesterday
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: yesterday,
        status: 'ADMINISTERED' as MedicationStatus,
      });

      const todayRecords = offlineStorords(
efined,
        undefined,
        today,

      );

      // Should includerday's
      expect(todayRecords.length).toBeG0);
      expect(todayRecords.every(e);
    });

    it('s
ffline({
        catId: 'cat-1',
        medicationId: med-1',
        frequency: 'daily',
        times: ['08:00'],
        startDate: new Date(),
        isA,
      });
      one({
cat-1',
        medicationId: 'med-2',
        frequency: 'daily',
'],
        startDate: new Date(),
        isActive: false,
      });

      con;


ength(1);
      expect(inactiveSchedules(1);
      expect(ac;
      expect(inactiveSchedules[0e);
    });

    it('should sort medication records by ad {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-03');

      // Clear existing records
      offlineStorage.clear();

      // Add in random order
{
        catId: 'cat-1',

        quantity: 1,
        administeredAt: date2,

      });
      offlineStorage.addM
        ccat-1',
       -1',

        administeredAt: date1,
        status: 'ADMINISTERED' as MedicationStatus,

      offlineStorage.addMedicat
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        a: date3,
atus,
      });

);

ngth(3);
      expect(new Date(records[0].administdate3);
      expect(new Date(records[1].administeredAt)(date2);
      expect(new Date(records[2].administ);
    });

    it('should sort medication reminders by schedule
      const time1 = new Date('2
      const time2 = new Date('2024-01-01T12:00:00Z');


      // Clear existing data
      offlineStorage.clear();

      //
rOffline({
        scheduleId: 'schedule-1',

        medicationId: 'med-1',
        scheduledAt: time2,
        status: 'PENDING' as ReminderStatus,
      };

        scheduleId: 'schedule-1',
        catId: 'cat-1',
,
        scheduledAt: time3,
        status:s,
      });
      offlineStorage.addMedicationReminderOffline({
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: time1,
        status: 'PENDING' as ReminderStatus,
   });

;

      expect(reminders).toHaveLength(3);
      expect(new Date(reminders[0].scheduledAt)).toEqual(time1);
      expect(new Date(reminders[1].scheduledAt)).toEqual(time2);
      expect(new Date(reminders[2].scheduledAt)).toEqual(time3);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
);
      });

      // Should not throw error
      expect(() => {
        o
          name: 'Test Medication',
          type: 'MEDICIype,
        });
      }).not.toThrow();
    });

    it('s
 json');

g
      expect(() => {
       e();
al([]);
      }).not.toThrow();
    });
  });
});
