import { z } from 'zod';

export const applicationStatusSchema = z.enum([
  'draft',
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const applicationSchema = z.object({
  id: z.string().uuid().optional(),
  company: z.string().min(1),
  role: z.string().min(1),
  jobUrl: z.string().url(),
  jdSnapshot: z.string(),
  status: applicationStatusSchema.default('draft'),
  notes: z.string().optional(),
  appliedAt: z.string().nullable().optional(),
  source: z.string().optional(),
});

export type Application = z.infer<typeof applicationSchema>;

export const createApplicationSchema = applicationSchema.omit({ id: true });
export const updateApplicationSchema = applicationSchema.partial();
