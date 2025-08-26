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

  // Create sample meal records
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await prisma.mealRecord.upsert({
    where: { id: 'meal1' },
    update: {},
    create: {
      id: 'meal1',
      catId: cat1.id,
      foodId: dryFood.id,
      quantity: 30.0,
      calories: 120.0,
      mealTime: yesterday,
      notes: '朝食',
    },
  });

  await prisma.mealRecord.upsert({
    where: { id: 'meal2' },
    update: {},
    create: {
      id: 'meal2',
      catId: cat2.id,
      foodId: wetFood.id,
      quantity: 15.0,
      calories: 10.5,
      mealTime: now,
      notes: 'おやつ',
    },
  });

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
