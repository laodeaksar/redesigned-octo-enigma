// =============================================================================
// Welcome email handler
// Queue: email.welcome
// =============================================================================

import type { Processor } from "@repo/common/events";
import type { WelcomeEmailJobData } from "@repo/common/types";
import { sendEmail } from "@/lib/mailer";
import { welcomeTemplate } from "@/lib/templates";
import { z } from "zod";

// Validasi payload biar fail fast kalau data rusak
const WelcomeEmailSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
});

export const handleWelcomeEmail: Processor<WelcomeEmailJobData> = async (job) => {
  const jobId = job.id ?? 'unknown';
  
  try {
    // 1. Validasi data
    const { email, name } = WelcomeEmailSchema.parse(job.data);

    // 2. Generate template
    const template = welcomeTemplate({ name, email });

    // 3. Kirim email dengan timeout
    const result = await Promise.race([
      sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Email provider timeout after 10s')), 10000)
      ),
    ]);

    // 4. Log sukses dengan context
    console.info(
      `[welcome] Job ${jobId} — sent to ${email} via ${result.provider} (${result.messageId})`
    );

    // 5. Return value buat BullMQ dashboard/debugging
    return {
      status: 'sent',
      to: email,
      provider: result.provider,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
    };

  } catch (err) {
    // 6. Log error dengan detail, lalu re-throw biar BullMQ retry
    console.error(
      `[welcome] Job ${jobId} failed for ${job.data?.email}:`,
      err instanceof Error ? err.message : err
    );
    
    // Tambahin context ke error biar keliatan di BullMQ
    if (err instanceof Error) {
      err.message = `[welcome] ${err.message}`;
    }
    
    throw err; // Penting: biar BullMQ jalanin retry/backoff
  }
};