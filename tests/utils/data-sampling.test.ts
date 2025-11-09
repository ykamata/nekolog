import { describe, it, expect } from 'vitest';
import { sampleMealRecords, sampleDailyCalories } from '~/utils/cat-meal';
import type { MealRecord, DailyCalorieData } from '~/types/cat-meal';

describe('Data Sampling Utilities', () => {
  describe('sampleMealRecords', () => {
    it('小さなデータセットではサンプリングを適用しない', () => {
      const smallDataset: MealRecord[] = Array.from({ length: 100 }, (_, i) => ({
        id: `record-${i}`,
        catId: 1,
        foodId: 1,
        quantity: 50,
        calories: 100,
        mealTime: new Date(`2024-01-${String((i % 31) + 1).padStart(2, '0')}T12:00:00Z`),
        notes: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: undefined,
        food: undefined,
      }));

      const result = sampleMealRecords(smallDataset, 2000);

      expect(result.samplingInfo.applied).toBe(false);
      expect(result.samplingInfo.originalCount).toBe(100);
      expect(result.samplingInfo.sampledCount).toBe(100);
      expect(result.sampledRecords.length).toBe(100);
    });

    it('大量データ時にサンプリングを適用する', () => {
      const largeDataset: MealRecord[] = Array.from({ length: 3000 }, (_, i) => ({
        id: `record-${i}`,
        catId: 1,
        foodId: 1,
        quantity: 50,
        calories: 100,
        mealTime: new Date(`2024-01-${String((i % 31) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`),
        notes: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: undefined,
        food: undefined,
      }));

      const result = sampleMealRecords(largeDataset, 2000);

      expect(result.samplingInfo.applied).toBe(true);
      expect(result.samplingInfo.originalCount).toBe(3000);
      expect(result.samplingInfo.sampledCount).toBeLessThan(3000);
      expect(result.samplingInfo.sampledCount).toBeLessThanOrEqual(2000);
      expect(result.sampledRecords.length).toBe(result.samplingInfo.sampledCount);
    });

    it('最初と最後のレコードが保持される', () => {
      const dataset: MealRecord[] = Array.from({ length: 3000 }, (_, i) => ({
        id: `record-${i}`,
        catId: 1,
        foodId: 1,
        quantity: 50,
        calories: 100,
        mealTime: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`),
        notes: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: undefined,
        food: undefined,
      }));

      const result = sampleMealRecords(dataset, 1000);

      // 最初と最後のレコードが含まれていることを確認
      const sampledIds = result.sampledRecords.map(r => r.id);
      expect(sampledIds).toContain('record-0');
      expect(sampledIds).toContain('record-2999');
    });

    it('時系列順にソートされたデータが返される', () => {
      // 逆順のデータを作成
      const dataset: MealRecord[] = Array.from({ length: 100 }, (_, i) => ({
        id: `record-${i}`,
        catId: 1,
        foodId: 1,
        quantity: 50,
        calories: 100,
        mealTime: new Date(`2024-01-${String(31 - (i % 31)).padStart(2, '0')}T12:00:00Z`),
        notes: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: undefined,
        food: undefined,
      }));

      const result = sampleMealRecords(dataset, 50);

      // 結果が時系列順にソートされていることを確認
      for (let i = 1; i < result.sampledRecords.length; i++) {
        expect(result.sampledRecords[i].mealTime.getTime())
          .toBeGreaterThanOrEqual(result.sampledRecords[i - 1].mealTime.getTime());
      }
    });
  });

  describe('sampleDailyCalories', () => {
    it('小さなデータセットではサンプリングを適用しない', () => {
      const smallDataset: DailyCalorieData[] = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        calories: 100 + Math.random() * 50,
        type: i % 2 === 0 ? 'DRY' : 'WET',
      }));

      const result = sampleDailyCalories(smallDataset, 200);

      expect(result.samplingInfo.applied).toBe(false);
      expect(result.samplingInfo.originalCount).toBe(30);
      expect(result.samplingInfo.sampledCount).toBe(30);
      expect(result.sampledData.length).toBe(30);
    });

    it('大量データ時にサンプリングを適用する', () => {
      const largeDataset: DailyCalorieData[] = Array.from({ length: 365 }, (_, i) => ({
        date: `2024-${String(Math.floor(i / 31) + 1).padStart(2, '0')}-${String((i % 31) + 1).padStart(2, '0')}`,
        calories: 100 + Math.random() * 50,
        type: i % 2 === 0 ? 'DRY' : 'WET',
      }));

      const result = sampleDailyCalories(largeDataset, 200);

      expect(result.samplingInfo.applied).toBe(true);
      expect(result.samplingInfo.originalCount).toBe(365);
      expect(result.samplingInfo.sampledCount).toBeLessThan(365);
      expect(result.samplingInfo.sampledCount).toBeLessThanOrEqual(300); // 重要なデータポイント保持のため余裕を持たせる
      expect(result.sampledData.length).toBe(result.samplingInfo.sampledCount);
    });

    it('極値（ピークと谷）が保持される', () => {
      // ピークと谷を含むデータセットを作成
      const dataset: DailyCalorieData[] = Array.from({ length: 300 }, (_, i) => {
        let calories = 100;

        // 特定の位置にピークと谷を配置
        if (i === 50) calories = 300; // ピーク
        if (i === 100) calories = 20; // 谷
        if (i === 150) calories = 280; // ピーク
        if (i === 200) calories = 30; // 谷

        return {
          date: `2024-${String(Math.floor(i / 31) + 1).padStart(2, '0')}-${String((i % 31) + 1).padStart(2, '0')}`,
          calories,
          type: i % 2 === 0 ? 'DRY' : 'WET',
        };
      });

      const result = sampleDailyCalories(dataset, 100);

      // 極値が含まれていることを確認
      const sampledCalories = result.sampledData.map(d => d.calories);
      expect(sampledCalories).toContain(300);
      expect(sampledCalories).toContain(20);
      expect(sampledCalories).toContain(280);
      expect(sampledCalories).toContain(30);
    });

    it('重要な日付（月初、週末）が保持される', () => {
      // 2024年1月のデータを作成（1月1日は月曜日）
      const dataset: DailyCalorieData[] = Array.from({ length: 31 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        calories: 100,
        type: 'DRY',
      }));

      const result = sampleDailyCalories(dataset, 15);

      const sampledDates = result.sampledData.map(d => d.date);

      // 月初（1月1日）が含まれていることを確認
      expect(sampledDates).toContain('2024-01-01');

      // 週末が含まれているかチェック（1月6日、7日、13日、14日など）
      const weekendDates = ['2024-01-06', '2024-01-07', '2024-01-13', '2024-01-14'];
      const hasWeekend = weekendDates.some(date => sampledDates.includes(date));
      expect(hasWeekend).toBe(true);
    });

    it('最初と最後のデータポイントが保持される', () => {
      const dataset: DailyCalorieData[] = Array.from({ length: 300 }, (_, i) => ({
        date: `2024-${String(Math.floor(i / 31) + 1).padStart(2, '0')}-${String((i % 31) + 1).padStart(2, '0')}`,
        calories: 100,
        type: i % 2 === 0 ? 'DRY' : 'WET',
      }));

      const result = sampleDailyCalories(dataset, 100);

      const sampledDates = result.sampledData.map(d => d.date);

      // 最初と最後の日付が含まれていることを確認
      expect(sampledDates).toContain(dataset[0].date);
      expect(sampledDates).toContain(dataset[dataset.length - 1].date);
    });

    it('時系列順にソートされたデータが返される', () => {
      // 逆順のデータを作成
      const dataset: DailyCalorieData[] = Array.from({ length: 100 }, (_, i) => ({
        date: `2024-01-${String(31 - (i % 31)).padStart(2, '0')}`,
        calories: 100,
        type: 'DRY',
      }));

      const result = sampleDailyCalories(dataset, 50);

      // 結果が時系列順にソートされていることを確認
      for (let i = 1; i < result.sampledData.length; i++) {
        expect(new Date(result.sampledData[i].date).getTime())
          .toBeGreaterThanOrEqual(new Date(result.sampledData[i - 1].date).getTime());
      }
    });
  });

  describe('サンプリング品質', () => {
    it('サンプリング後もデータの分布が保持される', () => {
      // DRYとWETが混在するデータセットを作成
      const dataset: DailyCalorieData[] = Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-${String(Math.floor(i / 31) + 1).padStart(2, '0')}-${String((i % 31) + 1).padStart(2, '0')}`,
        calories: 100 + Math.random() * 100,
        type: i % 3 === 0 ? 'DRY' : 'WET', // 約1/3がDRY、2/3がWET
      }));

      const result = sampleDailyCalories(dataset, 200);

      // サンプリング後もDRYとWETの比率がある程度保持されていることを確認
      const dryCount = result.sampledData.filter(d => d.type === 'DRY').length;
      const wetCount = result.sampledData.filter(d => d.type === 'WET').length;
      const dryRatio = dryCount / result.sampledData.length;

      // 元の比率（約1/3）に近いことを確認（±10%の誤差を許容）
      expect(dryRatio).toBeGreaterThan(0.23);
      expect(dryRatio).toBeLessThan(0.43);
    });

    it('サンプリング後もカロリー分布の特徴が保持される', () => {
      // 特定の分布を持つデータセットを作成
      const dataset: DailyCalorieData[] = Array.from({ length: 500 }, (_, i) => {
        let calories = 100;

        // 正規分布に近い形でカロリーを設定
        if (i < 50) calories = 50; // 低カロリー群
        if (i >= 50 && i < 450) calories = 100 + Math.random() * 50; // 中カロリー群
        if (i >= 450) calories = 200; // 高カロリー群

        return {
          date: `2024-${String(Math.floor(i / 31) + 1).padStart(2, '0')}-${String((i % 31) + 1).padStart(2, '0')}`,
          calories,
          type: 'DRY',
        };
      });

      const result = sampleDailyCalories(dataset, 100);

      const sampledCalories = result.sampledData.map(d => d.calories);

      // 各カロリー群が含まれていることを確認
      const hasLowCalories = sampledCalories.some(c => c <= 60);
      const hasMidCalories = sampledCalories.some(c => c > 60 && c < 180);
      const hasHighCalories = sampledCalories.some(c => c >= 180);

      expect(hasLowCalories).toBe(true);
      expect(hasMidCalories).toBe(true);
      expect(hasHighCalories).toBe(true);
    });
  });
});
