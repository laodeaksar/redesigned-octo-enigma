import type { z } from "zod";
import { EmailResult } from "@repo/common/types";
import { EmailPayload} from "@/lib/mailer";

export interface EmailHandlerResult {
  messageId?: string;
  provider?: EmailResult["provider"];
  reason?: "rate_limited" | "expired" | "duplicate";
  sentAt?: string;
  status: "sent" | "skipped";
  to?: string;
}

export interface CreateEmailHandlerOpts<T> }> {
  queueName: string;
  schema: z.ZodSchema<T>;
  getPayload: (data: T) => EmailPayload;
  checkExpiry?: (data: T) => boolean;
  /*
  getExtraHeaders?: (data: T) => Record<string, string>;
  getTemplate: (data: T) => EmailTemplate;
  */
  rateLimitSec?: number;
  timeoutMs?: number;
}
