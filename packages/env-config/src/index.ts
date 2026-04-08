import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  MONGODB_URI: z.string().url(),
  MIDTRANS_SERVER_KEY: z.string(),
  REDIS_URL: z.string().url(),
  PORT: z.string().default("3000"),
});

export type Env = z.infer<typeof envSchema>;
