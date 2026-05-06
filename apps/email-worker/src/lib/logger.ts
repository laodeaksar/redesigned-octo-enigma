import pino, { LoggerOptions } from "pino";
import { env } from "../config";

const redactPaths = [
  "password",
  "pass",
  "pwd",
  "token",
  "secret",
  "apiKey",
  "apikey",
  "authorization",
  "cookie",
  "*.headers.authorization",
  "*.headers.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
];

const pinoOptions: LoggerOptions = {
  level: env.LOG_LEVEL ?? "info",
  redact: {
    paths: redactPaths,
    remove: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: "email-worker",
    env: env.NODE_ENV ?? "development",
    pid: process.pid,
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

export const logger =
  env.NODE_ENV !== "production"
    ? pino({
        ...pinoOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
            errorLikeObjectKeys: ["err", "error"],
          },
        },
      })
    : pino(pinoOptions);
