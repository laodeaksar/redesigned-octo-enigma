export const SMTP_CONFIG = {
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
} as const;
