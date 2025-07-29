import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  MedicationInputSchema,
  MedicationUpdateSchema,
  MedicationRecordInputSchema,
  MedicationScheduleInputSchema,
  MedicationReminderInputSchema,
  MedicationFilterSchema,
  MedicationRecordFilterSchema,
  validateMedicationInput,
  validateMedicationRecordInput,
  validateMedicationScheduleInput,
  validateMedicationReminderInput,
} from '~/lib/validations/medication';
import { MedicationType, MedicationStatus } from '~/types/medication';

describe('Medication Validation Schemas', () => {
  describe('MedicationInputSchema', () => {
    it('should validate valid medication input', () => {
      const validInput = {
        name: 'テスト薬',
        type: MedicationType.MEDICINE,
        description: 'テスト用の薬です',
        dosage: '1日1回',
      };

      const result = MedicationInputSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate medication input with minimal required fields', () => {
      const minimalInput = {
        name: 'テスト薬',
        type: MedicationType.SUPPLEMENT,
      };

      const result = MedicationInputSchema.parse(minimalInput);
      expect(result.name).toBe('テスト薬');
      expect(result.type).toBe(MedicationType.SUPPLEMENT);
    });

    it('should trim whitespace from string fields', () => {
      const inputWithWhitespace = {
        name: '  テスト薬  ',
        type: MedicationType.VITAMIN,
        description: '  説明  ',
        dosage: '  1日1回  ',
      };

      const result = MedicationInputSchema.parse(inputWithWhitespace);
      expect(result.name).toBe('テスト薬');
      expect(result.description).toBe('説明');
      expect(result.dosage).toBe('1日1回');
    });

    it('should reject empty name', () => {
      const invalidInput = {
        name: '',
        type: MedicationType.MEDICINE,
      };

      expect(() => MedicationInputSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject name longer than 100 characters', () => {
      const invalidInput = {
        name: 'a'.repeat(101),
        type: MedicationType.MEDICINE,
      };

      expect(() => MedicationInputSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject invalid medication type', () => {
      const invalidInput = {
        name: 'テスト薬',
        type: 'INVALID_TYPE',
      };

      expect(() => MedicationInputSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject description longer than 500 characters', () => {
      const invalidInput = {
        name: 'テスト薬',
        type: MedicationType.MEDICINE,
        description: 'a'.repeat(501),
      };

      expect(() => MedicationInputSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject dosage longer than 100 characters', () => {
      const invalidInput = {
        name: 'テスト薬',
        type: MedicationType.MEDICINE,
        dosage: 'a'.repeat(101),
      };

      expect(() => MedicationInputSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should handle empty strings as undefined for optional fields', () => {
      const inputWithEmptyStrings = {
        name: 'テスト薬',
        type: MedicationType.MEDICINE,
        description: '',
        dosage: '',
      };

      const result = MedicationInputSchema.parse(inputWithEmptyStrings);
      expect(result.description).toBe('');
      expect(result.dosage).toBe('');
    });
  });

  describe('MedicationUpdateSchema', () => {
    it('should validate partial medication update', () => {
      const partialUpdate = {
        name: '更新された薬名',
      };

      const result = MedicationUpdateSchema.parse(partialUpdate);
      expect(result.name).toBe('更新された薬名');
    });

    it('should validate empty update object', () => {
      const emptyUpdate = {};

      const result = MedicationUpdateSchema.parse(emptyUpdate);
      expect(result).toEqual({});
    });
  });

  describe('MedicationRecordInputSchema', () => {
    it('should validate valid medication record input', () => {
      const validInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 2,
        administeredAt: new Date('2024-01-01T08:00:00Z'),
        status: MedicationStatus.ADMINISTERED,
        notes: 'テストメモ',
      };

      const result = MedicationRecordInputSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate medication record with minimal required fields', () => {
      const minimalInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-01T08:00:00Z'),
      };

      const result = MedicationRecordInputSchema.parse(minimalInput);
      expect(result.catId).toBe('cat-1');
      expect(result.medicationId).toBe('med-1');
      expect(result.quantity).toBe(1);
    });

    it('should reject empty catId', () => {
      const invalidInput = {
        catId: '',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date(),
      };

      expect(() => MedicationRecordInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject empty medicationId', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: '',
        quantity: 1,
        administeredAt: new Date(),
      };

      expect(() => MedicationRecordInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject quantity less than 1', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 0,
        administeredAt: new Date(),
      };

      expect(() => MedicationRecordInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject quantity greater than 100', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 101,
        administeredAt: new Date(),
      };

      expect(() => MedicationRecordInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject non-integer quantity', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1.5,
        administeredAt: new Date(),
      };

      expect(() => MedicationRecordInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject invalid date', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: 'invalid-date',
      };

      expect(() => MedicationRecordInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject notes longer than 500 characters', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date(),
        notes: 'a'.repeat(501),
      };

      expect(() => MedicationRecordInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });
  });

  describe('MedicationScheduleInputSchema', () => {
    it('should validate valid medication schedule input', () => {
      const validInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'daily',
        times: ['08:00', '20:00'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const result = MedicationScheduleInputSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate schedule without end date', () => {
      const validInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'twice_daily',
        times: ['08:00', '20:00'],
        startDate: new Date('2024-01-01'),
      };

      const result = MedicationScheduleInputSchema.parse(validInput);
      expect(result.endDate).toBeUndefined();
    });

    it('should reject invalid frequency', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'invalid_frequency',
        times: ['08:00'],
        startDate: new Date('2024-01-01'),
      };

      expect(() => MedicationScheduleInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject invalid time format', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'daily',
        times: ['25:00'], // Invalid hour
        startDate: new Date('2024-01-01'),
      };

      expect(() => MedicationScheduleInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject empty times array', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'daily',
        times: [],
        startDate: new Date('2024-01-01'),
      };

      expect(() => MedicationScheduleInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject more than 10 times', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'daily',
        times: Array(11).fill('08:00'),
        startDate: new Date('2024-01-01'),
      };

      expect(() => MedicationScheduleInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });

    it('should reject end date before start date', () => {
      const invalidInput = {
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'daily',
        times: ['08:00'],
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'),
      };

      expect(() => MedicationScheduleInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });
  });

  describe('MedicationReminderInputSchema', () => {
    it('should validate valid medication reminder input', () => {
      const validInput = {
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: new Date('2024-01-01T08:00:00Z'),
      };

      const result = MedicationReminderInputSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should reject empty scheduleId', () => {
      const invalidInput = {
        scheduleId: '',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: new Date(),
      };

      expect(() => MedicationReminderInputSchema.parse(invalidInput)).toThrow(
        ZodError,
      );
    });
  });

  describe('Filter Schemas', () => {
    describe('MedicationFilterSchema', () => {
      it('should validate valid filter', () => {
        const validFilter = {
          name: 'テスト',
          type: MedicationType.MEDICINE,
          limit: 10,
          offset: 0,
        };

        const result = MedicationFilterSchema.parse(validFilter);
        expect(result).toEqual(validFilter);
      });

      it('should validate empty filter', () => {
        const emptyFilter = {};

        const result = MedicationFilterSchema.parse(emptyFilter);
        expect(result).toEqual({});
      });

      it('should reject limit greater than 100', () => {
        const invalidFilter = {
          limit: 101,
        };

        expect(() => MedicationFilterSchema.parse(invalidFilter)).toThrow(
          ZodError,
        );
      });

      it('should reject negative offset', () => {
        const invalidFilter = {
          offset: -1,
        };

        expect(() => MedicationFilterSchema.parse(invalidFilter)).toThrow(
          ZodError,
        );
      });
    });

    describe('MedicationRecordFilterSchema', () => {
      it('should validate valid filter with date range', () => {
        const validFilter = {
          catId: 'cat-1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          status: MedicationStatus.ADMINISTERED,
        };

        const result = MedicationRecordFilterSchema.parse(validFilter);
        expect(result).toEqual(validFilter);
      });

      it('should reject end date before start date', () => {
        const invalidFilter = {
          startDate: new Date('2024-01-31'),
          endDate: new Date('2024-01-01'),
        };

        expect(() => MedicationRecordFilterSchema.parse(invalidFilter)).toThrow(
          ZodError,
        );
      });

      it('should allow end date equal to start date', () => {
        const validFilter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-01'),
        };

        const result = MedicationRecordFilterSchema.parse(validFilter);
        expect(result.startDate).toEqual(result.endDate);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateMedicationInput', () => {
      it('should validate and return parsed medication input', () => {
        const input = {
          name: 'テスト薬',
          type: MedicationType.MEDICINE,
        };

        const result = validateMedicationInput(input);
        expect(result).toEqual(input);
      });

      it('should throw ZodError for invalid input', () => {
        const invalidInput = {
          name: '',
          type: 'INVALID',
        };

        expect(() => validateMedicationInput(invalidInput)).toThrow(ZodError);
      });
    });

    describe('validateMedicationRecordInput', () => {
      it('should validate and return parsed medication record input', () => {
        const input = {
          catId: 'cat-1',
          medicationId: 'med-1',
          quantity: 1,
          administeredAt: new Date(),
        };

        const result = validateMedicationRecordInput(input);
        expect(result.catId).toBe('cat-1');
        expect(result.medicationId).toBe('med-1');
        expect(result.quantity).toBe(1);
      });
    });

    describe('validateMedicationScheduleInput', () => {
      it('should validate and return parsed medication schedule input', () => {
        const input = {
          catId: 'cat-1',
          medicationId: 'med-1',
          frequency: 'daily',
          times: ['08:00'],
          startDate: new Date(),
        };

        const result = validateMedicationScheduleInput(input);
        expect(result.frequency).toBe('daily');
        expect(result.times).toEqual(['08:00']);
      });
    });

    describe('validateMedicationReminderInput', () => {
      it('should validate and return parsed medication reminder input', () => {
        const input = {
          scheduleId: 'schedule-1',
          catId: 'cat-1',
          medicationId: 'med-1',
          scheduledAt: new Date(),
        };

        const result = validateMedicationReminderInput(input);
        expect(result.scheduleId).toBe('schedule-1');
      });
    });
  });
});
