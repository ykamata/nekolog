type TextObject = { type: 'plain_text' | 'mrkdwn'; text: string };

export interface HeaderBlock { type: 'header'; text: TextObject }
export interface SectionBlock { type: 'section'; text: TextObject }
export interface DividerBlock { type: 'divider' }
export type SlackBlock = HeaderBlock | SectionBlock | DividerBlock;

export const headerBlock = (text: string): HeaderBlock => ({
  type: 'header',
  text: { type: 'plain_text', text },
});

export const sectionBlock = (text: string): SectionBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text },
});

export const dividerBlock = (): DividerBlock => ({ type: 'divider' });

export async function postToSlack(blocks: SlackBlock[]): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL が設定されていません');

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });

  if (!res.ok) throw new Error(`Slack POST 失敗: ${res.status} ${res.statusText}`);
}
