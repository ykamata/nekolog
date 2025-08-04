// import type { Cat, Food, MealRecord } from '~/types/cat-meal'

/**
 * Test data utilities for E2E tests
 */

export interface TestCat {
  name: string;
  birthdate?: string;
  weight?: number;
  photoUrl?: string;
}

export interface TestFood {
  name: string;
  type: 'DRY' | 'WET';
  brand?: string;
  caloriesPerGram: number;
  pricePerUnit?: number;
  unit: string;
}

export interface TestMealRecord {
  catName: string;
  foodName: string;
  quantity: number;
  calories?: number;
  mealTime: string;
  notes?: string;
}

export interface TestExcretionRecord {
  catName: string;
  type: 'URINE' | 'FECES';
  recordedAt: string;
  notes?: string;
}

// Test cats data
export const testCats: TestCat[] = [
  {
    name: 'みけ',
    birthdate: '2020-03-15',
    weight: 4.2,
  },
  {
    name: 'しろ',
    birthdate: '2019-08-22',
    weight: 3.8,
  },
  {
    name: 'くろ',
    birthdate: '2021-01-10',
    weight: 5.1,
  },
];

// Test foods data
export const testFoods: TestFood[] = [
  {
    name: 'プレミアムドライフード',
    type: 'DRY',
    brand: 'ロイヤルカナン',
    caloriesPerGram: 3.8,
    pricePerUnit: 2800,
    unit: 'g',
  },
  {
    name: 'ウェットフード チキン',
    type: 'WET',
    brand: 'ヒルズ',
    caloriesPerGram: 0.9,
    pricePerUnit: 180,
    unit: 'g',
  },
  {
    name: 'シニア用ドライフード',
    type: 'DRY',
    brand: 'サイエンスダイエット',
    caloriesPerGram: 3.5,
    pricePerUnit: 3200,
    unit: 'g',
  },
  {
    name: 'ウェットフード サーモン',
    type: 'WET',
    brand: 'アイムス',
    caloriesPerGram: 1.1,
    pricePerUnit: 220,
    unit: 'g',
  },
];

// Test meal records data
export const testMealRecords: TestMealRecord[] = [
  {
    catName: 'みけ',
    foodName: 'プレミアムドライフード',
    quantity: 30,
    mealTime: '2024-01-15T08:00:00',
    notes: '朝食',
  },
  {
    catName: 'みけ',
    foodName: 'ウェットフード チキン',
    quantity: 85,
    mealTime: '2024-01-15T18:00:00',
    notes: '夕食',
  },
  {
    catName: 'しろ',
    foodName: 'プレミアムドライフード',
    quantity: 25,
    mealTime: '2024-01-15T08:30:00',
    notes: '朝食',
  },
  {
    catName: 'くろ',
    foodName: 'シニア用ドライフード',
    quantity: 35,
    mealTime: '2024-01-15T19:00:00',
    notes: '夕食',
  },
];

// Test excretion records data
export const testExcretionRecords: TestExcretionRecord[] = [
  {
    catName: 'みけ',
    type: 'URINE',
    recordedAt: '2024-01-15T09:00:00',
    notes: '朝のおしっこ',
  },
  {
    catName: 'みけ',
    type: 'FECES',
    recordedAt: '2024-01-15T10:30:00',
    notes: '健康的なうんち',
  },
  {
    catName: 'しろ',
    type: 'URINE',
    recordedAt: '2024-01-15T09:15:00',
  },
  {
    catName: 'しろ',
    type: 'FECES',
    recordedAt: '2024-01-15T11:00:00',
    notes: '少し軟便',
  },
];

// Generate test data for different scenarios
export const generateTestData = {
  // Generate multiple cats for pagination testing
  multipleCats: (count: number): TestCat[] => {
    return Array.from({ length: count }, (_, i) => ({
      name: `テスト猫${i + 1}`,
      birthdate: `202${Math.floor(i / 10)}-${String((i % 12) + 1).padStart(
        2,
        '0',
      )}-${String((i % 28) + 1).padStart(2, '0')}`,
      weight: 3.0 + (i % 3),
    }));
  },

  // Generate multiple foods for filtering testing
  multipleFoods: (count: number): TestFood[] => {
    return Array.from({ length: count }, (_, i) => ({
      name: `テストフード${i + 1}`,
      type: i % 2 === 0 ? 'DRY' : 'WET',
      brand: `ブランド${Math.floor(i / 5) + 1}`,
      caloriesPerGram: 2.0 + (i % 3),
      pricePerUnit: 1000 + i * 100,
      unit: 'g',
    }));
  },

  // Generate meal records for analytics testing
  mealRecordsForAnalytics: (
    catName: string,
    foodName: string,
    days: number,
  ): TestMealRecord[] => {
    const records: TestMealRecord[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Morning meal
      const morningTime = new Date(date);
      morningTime.setHours(8, 0, 0, 0);
      records.push({
        catName,
        foodName,
        quantity: 25 + Math.floor(Math.random() * 10),
        mealTime: morningTime.toISOString(),
        notes: '朝食',
      });

      // Evening meal
      const eveningTime = new Date(date);
      eveningTime.setHours(18, 0, 0, 0);
      records.push({
        catName,
        foodName,
        quantity: 30 + Math.floor(Math.random() * 15),
        mealTime: eveningTime.toISOString(),
        notes: '夕食',
      });
    }

    return records;
  },

  // Generate excretion records for testing
  excretionRecordsForTesting: (
    catName: string,
    days: number,
  ): TestExcretionRecord[] => {
    const records: TestExcretionRecord[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Morning urine
      const morningTime = new Date(date);
      morningTime.setHours(8, Math.floor(Math.random() * 60), 0, 0);
      records.push({
        catName,
        type: 'URINE',
        recordedAt: morningTime.toISOString(),
        notes: i % 3 === 0 ? '朝のおしっこ' : undefined,
      });

      // Afternoon feces (not every day)
      if (i % 2 === 0) {
        const afternoonTime = new Date(date);
        afternoonTime.setHours(14, Math.floor(Math.random() * 60), 0, 0);
        records.push({
          catName,
          type: 'FECES',
          recordedAt: afternoonTime.toISOString(),
          notes: i % 4 === 0 ? '健康的なうんち' : undefined,
        });
      }

      // Evening urine
      const eveningTime = new Date(date);
      eveningTime.setHours(20, Math.floor(Math.random() * 60), 0, 0);
      records.push({
        catName,
        type: 'URINE',
        recordedAt: eveningTime.toISOString(),
      });
    }

    return records;
  },
};

// Validation helpers
export const validateTestData = {
  cat: (cat: TestCat): boolean => {
    return !!(cat.name && cat.name.trim().length > 0);
  },

  food: (food: TestFood): boolean => {
    return !!(
      food.name
      && food.name.trim().length > 0
      && ['DRY', 'WET'].includes(food.type)
      && food.caloriesPerGram > 0
      && food.unit
    );
  },

  mealRecord: (record: TestMealRecord): boolean => {
    return !!(
      record.catName
      && record.foodName
      && record.quantity > 0
      && record.mealTime
    );
  },

  excretionRecord: (record: TestExcretionRecord): boolean => {
    return !!(
      record.catName
      && ['URINE', 'FECES'].includes(record.type)
      && record.recordedAt
    );
  },
};
