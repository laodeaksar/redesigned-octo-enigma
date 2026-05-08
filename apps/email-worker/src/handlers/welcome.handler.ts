// =============================================================================
// Welcome email handler
// Queue: email.welcome
// =============================================================================

import { z } from "zod";

import { QUEUES } from "@repo/common/events";
import type { WelcomeEmailJobData } from "@repo/common/types";

import { createEmailHandler } from "@/lib/create-email-handler";
import { welcomeTemplate } from "@/lib/templates";

const schema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
});

export const handleWelcomeEmail = createEmailHandler<WelcomeEmailJobData>({
  queueName: QUEUES.EMAIL_WELCOME,
  schema,
  getTemplate: data => welcomeTemplate({ name: data.name, email: data.email }),
  rateLimitSec: 60,
});
