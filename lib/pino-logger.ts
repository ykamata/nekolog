import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';
const isDev = process.env.NODE_ENV !== 'production';

export const logger = isDev
  ? pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'yyyy-mm-dd HH:MM:ss' },
      },
    })
  : pino({ level });
