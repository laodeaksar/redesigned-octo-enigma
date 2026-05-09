import { env } from "@/config";
import type { EmailPayload } from "./schemas";

export function formatSender(): string {
  return `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`;
}

export function resolveReplyTo(
  payload: EmailPayload,
): string | string[] | undefined {
  return payload.replyTo ?? env.EMAIL_REPLY_TO ?? undefined;
}
