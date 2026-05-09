import { emailSendDuration, emailsFailed, emailsSent } from "@/metrics";
import type { EmailResult } from "@repo/common/types";

interface SuccessMetricOpts {
  durationSec: number;
  provider: EmailResult["provider"];
  queueName: string;
}

interface FailureMetricOpts {
  queueName: string;
}

export function recordSuccess(opts: SuccessMetricOpts): void {
  emailsSent.inc({ type: opts.queueName, provider: opts.provider });
  emailSendDuration.observe(
    { type: opts.queueName, provider: opts.provider },
    opts.durationSec
  );
}

export function recordFailure(opts: FailureMetricOpts): void {
  emailsFailed.inc({ type: opts.queueName });
}
