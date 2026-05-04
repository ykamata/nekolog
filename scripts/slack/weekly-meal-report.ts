import { loadConfig } from './lib/config';
import { postToSlack, headerBlock, sectionBlock, dividerBlock } from './lib/slack';
import { getCatName, getWeeklyMealSummary, disconnect } from './lib/db';
import type { DailyCalories } from './lib/db';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// スクリプトは毎週日曜 04:15 JST に起動する
// 前週 = 7日前(日曜) 00:00:00 〜 昨日(土曜) 23:59:59 JST
function getPreviousWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  const d = jstNow.getUTCDate();

  const start = new Date(Date.UTC(y, m, d - 7, 0, 0, 0, 0) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d - 1, 23, 59, 59, 999) - JST_OFFSET_MS);
  return { start, end };
}

function formatMMDD(date: Date): string {
  const jstDate = new Date(date.getTime() + JST_OFFSET_MS);
  const mm = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jstDate.getUTCDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

function buildTable(days: DailyCalories[]): string {
  const header = '曜日  日付      カロリー';
  const rows = days.map(({ date, totalCalories }) => {
    const jstDate = new Date(date.getTime() + JST_OFFSET_MS);
    const dow = DAY_NAMES[jstDate.getUTCDay()];
    const mmdd = formatMMDD(date);
    const kcal = String(Math.round(totalCalories)).padStart(6);
    return `${dow}     ${mmdd}   ${kcal} kcal`;
  });
  return [header, ...rows].join('\n');
}

async function main(): Promise<void> {
  const { targetCatIds } = loadConfig();
  const { start, end } = getPreviousWeekRange();
  const rangeStr = `${formatMMDD(start)} 〜 ${formatMMDD(end)}`;

  console.log(`🍽️ 週次食事レポート実行: ${rangeStr}`);

  for (const catId of targetCatIds) {
    const catName = await getCatName(catId);
    const days = await getWeeklyMealSummary(catId, start, end);
    const table = buildTable(days);

    await postToSlack([
      headerBlock(`🐱 ${catName} の食事記録 (${rangeStr})`),
      dividerBlock(),
      sectionBlock(`\`\`\`${table}\`\`\``),
    ]);

    console.log(`✅ ${catName}: Slack 送信完了`);
  }

  await disconnect();
  console.log('🍽️ 完了');
}

main().catch((err: unknown) => {
  console.error('❌ 週次食事レポート失敗:', err);
  process.exit(1);
});
