import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const LOW_CALORIE_ALERT_THRESHOLD_KCAL = 120;

// スクリプトは毎日 04:10 JST に起動する
// 前日 = 昨日の 00:00:00 〜 23:59:59 JST
// DBのDATETIMEはJST値で格納されているためオフセット不要
function getPreviousDayRange(): { start: Date; end: Date; dateStr: string } {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  const d = jstNow.getUTCDate();

  const start = new Date(Date.UTC(y, m, d - 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d - 1, 23, 59, 59, 999));

  const mm = String(start.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(start.getUTCDate()).padStart(2, '0');
  return { start, end, dateStr: `${mm}/${dd}` };
}

async function main(): Promise<void> {
  const { start, end, dateStr } = getPreviousDayRange();

  console.log(`🔵 低カロリー見落としチェック実行: ${dateStr}`);

  const cats = await prisma.cat.findMany({ select: { id: true, name: true } });

  for (const cat of cats) {
    const records = await prisma.mealRecord.findMany({
      where: { catId: cat.id, mealTime: { gte: start, lte: end } },
      select: { calories: true },
    });
    const totalCalories = records.reduce((sum, r) => sum + r.calories, 0);

    if (totalCalories < LOW_CALORIE_ALERT_THRESHOLD_KCAL) {
      await prisma.dailyNote.upsert({
        where: { catId_date: { catId: cat.id, date: start } },
        update: { lowCalorieAlert: true },
        create: { catId: cat.id, date: start, lowCalorieAlert: true },
      });
      console.log(`⚠️ ${cat.name}: ${totalCalories}kcal (見落としフラグを設定)`);
    }
    else {
      console.log(`✅ ${cat.name}: ${totalCalories}kcal`);
    }
  }

  await prisma.$disconnect();
  console.log('🔵 完了');
}

main().catch((err: unknown) => {
  console.error('❌ 低カロリー見落としチェック失敗:', err);
  process.exit(1);
});
