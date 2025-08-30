import { PrismaClient, FoodType } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create test user
  const hashedPassword = await hashPassword('password123');
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: 'user1',
      email: 'test@example.com',
      name: 'テストユーザー',
      password: hashedPassword,
    },
  });

  console.log('Created test user:', testUser.email);

  // Create sample cats
  const cat1 = await prisma.cat.upsert({
    where: { id: 'cat1' },
    update: {},
    create: {
      id: 'cat1',
      name: 'みけ',
      birthdate: new Date('2020-03-15'),
      weight: 4.2,
    },
  });

  const cat2 = await prisma.cat.upsert({
    where: { id: 'cat2' },
    update: {},
    create: {
      id: 'cat2',
      name: 'しろ',
      birthdate: new Date('2021-07-22'),
      weight: 3.8,
    },
  });

  // Create sample foods
  const dryFood = await prisma.food.upsert({
    where: { id: 'food1' },
    update: {},
    create: {
      id: 'food1',
      name: 'ロイヤルカナン アダルト',
      type: FoodType.DRY,
      brand: 'ロイヤルカナン',
      caloriesPerGram: 4.0,
      pricePerUnit: 2800,
      unit: 'g',
    },
  });

  const wetFood = await prisma.food.upsert({
    where: { id: 'food2' },
    update: {},
    create: {
      id: 'food2',
      name: 'チャオ ちゅーる まぐろ',
      type: FoodType.WET,
      brand: 'チャオ',
      caloriesPerGram: 0.7,
      pricePerUnit: 120,
      unit: 'g',
    },
  });

  // Create additional foods for variety
  const wetFood2 = await prisma.food.upsert({
    where: { id: 'food3' },
    update: {},
    create: {
      id: 'food3',
      name: 'モンプチ パウチ まぐろ',
      type: FoodType.WET,
      brand: 'モンプチ',
      caloriesPerGram: 0.8,
      pricePerUnit: 80,
      unit: 'g',
    },
  });

  const dryFood2 = await prisma.food.upsert({
    where: { id: 'food4' },
    update: {},
    create: {
      id: 'food4',
      name: 'ヒルズ サイエンスダイエット',
      type: FoodType.DRY,
      brand: 'ヒルズ',
      caloriesPerGram: 3.8,
      pricePerUnit: 3200,
      unit: 'g',
    },
  });

  // Create 100+ meal records over the past 30 days
  const mealRecords = [];
  const foods = [dryFood, wetFood, wetFood2, dryFood2];
  const cats = [cat1, cat2];
  const mealTypes = ['朝食', '昼食', '夕食', 'おやつ'];

  // 過去30日間のデータを生成
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - dayOffset);

    // 各猫に対して1日2-4回の食事を生成
    for (const cat of cats) {
      const mealsPerDay = Math.floor(Math.random() * 3) + 2; // 2-4回

      for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
        const mealTime = new Date(baseDate);

        // 食事時間を設定（朝7時〜夜9時の間でランダム）
        const hour = 7 + Math.floor(Math.random() * 14); // 7-20時
        const minute = Math.floor(Math.random() * 60);
        mealTime.setHours(hour, minute, 0, 0);

        // ランダムにフードを選択
        const selectedFood = foods[Math.floor(Math.random() * foods.length)];

        // 食事量を設定（ドライフードは20-50g、ウェットフードは10-30g）
        let quantity;
        if (selectedFood.type === FoodType.DRY) {
          quantity = 20 + Math.random() * 30; // 20-50g
        }
        else {
          quantity = 10 + Math.random() * 20; // 10-30g
        }

        const calories = quantity * selectedFood.caloriesPerGram;
        const mealType = mealTypes[mealIndex % mealTypes.length];

        mealRecords.push({
          id: `meal_${dayOffset}_${cat.id}_${mealIndex}`,
          catId: cat.id,
          foodId: selectedFood.id,
          quantity: Math.round(quantity * 10) / 10, // 小数点1桁に丸める
          calories: Math.round(calories * 10) / 10,
          mealTime,
          notes: `${mealType}${Math.random() > 0.7 ? ' - よく食べた' : ''}`,
        });
      }
    }
  }

  // バッチでMealRecordを作成
  console.log(`Creating ${mealRecords.length} meal records...`);

  for (const record of mealRecords) {
    await prisma.mealRecord.upsert({
      where: { id: record.id },
      update: {},
      create: record,
    });
  }

  console.log(`Created ${mealRecords.length} meal records for analytics testing.`);

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    process.exit(1);
  });
