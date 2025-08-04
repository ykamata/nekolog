import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import { ExcretionType } from '~/types/excretion';
import {
  ExcretionRecordInputSchema,
  ExcretionRecordUpdateSchema,
  ExcretionRecordFilterSchema,
  ExcretionCalendarQuerySchema,
} from '~/lib/validations/excretion';

describe('Excretion Records API Logic', () => {
  // テストデータ
  const testCat = {
    name: 'テスト猫',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
  };

  const testExcretionRecord = {
    type: ExcretionType.URINE,
    recordedAt: new Date('2024-01-15T10:30:00Z'),
    notes: 'テストメモ',
  };

  const testExcretionRecord2 = {
    type: ExcretionType.FECES,
    recordedAt: new Date('2024-01-15T14:00:00Z'),
    notes: 'うんちの記録',
  };

  let testCatId: string;
  let createdRecordId: string;

  beforeEach(async () => {
    // テストデータのクリーンアップ
    await prisma.excretionRecord.deleteMany({
      where: {
        cat: {
          name: {
            startsWith: 'テスト',
          },
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

    // テスト用の猫を作成
    const cat = await prisma.cat.create({
      data: testCat,
    });
    testCatId = cat.id;
  });

  afterEach(async () => {
    // テストデータのクリーンアップ
    await prisma.excretionRecord.deleteMany({
      where: {
        cat: {
          name: {
            startsWith: 'テスト',
          },
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

  describe('Excretion Record Creation Logic', () => {
    it('should validate excretion record input schema with valid data', () => {
      const inputData = {
        catId: testCatId,
        ...testExcretionRecord,
      };

      const result = ExcretionRecordInputSchema.safeParse(inputData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(testCatId);
        expect(result.data.type).toBe(ExcretionType.URINE);
        expect(result.data.recordedAt).toEqual(testExcretionRecord.recordedAt);
        expect(result.data.notes).toBe(testExcretionRecord.notes);
      }
    });

    it('should reject invalid excretion record input data', () => {
      const invalidData = {
        catId: '', // 空のcatId
        type: 'INVALID_TYPE', // 無効なタイプ
        recordedAt: new Date(Date.now() + 86400000), // 未来の日時
        notes: 'a'.repeat(501), // 500文字を超えるメモ
      };

      const result = ExcretionRecordInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should create excretion record in database', async () => {
      const inputData = {
        catId: testCatId,
        ...testExcretionRecord,
      };

      const validatedData = ExcretionRecordInputSchema.parse(inputData);

      // 猫の存在確認
      const cat = await prisma.cat.findUnique({
        where: { id: validatedData.catId },
        select: { id: true, name: true },
      });
      expect(cat).not.toBeNull();

      // 排泄記録を作成
      const excretionRecord = await prisma.excretionRecord.create({
        data: {
          catId: validatedData.catId,
          type: validatedData.type as 'URINE' | 'FECES',
          recordedAt: validatedData.recordedAt,
          notes: validatedData.notes,
        },
        include: {
          cat: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      });

      expect(excretionRecord.catId).toBe(testCatId);
      expect(excretionRecord.type).toBe(testExcretionRecord.type);
      expect(excretionRecord.recordedAt).toEqual(testExcretionRecord.recordedAt);
      expect(excretionRecord.notes).toBe(testExcretionRecord.notes);
      expect(excretionRecord.cat.name).toBe(testCat.name);
      expect(excretionRecord.id).toBeDefined();
      expect(excretionRecord.createdAt).toBeDefined();
      expect(excretionRecord.updatedAt).toBeDefined();

      createdRecordId = excretionRecord.id;
    });

    it('should handle non-existent cat ID', async () => {
      const inputData = {
        catId: 'non-existent-cat-id',
        ...testExcretionRecord,
      };

      const validatedData = ExcretionRecordInputSchema.parse(inputData);

      // 猫の存在確認
      const cat = await prisma.cat.findUnique({
        where: { id: validatedData.catId },
        select: { id: true, name: true },
      });

      expect(cat).toBeNull();
    });
  });

  describe('Excretion Record Reading Logic', () => {
    beforeEach(async () => {
      const record = await prisma.excretionRecord.create({
        data: {
          catId: testCatId,
          ...testExcretionRecord,
        },
      });
      createdRecordId = record.id;
    });

    it('should validate filter schema with valid data', () => {
      const filterData = {
        catId: testCatId,
        type: ExcretionType.URINE,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: '10',
        offset: '0',
      };

      const result = ExcretionRecordFilterSchema.safeParse(filterData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(testCatId);
        expect(result.data.type).toBe(ExcretionType.URINE);
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should reject invalid date range in filter', () => {
      const invalidFilter = {
        startDate: '2024-01-31',
        endDate: '2024-01-01', // 開始日が終了日より後
      };

      const result = ExcretionRecordFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });

    it('should find excretion records with filtering', async () => {
      // 追加の記録を作成
      await prisma.excretionRecord.create({
        data: {
          catId: testCatId,
          ...testExcretionRecord2,
        },
      });

      // フィルタリング条件
      const where: Record<string, any> = {
        catId: testCatId,
        type: ExcretionType.URINE,
      };

      const [records, total] = await Promise.all([
        prisma.excretionRecord.findMany({
          where,
          orderBy: { recordedAt: 'desc' },
          take: 20,
          skip: 0,
          select: {
            id: true,
            catId: true,
            type: true,
            recordedAt: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            cat: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
              },
            },
          },
        }),
        prisma.excretionRecord.count({ where }),
      ]);

      expect(records).toHaveLength(1);
      expect(total).toBe(1);
      expect(records[0].type).toBe(ExcretionType.URINE);
      expect(records[0].cat.name).toBe(testCat.name);
    });

    it('should support pagination', async () => {
      // 複数の記録を作成
      await prisma.excretionRecord.create({
        data: {
          catId: testCatId,
          ...testExcretionRecord2,
        },
      });

      const where = { catId: testCatId };
      const limit = 1;
      const offset = 0;

      const [records, total] = await Promise.all([
        prisma.excretionRecord.findMany({
          where,
          orderBy: { recordedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.excretionRecord.count({ where }),
      ]);

      expect(records).toHaveLength(1);
      expect(total).toBe(2);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const where = {
        catId: testCatId,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      const records = await prisma.excretionRecord.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
      });

      expect(records).toHaveLength(1);
      expect(records[0].recordedAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      expect(records[0].recordedAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
    });
  });

  describe('Excretion Record Update Logic', () => {
    beforeEach(async () => {
      const record = await prisma.excretionRecord.create({
        data: {
          catId: testCatId,
          ...testExcretionRecord,
        },
      });
      createdRecordId = record.id;
    });

    it('should validate excretion record update schema', () => {
      const updateData = {
        type: ExcretionType.FECES,
        notes: '更新されたメモ',
      };

      const result = ExcretionRecordUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(ExcretionType.FECES);
        expect(result.data.notes).toBe('更新されたメモ');
      }
    });

    it('should update excretion record in database', async () => {
      const updateData = {
        type: ExcretionType.FECES,
        notes: '更新されたメモ',
      };

      const validatedData = ExcretionRecordUpdateSchema.parse(updateData);

      // 記録の存在確認
      const existingRecord = await prisma.excretionRecord.findUnique({
        where: { id: createdRecordId },
        select: { id: true, catId: true },
      });
      expect(existingRecord).not.toBeNull();

      // 更新データの準備
      const finalUpdateData: {
        catId?: string;
        type?: 'URINE' | 'FECES';
        recordedAt?: Date;
        notes?: string;
      } = {};

      if (validatedData.type) finalUpdateData.type = validatedData.type as 'URINE' | 'FECES';
      if (validatedData.notes !== undefined) finalUpdateData.notes = validatedData.notes;

      // 記録を更新
      const updatedRecord = await prisma.excretionRecord.update({
        where: { id: createdRecordId },
        data: finalUpdateData,
        include: {
          cat: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      });

      expect(updatedRecord.type).toBe(ExcretionType.FECES);
      expect(updatedRecord.notes).toBe('更新されたメモ');
      expect(updatedRecord.recordedAt).toEqual(testExcretionRecord.recordedAt); // 変更されていない
    });

    it('should handle partial updates', async () => {
      const updateData = { notes: '部分更新のメモ' };

      const validatedData = ExcretionRecordUpdateSchema.parse(updateData);

      const updatedRecord = await prisma.excretionRecord.update({
        where: { id: createdRecordId },
        data: { notes: validatedData.notes },
      });

      expect(updatedRecord.type).toBe(testExcretionRecord.type); // 変更されていない
      expect(updatedRecord.notes).toBe('部分更新のメモ');
    });

    it('should handle cat ID update with validation', async () => {
      // 新しい猫を作成
      const newCat = await prisma.cat.create({
        data: {
          name: 'テスト猫2',
          birthdate: new Date('2021-01-01'),
        },
      });

      const updateData = { catId: newCat.id };

      const validatedData = ExcretionRecordUpdateSchema.parse(updateData);

      // 新しい猫の存在確認
      const cat = await prisma.cat.findUnique({
        where: { id: validatedData.catId! },
        select: { id: true },
      });
      expect(cat).not.toBeNull();

      // 記録を更新
      const updatedRecord = await prisma.excretionRecord.update({
        where: { id: createdRecordId },
        data: { catId: validatedData.catId },
      });

      expect(updatedRecord.catId).toBe(newCat.id);
    });

    it('should handle non-existent record ID', async () => {
      const nonExistentId = 'non-existent-record-id';

      const existingRecord = await prisma.excretionRecord.findUnique({
        where: { id: nonExistentId },
        select: { id: true, catId: true },
      });

      expect(existingRecord).toBeNull();
    });
  });

  describe('Excretion Record Deletion Logic', () => {
    beforeEach(async () => {
      const record = await prisma.excretionRecord.create({
        data: {
          catId: testCatId,
          ...testExcretionRecord,
        },
      });
      createdRecordId = record.id;
    });

    it('should delete excretion record from database', async () => {
      // 記録の存在確認
      const existingRecord = await prisma.excretionRecord.findUnique({
        where: { id: createdRecordId },
        select: {
          id: true,
          type: true,
          recordedAt: true,
          cat: {
            select: {
              name: true,
            },
          },
        },
      });

      expect(existingRecord).not.toBeNull();
      expect(existingRecord?.cat.name).toBe(testCat.name);

      // 記録を削除
      await prisma.excretionRecord.delete({
        where: { id: createdRecordId },
      });

      // 削除の確認
      const deletedRecord = await prisma.excretionRecord.findUnique({
        where: { id: createdRecordId },
      });

      expect(deletedRecord).toBeNull();
    });

    it('should handle non-existent record deletion', async () => {
      const nonExistentId = 'non-existent-record-id';

      const existingRecord = await prisma.excretionRecord.findUnique({
        where: { id: nonExistentId },
      });

      expect(existingRecord).toBeNull();
    });
  });

  describe('Calendar Data Logic', () => {
    beforeEach(async () => {
      // 複数の記録を作成
      await prisma.excretionRecord.createMany({
        data: [
          {
            catId: testCatId,
            type: ExcretionType.URINE,
            recordedAt: new Date('2024-01-15T10:30:00Z'),
            notes: 'おしっこの記録',
          },
          {
            catId: testCatId,
            type: ExcretionType.FECES,
            recordedAt: new Date('2024-01-15T14:00:00Z'),
            notes: 'うんちの記録',
          },
          {
            catId: testCatId,
            type: ExcretionType.URINE,
            recordedAt: new Date('2024-01-16T09:00:00Z'),
          },
        ],
      });
    });

    it('should validate calendar query schema', () => {
      const queryData = {
        catId: testCatId,
        year: '2024',
        month: '1',
      };

      const result = ExcretionCalendarQuerySchema.safeParse(queryData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(testCatId);
        expect(result.data.year).toBe(2024);
        expect(result.data.month).toBe(1);
      }
    });

    it('should reject invalid month in calendar query', () => {
      const invalidQuery = {
        month: '13', // 無効な月
      };

      const result = ExcretionCalendarQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should fetch calendar data with date grouping', async () => {
      const year = 2024;
      const month = 1;

      // 月の開始日と終了日を計算
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const where = {
        catId: testCatId,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      const excretionRecords = await prisma.excretionRecord.findMany({
        where,
        select: {
          id: true,
          type: true,
          recordedAt: true,
          notes: true,
          catId: true,
          cat: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { recordedAt: 'asc' },
      });

      expect(excretionRecords).toHaveLength(3);

      // 日付ごとにグループ化
      const calendarData: Record<string, any> = {};

      excretionRecords.forEach((record) => {
        const dateKey = record.recordedAt.toISOString().split('T')[0];
        if (!dateKey) return;

        if (!calendarData[dateKey]) {
          calendarData[dateKey] = {
            date: dateKey,
            records: [],
            hasNotes: false,
            urineCount: 0,
            fecesCount: 0,
            catCount: new Set(),
          };
        }

        const calendarRecord = {
          id: record.id,
          type: record.type,
          time: record.recordedAt.toTimeString().slice(0, 5),
          hasNotes: !!record.notes,
          catName: record.cat.name,
        };

        calendarData[dateKey].records.push(calendarRecord);
        calendarData[dateKey].hasNotes = calendarData[dateKey].hasNotes || !!record.notes;
        calendarData[dateKey].catCount.add(record.catId);

        if (record.type === 'URINE') {
          calendarData[dateKey].urineCount++;
        }
        else if (record.type === 'FECES') {
          calendarData[dateKey].fecesCount++;
        }
      });

      const processedCalendarData = Object.values(calendarData);

      expect(processedCalendarData).toHaveLength(2); // 2024-01-15と2024-01-16

      const jan15Data = processedCalendarData.find((day: any) => day.date === '2024-01-15');
      expect(jan15Data).toBeDefined();
      expect(jan15Data.records).toHaveLength(2);
      expect(jan15Data.hasNotes).toBe(true);
      expect(jan15Data.urineCount).toBe(1);
      expect(jan15Data.fecesCount).toBe(1);

      const jan16Data = processedCalendarData.find((day: any) => day.date === '2024-01-16');
      expect(jan16Data).toBeDefined();
      expect(jan16Data.records).toHaveLength(1);
      expect(jan16Data.hasNotes).toBe(false);
      expect(jan16Data.urineCount).toBe(1);
      expect(jan16Data.fecesCount).toBe(0);
    });

    it('should calculate statistics correctly', async () => {
      const year = 2024;
      const month = 1;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const excretionRecords = await prisma.excretionRecord.findMany({
        where: {
          catId: testCatId,
          recordedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const stats = {
        totalRecords: excretionRecords.length,
        urineRecords: excretionRecords.filter(r => r.type === 'URINE').length,
        fecesRecords: excretionRecords.filter(r => r.type === 'FECES').length,
        recordsWithNotes: excretionRecords.filter(r => r.notes).length,
        uniqueCats: new Set(excretionRecords.map(r => r.catId)).size,
      };

      expect(stats.totalRecords).toBe(3);
      expect(stats.urineRecords).toBe(2);
      expect(stats.fecesRecords).toBe(1);
      expect(stats.recordsWithNotes).toBe(2);
      expect(stats.uniqueCats).toBe(1);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should reject excretion record with future date', () => {
      const futureRecord = {
        catId: testCatId,
        type: ExcretionType.URINE,
        recordedAt: new Date(Date.now() + 86400000), // 明日
      };

      const result = ExcretionRecordInputSchema.safeParse(futureRecord);
      expect(result.success).toBe(false);
    });

    it('should reject excretion record with notes too long', () => {
      const longNotesRecord = {
        catId: testCatId,
        type: ExcretionType.URINE,
        recordedAt: new Date(),
        notes: 'a'.repeat(501), // 500文字を超える
      };

      const result = ExcretionRecordInputSchema.safeParse(longNotesRecord);
      expect(result.success).toBe(false);
    });

    it('should accept excretion record with minimal data', () => {
      const minimalRecord = {
        catId: testCatId,
        type: ExcretionType.URINE,
        recordedAt: new Date(),
      };

      const result = ExcretionRecordInputSchema.safeParse(minimalRecord);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBeUndefined();
      }
    });

    it('should reject invalid excretion type', () => {
      const invalidTypeRecord = {
        catId: testCatId,
        type: 'INVALID_TYPE',
        recordedAt: new Date(),
      };

      const result = ExcretionRecordInputSchema.safeParse(invalidTypeRecord);
      expect(result.success).toBe(false);
    });

    it('should accept empty notes in update', () => {
      const updateData = {
        notes: '',
      };

      const result = ExcretionRecordUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('');
      }
    });
  });
});
