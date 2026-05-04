import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SlackNotifyConfig {
  targetCatIds: number[];
}

export function loadConfig(): SlackNotifyConfig {
  const configPath = join(process.cwd(), 'config/slack-notify.json');
  const raw = readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as SlackNotifyConfig;
}
