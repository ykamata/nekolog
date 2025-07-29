import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';
export const logger = pino({
  level,
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'yyyy-mm-dd HH:MM:ss' },
  },
});
