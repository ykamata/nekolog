import { loadConfig } from './lib/config';
import { postToSlack, headerBlock, sectionBlock, dividerBlock } from './lib/slack';
import { getPreviousDayMemos, disconnect } from './lib/db';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// スクリプトは毎日 04:00 JST に起動する
// 前日 = 昨日の 00:00:00 〜 23:59:59 JST
function getPreviousDayRange(): { start: Date; end: Date; dateStr: string } {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  const d = jstNow.getUTCDate();

  const start = new Date(Date.UTC(y, m, d - 1, 0, 0, 0, 0) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d - 1, 23, 59, 59, 999) - JST_OFFSET_MS);

  const jstPrevDay = new Date(start.getTime() + JST_OFFSET_MS);
  const mm = String(jstPrevDay.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jstPrevDay.getUTCDate()).padStart(2, '0');
  return { start, end, dateStr: `${mm}/${dd}` };
}

async function main(): Promise<void> {
  const { targetCatIds } = loadConfig();
  const { start, end, dateStr } = getPreviousDayRange();

  console.log(`📝 日次メモレポート実行: ${dateStr}`);

  const memos = await getPreviousDayMemos(targetCatIds, start, end);

  if (memos.length === 0) {
    console.log('📝 メモなし - スキップ');
    await disconnect();
    return;
  }

  for (const { catName, memo } of memos) {
    await postToSlack([
      headerBlock(`📝 ${catName} のメモ (${dateStr})`),
      dividerBlock(),
      sectionBlock(memo),
    ]);
    console.log(`✅ ${catName}: Slack 送信完了`);
  }

  await disconnect();
  console.log('📝 完了');
}

main().catch((err: unknown) => {
  console.error('❌ 日次メモレポート失敗:', err);
  process.exit(1);
});
