import { loadConfig } from './lib/config';
import { postToSlack, headerBlock, sectionBlock, dividerBlock } from './lib/slack';
import { getCatName, getWeeklyMealSummary, disconnect } from './lib/db';
import type { DailyCalories } from './lib/db';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// スクリプトは毎週日曜 04:15 JST に起動する
// 前週 = 前週日曜 00:00:00 〜 前週土曜 23:59:59 JST
// dow=0(日)のとき: start=d-7(先週日), end=d-1(昨日=土) ✓
// dow=n のとき: start=d-(n+7)(前週日), end=d-(n+1)(前週土) ✓
function getPreviousWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  const d = jstNow.getUTCDate();
  const dow = jstNow.getUTCDay(); // 0=日曜, 6=土曜

  // DBのDATETIMEはJST値で格納されているためオフセット不要
  const start = new Date(Date.UTC(y, m, d - (dow + 7), 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d - (dow + 1), 23, 59, 59, 999));
  return { start, end };
}

function formatMMDD(date: Date): string {
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

function buildTable(days: DailyCalories[]): string {
  const header = '曜日  日付      カロリー';
  const rows = days.map(({ date, totalCalories }) => {
    const dow = DAY_NAMES[date.getUTCDay()];
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
