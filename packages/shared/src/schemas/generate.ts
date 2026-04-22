import { z } from 'zod';

export const toneSchema = z.enum(['formal', 'friendly', 'enthusiastic', 'concise']);

export const generateCoverLetterSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
  jobDescription: z.string().min(20),
  company: z.string().min(1),
  role: z.string().min(1),
  tone: toneSchema.default('friendly'),
  extraInstructions: z.string().optional(),
});

export const generateTailoredCvSchema = z.object({
  applicationId: z.string().uuid(),
  emphasis: z.array(z.string()).optional(),
});

export const parseCvSchema = z.object({
  cvText: z.string().min(50),
});

export const answerQuestionsSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
  jobDescription: z.string().default(''),
  company: z.string().default(''),
  role: z.string().default(''),
  questions: z.array(z.string().min(1)).min(1).max(20),
});

export type AnswerQuestionsInput = z.infer<typeof answerQuestionsSchema>;

export const followUpSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
  company: z.string().min(1),
  role: z.string().min(1),
  daysSinceApplied: z.number().int().min(0).default(7),
  notes: z.string().optional(),
});
export type FollowUpInput = z.infer<typeof followUpSchema>;

export const parsedCvSchema = z.object({
  websites: z.array(z.string()).default([]),
  workHistory: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        startDate: z.string().default(''),
        endDate: z.string().nullable().default(null),
        current: z.boolean().default(false),
        location: z.string().optional(),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().optional(),
        fieldOfStudy: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        gpa: z.string().optional(),
      }),
    )
    .default([]),
  skills: z.array(z.string()).default([]),
});

export type GenerateCoverLetterInput = z.infer<typeof generateCoverLetterSchema>;
export type GenerateTailoredCvInput = z.infer<typeof generateTailoredCvSchema>;
export type ParseCvInput = z.infer<typeof parseCvSchema>;
export type ParsedCv = z.infer<typeof parsedCvSchema>;
