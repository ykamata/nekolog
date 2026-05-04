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
function localDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
async function getCatName(catId) {
  const cat = await prisma.cat.findUniqueOrThrow({
    where: { id: catId },
    select: { name: true }
  });
  return cat.name;
}
async function getWeeklyMealSummary(catId, weekStart, weekEnd) {
  const records = await prisma.mealRecord.findMany({
    where: { catId, mealTime: { gte: weekStart, lte: weekEnd } },
    select: { mealTime: true, calories: true }
  });
  const dayMap = /* @__PURE__ */ new Map();
  for (const r of records) {
    const key = localDateKey(r.mealTime);
    dayMap.set(key, (dayMap.get(key) ?? 0) + r.calories);
  }
  const result = [];
  const cur = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    result.push({
      date: new Date(cur),
      totalCalories: dayMap.get(localDateKey(cur)) ?? 0
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}
async function disconnect() {
  await prisma.$disconnect();
}

// scripts/slack/weekly-meal-report.ts
var DAY_NAMES = ["\u65E5", "\u6708", "\u706B", "\u6C34", "\u6728", "\u91D1", "\u571F"];
function getPreviousWeekRange() {
  const now = /* @__PURE__ */ new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  return { start, end };
}
function formatMMDD(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}
function buildTable(days) {
  const header = "\u66DC\u65E5  \u65E5\u4ED8      \u30AB\u30ED\u30EA\u30FC";
  const rows = days.map(({ date, totalCalories }) => {
    const dow = DAY_NAMES[date.getDay()];
    const mmdd = formatMMDD(date);
    const kcal = String(Math.round(totalCalories)).padStart(6);
    return `${dow}     ${mmdd}   ${kcal} kcal`;
  });
  return [header, ...rows].join("\n");
}
async function main() {
  const { targetCatIds } = loadConfig();
  const { start, end } = getPreviousWeekRange();
  const rangeStr = `${formatMMDD(start)} \u301C ${formatMMDD(end)}`;
  console.log(`\u{1F37D}\uFE0F \u9031\u6B21\u98DF\u4E8B\u30EC\u30DD\u30FC\u30C8\u5B9F\u884C: ${rangeStr}`);
  for (const catId of targetCatIds) {
    const catName = await getCatName(catId);
    const days = await getWeeklyMealSummary(catId, start, end);
    const table = buildTable(days);
    await postToSlack([
      headerBlock(`\u{1F431} ${catName} \u306E\u98DF\u4E8B\u8A18\u9332 (${rangeStr})`),
      dividerBlock(),
      sectionBlock(`\`\`\`${table}\`\`\``)
    ]);
    console.log(`\u2705 ${catName}: Slack \u9001\u4FE1\u5B8C\u4E86`);
  }
  await disconnect();
  console.log("\u{1F37D}\uFE0F \u5B8C\u4E86");
}
main().catch((err) => {
  console.error("\u274C \u9031\u6B21\u98DF\u4E8B\u30EC\u30DD\u30FC\u30C8\u5931\u6557:", err);
  process.exit(1);
});
