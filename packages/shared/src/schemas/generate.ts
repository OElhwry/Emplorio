import { z } from 'zod';

export const toneSchema = z.enum(['formal', 'friendly', 'enthusiastic', 'concise']);

export const generateCoverLetterSchema = z.object({
  applicationId: z.string().uuid(),
  tone: toneSchema.default('friendly'),
  extraInstructions: z.string().optional(),
});

export const generateTailoredCvSchema = z.object({
  applicationId: z.string().uuid(),
  emphasis: z.array(z.string()).optional(),
});

export type GenerateCoverLetterInput = z.infer<typeof generateCoverLetterSchema>;
export type GenerateTailoredCvInput = z.infer<typeof generateTailoredCvSchema>;
