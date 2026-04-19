import { pino } from 'pino';
import { env } from '../env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', '*.email', '*.phone'],
    censor: '[redacted]',
  },
});
