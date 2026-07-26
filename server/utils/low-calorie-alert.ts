import { prisma } from '~/lib/prisma';
import { getStartOfDay, getEndOfDay, isLowCalorieDay } from '~/utils/cat-meal';

/**
 * 食事登録・編集後に、対象日の合計カロリーが閾値以上になっていれば
 * 見落としフラグ(lowCalorieAlert)を解除する
 */
export async function syncLowCalorieAlert(catId: number, mealTime: Date): Promise<void> {
  const dayStart = getStartOfDay(mealTime);
  const dayEnd = getEndOfDay(mealTime);

  const records = await prisma.mealRecord.findMany({
    where: { catId, mealTime: { gte: dayStart, lte: dayEnd } },
    select: { calories: true },
  });
  const totalCalories = records.reduce((sum, r) => sum + r.calories, 0);

  if (!isLowCalorieDay(totalCalories)) {
    await prisma.dailyNote.updateMany({
      where: { catId, date: dayStart, lowCalorieAlert: true },
      data: { lowCalorieAlert: false },
    });
  }
}
