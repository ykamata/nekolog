import { loadConfig } from './lib/config';
import { postToSlack, headerBlock, sectionBlock, dividerBlock } from './lib/slack';
import { getPreviousDayMemos, disconnect } from './lib/db';

// スクリプトは毎日 04:00 JST に起動する
// 前日 = 昨日の 00:00:00 〜 23:59:59
function getPreviousDayRange(): { start: Date; end: Date; dateStr: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  const mm = String(start.getMonth() + 1).padStart(2, '0');
  const dd = String(start.getDate()).padStart(2, '0');
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
