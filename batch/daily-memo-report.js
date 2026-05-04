// scripts/slack/lib/config.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
function loadConfig() {
  const configPath = join(process.cwd(), "config/slack-notify.json");
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

// scripts/slack/lib/slack.ts
var headerBlock = (text) => ({
  type: "header",
  text: { type: "plain_text", text }
});
var sectionBlock = (text) => ({
  type: "section",
  text: { type: "mrkdwn", text }
});
var dividerBlock = () => ({ type: "divider" });
async function postToSlack(blocks) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("SLACK_WEBHOOK_URL \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093");
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks })
  });
  if (!res.ok) throw new Error(`Slack POST \u5931\u6557: ${res.status} ${res.statusText}`);
}

// scripts/slack/lib/db.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();
async function getPreviousDayMemos(catIds, dayStart, dayEnd) {
  const notes = await prisma.dailyNote.findMany({
    where: {
      catId: { in: catIds },
      date: { gte: dayStart, lte: dayEnd },
      AND: [{ memo: { not: null } }, { memo: { not: "" } }]
    },
    select: { memo: true, cat: { select: { name: true } } }
  });
  return notes.filter((n) => !!n.memo).map((n) => ({ catName: n.cat.name, memo: n.memo }));
}
async function disconnect() {
  await prisma.$disconnect();
}

// scripts/slack/daily-memo-report.ts
var JST_OFFSET_MS = 9 * 60 * 60 * 1e3;
function getPreviousDayRange() {
  const now = /* @__PURE__ */ new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  const d = jstNow.getUTCDate();
  const start = new Date(Date.UTC(y, m, d - 1, 0, 0, 0, 0) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d - 1, 23, 59, 59, 999) - JST_OFFSET_MS);
  const jstPrevDay = new Date(start.getTime() + JST_OFFSET_MS);
  const mm = String(jstPrevDay.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jstPrevDay.getUTCDate()).padStart(2, "0");
  return { start, end, dateStr: `${mm}/${dd}` };
}
async function main() {
  const { targetCatIds } = loadConfig();
  const { start, end, dateStr } = getPreviousDayRange();
  console.log(`\u{1F4DD} \u65E5\u6B21\u30E1\u30E2\u30EC\u30DD\u30FC\u30C8\u5B9F\u884C: ${dateStr}`);
  const memos = await getPreviousDayMemos(targetCatIds, start, end);
  if (memos.length === 0) {
    console.log("\u{1F4DD} \u30E1\u30E2\u306A\u3057 - \u30B9\u30AD\u30C3\u30D7");
    await disconnect();
    return;
  }
  for (const { catName, memo } of memos) {
    await postToSlack([
      headerBlock(`\u{1F4DD} ${catName} \u306E\u30E1\u30E2 (${dateStr})`),
      dividerBlock(),
      sectionBlock(memo)
    ]);
    console.log(`\u2705 ${catName}: Slack \u9001\u4FE1\u5B8C\u4E86`);
  }
  await disconnect();
  console.log("\u{1F4DD} \u5B8C\u4E86");
}
main().catch((err) => {
  console.error("\u274C \u65E5\u6B21\u30E1\u30E2\u30EC\u30DD\u30FC\u30C8\u5931\u6557:", err);
  process.exit(1);
});
