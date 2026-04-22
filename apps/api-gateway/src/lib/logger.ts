/**
 * Structured Logger Implementation for API Gateway
 * Dengan level log yang terstandarisasi dan field metadata
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

const LOG_LEVEL_NAMES = ["debug", "info", "warn", "error", "critical"];

class Logger {
  private currentLevel: LogLevel = process.env.NODE_ENV === "production" 
    ? LogLevel.INFO 
    : LogLevel.DEBUG;

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (level < this.currentLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_NAMES[level],
      message,
      service: "api-gateway",
      ...metadata
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(output);
        break;
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  critical(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.CRITICAL, message, metadata);
  }
}

export const logger = new Logger();
