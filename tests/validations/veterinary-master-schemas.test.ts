import { describe, it, expect } from 'vitest';
import {
  veterinaryHospitalSchema,
  veterinaryHospitalUpdateSchema,
  veterinaryDoctorSchema,
  veterinaryDoctorUpdateSchema,
  veterinarySearchSchema,
  veterinaryIdSchema,
} from '~/lib/validations/veterinary-master';

describe('veterinary-master validation schemas', () => {
  describe('veterinaryHospitalSchema', () => {
    it('正常な病院データを受け入れる', () => {
      const validData = {
        name: 'テスト動物病院',
        address: '東京都渋谷区1-1-1',
        phone: '03-1234-5678',
        memo: 'テストメモ',
      };

      const result = veterinaryHospitalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('必須項目の病院名が空の場合はエラーになる', () => {
      const invalidData = {
        name: '',
        address: '東京都渋谷区1-1-1',
      };

      const result = veterinaryHospitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('病院名は必須です');
      }
    });

    it('病院名が100文字を超える場合はエラーになる', () => {
      const invalidData = {
        name: 'a'.repeat(101),
      };

      const result = veterinaryHospitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('病院名は100文字以内で入力してください');
      }
    });

    it('住所が200文字を超える場合はエラーになる', () => {
      const invalidData = {
        name: 'テスト動物病院',
        address: 'a'.repeat(201),
      };

      const result = veterinaryHospitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('住所は200文字以内で入力してください');
      }
    });

    it('電話番号に不正な文字が含まれる場合はエラーになる', () => {
      const invalidData = {
        name: 'テスト動物病院',
        phone: '03-1234-5678abc',
      };

      const result = veterinaryHospitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('電話番号は数字、ハイフン、括弧のみ使用できます');
      }
    });

    it('メモが500文字を超える場合はエラーになる', () => {
      const invalidData = {
        name: 'テスト動物病院',
        memo: 'a'.repeat(501),
      };

      const result = veterinaryHospitalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('メモは500文字以内で入力してください');
      }
    });

    it('任意項目が空文字列の場合は受け入れる', () => {
      const validData = {
        name: 'テスト動物病院',
        address: '',
        phone: '',
        memo: '',
      };

      const result = veterinaryHospitalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('veterinaryDoctorSchema', () => {
    it('正常な先生データを受け入れる', () => {
      const validData = {
        name: '田中先生',
        hospitalId: 'hospital-id-123',
        specialty: '内科',
        memo: 'テストメモ',
      };

      const result = veterinaryDoctorSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('必須項目の先生名が空の場合はエラーになる', () => {
      const invalidData = {
        name: '',
        hospitalId: 'hospital-id-123',
      };

      const result = veterinaryDoctorSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('先生名は必須です');
      }
    });

    it('先生名が50文字を超える場合はエラーになる', () => {
      const invalidData = {
        name: 'a'.repeat(51),
      };

      const result = veterinaryDoctorSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('先生名は50文字以内で入力してください');
      }
    });

    it('専門分野が100文字を超える場合はエラーになる', () => {
      const invalidData = {
        name: '田中先生',
        specialty: 'a'.repeat(101),
      };

      const result = veterinaryDoctorSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('専門分野は100文字以内で入力してください');
      }
    });

    it('任意項目が空文字列の場合は受け入れる', () => {
      const validData = {
        name: '田中先生',
        hospitalId: '',
        specialty: '',
        memo: '',
      };

      const result = veterinaryDoctorSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('veterinaryHospitalUpdateSchema', () => {
    it('IDを含む更新データを受け入れる', () => {
      const validData = {
        id: 'hospital-id-123',
        name: 'テスト動物病院',
        address: '東京都渋谷区1-1-1',
      };

      const result = veterinaryHospitalUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('IDが空の場合はエラーになる', () => {
      const invalidData = {
        id: '',
        name: 'テスト動物病院',
      };

      const result = veterinaryHospitalUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IDは必須です');
      }
    });
  });

  describe('veterinaryDoctorUpdateSchema', () => {
    it('IDを含む更新データを受け入れる', () => {
      const validData = {
        id: 'doctor-id-123',
        name: '田中先生',
        hospitalId: 'hospital-id-123',
      };

      const result = veterinaryDoctorUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('IDが空の場合はエラーになる', () => {
      const invalidData = {
        id: '',
        name: '田中先生',
      };

      const result = veterinaryDoctorUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IDは必須です');
      }
    });
  });

  describe('veterinarySearchSchema', () => {
    it('正常な検索パラメータを受け入れる', () => {
      const validData = {
        query: 'テスト',
        hospitalId: 'hospital-id-123',
        limit: 20,
        offset: 10,
      };

      const result = veterinarySearchSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('デフォルト値が適用される', () => {
      const validData = {};

      const result = veterinarySearchSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it('limitが範囲外の場合はエラーになる', () => {
      const invalidData = {
        limit: 101,
      };

      const result = veterinarySearchSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('offsetが負の値の場合はエラーになる', () => {
      const invalidData = {
        offset: -1,
      };

      const result = veterinarySearchSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('veterinaryIdSchema', () => {
    it('正常なIDを受け入れる', () => {
      const validData = {
        id: 'valid-id-123',
      };

      const result = veterinaryIdSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('IDが空の場合はエラーになる', () => {
      const invalidData = {
        id: '',
      };

      const result = veterinaryIdSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('IDは必須です');
      }
    });
  });
});
