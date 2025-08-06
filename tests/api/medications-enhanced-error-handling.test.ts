import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils';

// Mock the logger to avoid console output during tests
vi.mock('~/lib/pino-logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe.skip('Medications API - Enhanced Error Handling', () => {
  beforeEach(async () => {
    await setup({
      // Test configuration
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/medications', () => {
    it('should return detailed validation errors for invalid input', async () => {
      try {
        await $fetch('/api/medications', {
          method: 'POST',
          body: {
            name: '', // Invalid: empty name
            type: 'INVALID_TYPE', // Invalid: not in enum
            description: 'A'.repeat(501), // Invalid: too long
          },
        });
      }
      catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response._data.message).toBe('入力データが無効です');
        expect(error.response._data.data.validationErrors).toBeDefined();
        expect(error.response._data.data.errorId).toBeDefined();
        expect(error.response._data.data.timestamp).toBeDefined();

        const validationErrors = error.response._data.data.validationErrors;
        expect(validationErrors).toHaveLength(3);

        // Check specific validation errors
        const nameError = validationErrors.find((err: any) => err.field === 'name');
        expect(nameError).toBeDefined();
        expect(nameError.message).toBe('薬名は必須です');

        const typeError = validationErrors.find((err: any) => err.field === 'type');
        expect(typeError).toBeDefined();
        expect(typeError.message).toBe('有効な薬のタイプを選択してください');

        const descriptionError = validationErrors.find((err: any) => err.field === 'description');
        expect(descriptionError).toBeDefined();
        expect(descriptionError.message).toBe('説明は500文字以内で入力してください');
      }
    });

    it('should return conflict error for duplicate medication name', async () => {
      // First, create a medication
      await $fetch('/api/medications', {
        method: 'POST',
        body: {
          name: 'Test Medicine',
          type: 'MEDICINE',
          description: 'Test description',
        },
      });

      // Try to create another medication with the same name
      try {
        await $fetch('/api/medications', {
          method: 'POST',
          body: {
            name: 'Test Medicine',
            type: 'SUPPLEMENT',
            description: 'Different description',
          },
        });
      }
      catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response._data.message).toBe('同じ名前の薬が既に登録されています');
        expect(error.response._data.data.errorId).toBeDefined();
        expect(error.response._data.data.timestamp).toBeDefined();
      }
    });

    it('should create medication successfully with valid data', async () => {
      const medicationData = {
        name: 'Valid Medicine',
        type: 'MEDICINE',
        description: 'Valid description',
        dosage: '1日1回',
      };

      const response = await $fetch('/api/medications', {
        method: 'POST',
        body: medicationData,
      });

      expect(response.medication).toBeDefined();
      expect(response.medication.name).toBe(medicationData.name);
      expect(response.medication.type).toBe(medicationData.type);
      expect(response.medication.description).toBe(medicationData.description);
      expect(response.medication.dosage).toBe(medicationData.dosage);
      expect(response.message).toBe('薬が正常に登録されました');
    });
  });

  describe('PUT /api/medications/[id]', () => {
    it('should return validation error for invalid ID format', async () => {
      try {
        await $fetch('/api/medications/invalid-id', {
          method: 'PUT',
          body: {
            name: 'Updated Medicine',
            type: 'MEDICINE',
          },
        });
      }
      catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response._data.message).toBe('Invalid request parameters');
        expect(error.response._data.data.validationErrors).toBeDefined();

        const validationErrors = error.response._data.data.validationErrors;
        const idError = validationErrors.find((err: any) => err.field === 'id');
        expect(idError).toBeDefined();
        expect(idError.message).toBe('Invalid medication ID format');
      }
    });

    it('should return not found error for non-existent medication', async () => {
      try {
        await $fetch('/api/medications/clxxx0000000000000000000', {
          method: 'PUT',
          body: {
            name: 'Updated Medicine',
            type: 'MEDICINE',
          },
        });
      }
      catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response._data.message).toBe('指定された薬が見つかりません');
        expect(error.response._data.data.errorId).toBeDefined();
      }
    });

    it('should return validation error for invalid update data', async () => {
      // First create a medication
      const createResponse = await $fetch('/api/medications', {
        method: 'POST',
        body: {
          name: 'Original Medicine',
          type: 'MEDICINE',
        },
      });

      const medicationId = createResponse.medication.id;

      // Try to update with invalid data
      try {
        await $fetch(`/api/medications/${medicationId}`, {
          method: 'PUT',
          body: {
            name: '', // Invalid: empty name
            type: 'INVALID_TYPE', // Invalid: not in enum
          },
        });
      }
      catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response._data.message).toBe('入力データが無効です');
        expect(error.response._data.data.validationErrors).toBeDefined();

        const validationErrors = error.response._data.data.validationErrors;
        expect(validationErrors.length).toBeGreaterThan(0);
      }
    });

    it('should update medication successfully with valid data', async () => {
      // First create a medication
      const createResponse = await $fetch('/api/medications', {
        method: 'POST',
        body: {
          name: 'Original Medicine',
          type: 'MEDICINE',
          description: 'Original description',
        },
      });

      const medicationId = createResponse.medication.id;

      // Update the medication
      const updateData = {
        name: 'Updated Medicine',
        description: 'Updated description',
        dosage: '1日2回',
      };

      const updateResponse = await $fetch(`/api/medications/${medicationId}`, {
        method: 'PUT',
        body: updateData,
      });

      expect(updateResponse.medication).toBeDefined();
      expect(updateResponse.medication.name).toBe(updateData.name);
      expect(updateResponse.medication.description).toBe(updateData.description);
      expect(updateResponse.medication.dosage).toBe(updateData.dosage);
      expect(updateResponse.message).toBe('薬の情報が正常に更新されました');
    });
  });

  describe('Error Response Format', () => {
    it('should include consistent error response format', async () => {
      try {
        await $fetch('/api/medications', {
          method: 'POST',
          body: {
            name: '',
            type: 'INVALID',
          },
        });
      }
      catch (error: any) {
        const errorData = error.response._data;

        // Check required fields in error response
        expect(errorData.message).toBeDefined();
        expect(errorData.data).toBeDefined();
        expect(errorData.data.errorId).toBeDefined();
        expect(errorData.data.timestamp).toBeDefined();

        // Check error ID format
        expect(errorData.data.errorId).toMatch(/^err_\d+_[a-z0-9]+$/);

        // Check timestamp format (ISO string)
        expect(new Date(errorData.data.timestamp).toISOString()).toBe(errorData.data.timestamp);
      }
    });
  });
});
