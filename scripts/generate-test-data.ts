import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateTestData() {
  console.log('テストデータを生成中...');

  try {
    // 既存のデータを確認
    const existingCats = await prisma.cat.findMany();
    const existingFoods = await prisma.food.findMany();

    console.log(`既存の猫: ${existingCats.length}匹`);
    console.log(`既存のフード: ${existingFoods.length}種類`);

    if (existingCats.length === 0 || existingFoods.length === 0) {
      console.log('基本データが不足しています。先にseed.tsを実行してください。');
      return;
    }

    // 過去30日間の食事記録を生成
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log(`期間: ${startDate.toISOString().split('T')[0]} 〜 ${endDate.toISOString().split('T')[0]}`);

    const mealRecords = [];
    let mealIdCounter = 1000; // 既存のIDと重複しないように

    // 各猫について
    for (const cat of existingCats) {
      console.log(`${cat.name}の食事記録を生成中...`);

      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // 1日に2-4回の食事をランダムに生成
        const mealsPerDay = Math.floor(Math.random() * 3) + 2; // 2-4回

        for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
          // ランダムな時間を設定
          const mealTime = new Date(currentDate);
          const hour = 6 + Math.floor(Math.random() * 16); // 6時-22時
          const minute = Math.floor(Math.random() * 60);
          mealTime.setHours(hour, minute, 0, 0);

          // ランダムなフードを選択
          const food = existingFoods[Math.floor(Math.random() * existingFoods.length)];

          // 食事の量をランダムに設定
          let quantity: number;
          let calories: number;

          if (food.type === 'DRY') {
            // ドライフード: 20-50g
            quantity = Math.floor(Math.random() * 31) + 20;
            calories = quantity * food.caloriesPerGram;
          }
          else {
            // ウェットフード: 10-30g
            quantity = Math.floor(Math.random() * 21) + 10;
            calories = quantity * food.caloriesPerGram;
          }

          // 食事記録を作成
          mealRecords.push({
            id: `test_meal_${mealIdCounter++}`,
            catId: cat.id,
            foodId: food.id,
            quantity,
            calories: Math.round(calories * 10) / 10, // 小数点1桁に丸める
            mealTime,
            notes: mealIndex === 0 ? '朝食' : mealIndex === 1 ? '昼食' : mealIndex === 2 ? '夕食' : 'おやつ',
          });
        }

        // 次の日へ
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log(`生成する食事記録数: ${mealRecords.length}件`);

    // 食事記録を1件ずつ挿入（重複チェック付き）
    let insertedCount = 0;
    for (const record of mealRecords) {
      try {
        await prisma.mealRecord.create({
          data: record,
        });
        insertedCount++;
        if (insertedCount % 50 === 0) {
          console.log(`${insertedCount}/${mealRecords.length} 件の食事記録を挿入しました`);
        }
      }
      catch (error) {
        // 重複エラーは無視
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          continue;
        }
        throw error;
      }
    }
    console.log(`${insertedCount}/${mealRecords.length} 件の食事記録を挿入しました`);

    // 結果を確認
    const totalMealRecords = await prisma.mealRecord.count();
    console.log(`\n✅ テストデータ生成完了!`);
    console.log(`総食事記録数: ${totalMealRecords}件`);

    // 各猫の食事記録数を表示
    for (const cat of existingCats) {
      const catMealCount = await prisma.mealRecord.count({
        where: { catId: cat.id },
      });
      console.log(`${cat.name}: ${catMealCount}件`);
    }
  }
  catch (error) {
    console.error('テストデータ生成中にエラーが発生しました:', error);
  }
  finally {
    await prisma.$disconnect();
  }
}

// スクリプトを実行
generateTestData();
