import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { productionFoods } from './master-foods';
import { productionMedications } from './master-medications';
import { productionVeterinaryTreatments } from './master-veterinary-treatments';
import { productionUsers } from './master-users';
import { productionVeterinaryHospitals } from './master-veterinary-hospitals';
import { productionVeterinaryDoctors } from './master-veterinary-doctors';
import { productionCats } from './master-cats';
import { productionMealRecords } from './master-meal-records';

/**
 * パスワードをハッシュ化する
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 本番環境用マスターデータシード
 *
 * このスクリプトは本番環境の基礎データを投入します。
 * 以下のマスターデータを投入します：
 * - ユーザー情報
 * - フード情報
 * - 薬品情報
 * - 診療項目
 * - 動物病院情報
 */
export async function seedProductionMasterData(prisma: PrismaClient) {
  console.log('🌱 本番環境マスターデータの投入を開始します...');

  // ユーザー情報の投入
  console.log('👤 ユーザーマスターデータを投入中...');
  let userCount = 0;
  const createdUsers: { id: number; email: string }[] = [];
  for (const user of productionUsers) {
    const hashedPassword = await hashPassword(user.password);
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
    });
    const createdUser = existing
      ? await prisma.user.update({
          where: { id: user.id },
          data: {
            email: user.email,
            name: user.name,
            password: hashedPassword,
          },
        })
      : await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            password: hashedPassword,
          },
        });
    createdUsers.push({ id: createdUser.id, email: createdUser.email });
    userCount++;
  }
  console.log(`✅ ${userCount}件のユーザーデータを投入しました`);

  // 猫情報の投入
  console.log('🐱 猫マスターデータを投入中...');
  let catCount = 0;
  for (const cat of productionCats) {
    const existing = await prisma.cat.findUnique({
      where: { id: cat.id },
    });
    if (existing) {
      await prisma.cat.update({
        where: { id: cat.id },
        data: cat,
      });
    }
    else {
      await prisma.cat.create({
        data: cat,
      });
    }
    catCount++;
  }
  console.log(`✅ ${catCount}件の猫データを投入しました`);

  // フード情報の投入
  console.log('📦 フードマスターデータを投入中...');
  let foodCount = 0;
  for (const food of productionFoods) {
    const existing = await prisma.food.findUnique({
      where: { id: food.id },
    });
    if (existing) {
      await prisma.food.update({
        where: { id: food.id },
        data: food,
      });
    }
    else {
      await prisma.food.create({
        data: food,
      });
    }
    foodCount++;
  }
  console.log(`✅ ${foodCount}件のフードデータを投入しました`);

  // 食事履歴の投入
  console.log('🍽️  食事履歴データを投入中...');
  let mealRecordCount = 0;
  for (const mealRecord of productionMealRecords) {
    await prisma.mealRecord.create({
      data: mealRecord,
    });
    mealRecordCount++;
  }
  console.log(`✅ ${mealRecordCount}件の食事履歴データを投入しました`);

  // 薬品情報の投入
  console.log('💊 薬品マスターデータを投入中...');
  let medicationCount = 0;
  for (const medication of productionMedications) {
    const existing = await prisma.medication.findFirst({
      where: { name: medication.name },
    });
    if (existing) {
      await prisma.medication.update({
        where: { id: existing.id },
        data: medication,
      });
    }
    else {
      await prisma.medication.create({
        data: medication,
      });
    }
    medicationCount++;
  }
  console.log(`✅ ${medicationCount}件の薬品データを投入しました`);

  // 診療項目の投入
  console.log('🏥 診療項目マスターデータを投入中...');
  let treatmentCount = 0;
  for (const treatment of productionVeterinaryTreatments) {
    await prisma.veterinaryTreatment.upsert({
      where: { name: treatment.name },
      update: treatment,
      create: treatment,
    });
    treatmentCount++;
  }
  console.log(`✅ ${treatmentCount}件の診療項目データを投入しました`);

  // 動物病院情報の投入（最初のユーザーに紐付け）
  console.log('🏥 動物病院マスターデータを投入中...');
  let hospitalCount = 0;
  let doctorCount = 0;
  const createdHospitals: { id: number; name: string }[] = [];

  if (createdUsers.length > 0) {
    const firstUserId = createdUsers[0].id;
    for (const hospital of productionVeterinaryHospitals) {
      const createdHospital = await prisma.veterinaryHospital.upsert({
        where: { name: hospital.name },
        update: {
          address: hospital.address,
          phone: hospital.phone,
          memo: hospital.memo,
          userId: firstUserId,
        },
        create: {
          name: hospital.name,
          address: hospital.address,
          phone: hospital.phone,
          memo: hospital.memo,
          userId: firstUserId,
        },
      });
      createdHospitals.push({ id: createdHospital.id, name: createdHospital.name });
      hospitalCount++;
    }
    console.log(`✅ ${hospitalCount}件の動物病院データを投入しました`);

    // 獣医師情報の投入（最初の病院に紐付け）
    if (createdHospitals.length > 0) {
      console.log('👨‍⚕️ 獣医師マスターデータを投入中...');
      const firstHospitalId = createdHospitals[0].id;
      for (const doctor of productionVeterinaryDoctors) {
        await prisma.veterinaryDoctor.upsert({
          where: { name: doctor.name },
          update: {
            specialty: doctor.specialty,
            memo: doctor.memo,
            hospitalId: firstHospitalId,
            userId: firstUserId,
          },
          create: {
            name: doctor.name,
            specialty: doctor.specialty,
            memo: doctor.memo,
            hospitalId: firstHospitalId,
            userId: firstUserId,
          },
        });
        doctorCount++;
      }
      console.log(`✅ ${doctorCount}件の獣医師データを投入しました`);
    }
  }
  else {
    console.log('⚠️  ユーザーが存在しないため、動物病院データはスキップしました');
  }

  console.log('🎉 本番環境マスターデータの投入が完了しました！');
  console.log(`
合計投入データ:
  - ユーザー: ${userCount}件
  - 猫: ${catCount}件
  - フード: ${foodCount}件
  - 食事履歴: ${mealRecordCount}件
  - 薬品: ${medicationCount}件
  - 診療項目: ${treatmentCount}件
  - 動物病院: ${hospitalCount}件
  - 獣医師: ${doctorCount}件
  `);
}

// スクリプトとして直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  const prisma = new PrismaClient();

  seedProductionMasterData(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('✨ データベース接続を切断しました');
    })
    .catch(async (error) => {
      console.error('❌ エラーが発生しました:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
