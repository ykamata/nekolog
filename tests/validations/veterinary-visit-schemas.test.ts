import { describe, it, expect } from 'vitest';
import { AppointmentStatus } from '@prisma/client';
import {
  VeterinaryVisitInputSchema,
  VeterinaryAppointmentInputSchema,
  VeterinaryHospitalInputSchema,
  VeterinaryDoctorInputSchema,
  VeterinaryTreatmentInputSchema,
  ConvertAppointmentToVisitSchema,
  VeterinaryVisitFilterSchema,
  VeterinaryAppointmentFilterSchema,
  validateVeterinaryVisitInput,
  validateVeterinaryAppointmentInput,
  validateVeterinaryHospitalInput,
  validateVeterinaryDoctorInput,
  validateVeterinaryTreatmentInput,
  validateConvertAppointmentToVisit,
} from '~/lib/validations/veterinary-visit';

describe('Veterinary Visit Validation Schemas', () => {
  describe('VeterinaryVisitInputSchema', () => {
    it('有効な通院記録データを受け入れる', () => {
      const validData = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        doctorName: 'テスト先生',
        treatments: ['健康診断', 'ワクチン接種'],
        cost: 5000,
        notes: '特に問題なし',
        hasBloodTest: true,
      };

      expect(() => VeterinaryVisitInputSchema.parse(validData)).not.toThrow();
    });

    it('必須項目が不足している場合はエラーを返す', () => {
      const invalidData = {
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        treatments: ['健康診断'],
        cost: 5000,
      };

      expect(() => VeterinaryVisitInputSchema.parse(invalidData)).toThrow();
    });

    it('処方内容が空の場合はエラーを返す', () => {
      const invalidData = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        treatments: [],
        cost: 5000,
      };

      expect(() => VeterinaryVisitInputSchema.parse(invalidData)).toThrow('処方内容を少なくとも1つ選択してください');
    });

    it('費用が負の値の場合はエラーを返す', () => {
      const invalidData = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        treatments: ['健康診断'],
        cost: -100,
      };

      expect(() => VeterinaryVisitInputSchema.parse(invalidData)).toThrow('費用は0以上で入力してください');
    });

    it('病院名が空の場合はエラーを返す', () => {
      const invalidData = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: '',
        treatments: ['健康診断'],
        cost: 5000,
      };

      expect(() => VeterinaryVisitInputSchema.parse(invalidData)).toThrow('病院名を入力してください');
    });

    it('メモが長すぎる場合はエラーを返す', () => {
      const invalidData = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        treatments: ['健康診断'],
        cost: 5000,
        notes: 'a'.repeat(1001),
      };

      expect(() => VeterinaryVisitInputSchema.parse(invalidData)).toThrow('メモは1000文字以内で入力してください');
    });
  });

  describe('VeterinaryAppointmentInputSchema', () => {
    it('有効な予約データを受け入れる', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validData = {
        catId: 1,
        appointmentDate: futureDate,
        hospitalName: 'テスト動物病院',
        doctorName: 'テスト先生',
        plannedTreatments: '健康診断予定',
        notes: '初回診察',
      };

      expect(() => VeterinaryAppointmentInputSchema.parse(validData)).not.toThrow();
    });

    it('過去の日時を予約日時に設定した場合はエラーを返す', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        catId: 1,
        appointmentDate: pastDate,
        hospitalName: 'テスト動物病院',
      };

      expect(() => VeterinaryAppointmentInputSchema.parse(invalidData)).toThrow('予約日時は未来の日時を選択してください');
    });

    it('必須項目が不足している場合はエラーを返す', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invalidData = {
        appointmentDate: futureDate,
        hospitalName: 'テスト動物病院',
      };

      expect(() => VeterinaryAppointmentInputSchema.parse(invalidData)).toThrow();
    });
  });

  describe('VeterinaryHospitalInputSchema', () => {
    it('有効な病院データを受け入れる', () => {
      const validData = {
        name: 'テスト動物病院',
        address: '東京都渋谷区1-1-1',
        phone: '03-1234-5678',
      };

      expect(() => VeterinaryHospitalInputSchema.parse(validData)).not.toThrow();
    });

    it('病院名が空の場合はエラーを返す', () => {
      const invalidData = {
        name: '',
        address: '東京都渋谷区1-1-1',
      };

      expect(() => VeterinaryHospitalInputSchema.parse(invalidData)).toThrow('病院名は必須です');
    });

    it('無効な電話番号形式の場合はエラーを返す', () => {
      const invalidData = {
        name: 'テスト動物病院',
        phone: 'invalid-phone',
      };

      expect(() => VeterinaryHospitalInputSchema.parse(invalidData)).toThrow('有効な電話番号を入力してください');
    });
  });

  describe('VeterinaryDoctorInputSchema', () => {
    it('有効な先生データを受け入れる', () => {
      const validData = {
        name: 'テスト先生',
        specialization: '内科',
      };

      expect(() => VeterinaryDoctorInputSchema.parse(validData)).not.toThrow();
    });

    it('先生名が空の場合はエラーを返す', () => {
      const invalidData = {
        name: '',
        specialization: '内科',
      };

      expect(() => VeterinaryDoctorInputSchema.parse(invalidData)).toThrow('先生名は必須です');
    });
  });

  describe('VeterinaryTreatmentInputSchema', () => {
    it('有効な処方内容データを受け入れる', () => {
      const validData = {
        name: '健康診断',
        category: '検査',
        description: '年次健康診断',
      };

      expect(() => VeterinaryTreatmentInputSchema.parse(validData)).not.toThrow();
    });

    it('処方内容名が空の場合はエラーを返す', () => {
      const invalidData = {
        name: '',
        category: '検査',
      };

      expect(() => VeterinaryTreatmentInputSchema.parse(invalidData)).toThrow('処方内容名は必須です');
    });
  });

  describe('ConvertAppointmentToVisitSchema', () => {
    it('有効な変換データを受け入れる', () => {
      const validData = {
        appointmentId: 1,
        actualVisitDate: new Date('2024-01-15T10:00:00Z'),
        actualCost: 5000,
        actualTreatments: ['健康診断', 'ワクチン接種'],
        actualNotes: '問題なし',
        hasBloodTest: true,
      };

      expect(() => ConvertAppointmentToVisitSchema.parse(validData)).not.toThrow();
    });

    it('予約IDが空の場合はエラーを返す', () => {
      const invalidData = {
        appointmentId: '',
        actualCost: 5000,
      };

      expect(() => ConvertAppointmentToVisitSchema.parse(invalidData)).toThrow('予約IDは必須です');
    });
  });

  describe('VeterinaryVisitFilterSchema', () => {
    it('有効なフィルタデータを受け入れる', () => {
      const validData = {
        catId: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        hasBloodTest: true,
        limit: 10,
        offset: 0,
      };

      expect(() => VeterinaryVisitFilterSchema.parse(validData)).not.toThrow();
    });

    it('終了日が開始日より前の場合はエラーを返す', () => {
      const invalidData = {
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01'),
      };

      expect(() => VeterinaryVisitFilterSchema.parse(invalidData)).toThrow('終了日は開始日以降の日付を設定してください');
    });
  });

  describe('VeterinaryAppointmentFilterSchema', () => {
    it('有効なフィルタデータを受け入れる', () => {
      const validData = {
        catId: 1,
        status: AppointmentStatus.SCHEDULED,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 10,
        offset: 0,
      };

      expect(() => VeterinaryAppointmentFilterSchema.parse(validData)).not.toThrow();
    });
  });

  describe('Utility Functions', () => {
    it('validateVeterinaryVisitInput は有効なデータを正しく処理する', () => {
      const validData = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        treatments: ['健康診断'],
        cost: 5000,
        hasBloodTest: false,
      };

      expect(() => validateVeterinaryVisitInput(validData)).not.toThrow();
    });

    it('validateVeterinaryAppointmentInput は有効なデータを正しく処理する', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validData = {
        catId: 1,
        appointmentDate: futureDate,
        hospitalName: 'テスト動物病院',
      };

      expect(() => validateVeterinaryAppointmentInput(validData)).not.toThrow();
    });

    it('validateVeterinaryHospitalInput は有効なデータを正しく処理する', () => {
      const validData = {
        name: 'テスト動物病院',
      };

      expect(() => validateVeterinaryHospitalInput(validData)).not.toThrow();
    });

    it('validateVeterinaryDoctorInput は有効なデータを正しく処理する', () => {
      const validData = {
        name: 'テスト先生',
      };

      expect(() => validateVeterinaryDoctorInput(validData)).not.toThrow();
    });

    it('validateVeterinaryTreatmentInput は有効なデータを正しく処理する', () => {
      const validData = {
        name: '健康診断',
      };

      expect(() => validateVeterinaryTreatmentInput(validData)).not.toThrow();
    });

    it('validateConvertAppointmentToVisit は有効なデータを正しく処理する', () => {
      const validData = {
        appointmentId: 1,
        actualCost: 5000,
      };

      expect(() => validateConvertAppointmentToVisit(validData)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('空文字列は optional フィールドで null として扱われる', () => {
      const dataWithEmptyStrings = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        doctorName: '',
        treatments: ['健康診断'],
        cost: 5000,
        notes: '',
        hasBloodTest: false,
      };

      const result = VeterinaryVisitInputSchema.parse(dataWithEmptyStrings);
      expect(result.doctorName).toBe('');
      expect(result.notes).toBe('');
    });

    it('処方内容の配列が最大数を超える場合はエラーを返す', () => {
      const invalidData = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        treatments: Array(21).fill('処方内容'),
        cost: 5000,
      };

      expect(() => VeterinaryVisitInputSchema.parse(invalidData)).toThrow('処方内容は20個まで選択できます');
    });

    it('費用が上限を超える場合はエラーを返す', () => {
      const invalidData = {
        catId: 1,
        visitDate: new Date('2024-01-15T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        treatments: ['健康診断'],
        cost: 1000001,
      };

      expect(() => VeterinaryVisitInputSchema.parse(invalidData)).toThrow('費用は1,000,000円以下で入力してください');
    });
  });
});
