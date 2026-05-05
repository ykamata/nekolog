import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface DailyCalories {
  date: Date;
  totalCalories: number;
}

function jstDateKey(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return `${jst.getUTCFullYear()}-${jst.getUTCMonth()}-${jst.getUTCDate()}`;
}

export async function getCatName(catId: number): Promise<string> {
  const cat = await prisma.cat.findUniqueOrThrow({
    where: { id: catId },
    select: { name: true },
  });
  return cat.name;
}

export async function getWeeklyMealSummary(
  catId: number,
  weekStart: Date,
  weekEnd: Date,
): Promise<DailyCalories[]> {
  const records = await prisma.mealRecord.findMany({
    where: { catId, mealTime: { gte: weekStart, lte: weekEnd } },
    select: { mealTime: true, calories: true },
  });

  const dayMap = new Map<string, number>();
  for (const r of records) {
    const key = jstDateKey(r.mealTime);
    dayMap.set(key, (dayMap.get(key) ?? 0) + r.calories);
  }

  // 7日分を埋める（記録がない日は 0 kcal）
  const result: DailyCalories[] = [];
  const cur = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    result.push({
      date: new Date(cur),
      totalCalories: dayMap.get(jstDateKey(cur)) ?? 0,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export async function getPreviousDayMemos(
  catIds: number[],
  dayStart: Date,
  dayEnd: Date,
): Promise<{ catName: string; memo: string }[]> {
  const notes = await prisma.dailyNote.findMany({
    where: {
      catId: { in: catIds },
      date: { gte: dayStart, lte: dayEnd },
      AND: [{ memo: { not: null } }, { memo: { not: '' } }],
    },
    select: { memo: true, cat: { select: { name: true } } },
  });
  return notes
    .filter((n): n is typeof n & { memo: string } => !!n.memo)
    .map(n => ({ catName: n.cat.name, memo: n.memo }));
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
