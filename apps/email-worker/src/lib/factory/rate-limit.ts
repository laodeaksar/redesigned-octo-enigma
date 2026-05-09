import { redis } from "@/config";

interface RateLimitOpts {
  email: string;
  queueName: string;
  ttlSec: number;
}

export async function isRateLimited(opts: RateLimitOpts): Promise<boolean> {
  const key = `ratelimit:${opts.queueName}:${opts.email}`;

  if (await redis.get(key)) return true;

  await redis.setex(key, opts.ttlSec, "1");
  return false;
}
