import { z } from 'zod';

export const applicationStatusSchema = z.enum([
  'draft',
  'saved',
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
  jdSnapshot: z.string().default(''),
  status: applicationStatusSchema.default('draft'),
  notes: z.string().optional(),
  source: z.string().optional(),
  savedAt: z.string().nullable().optional(),
  appliedAt: z.string().nullable().optional(),
  interviewDate: z.string().nullable().optional(),
  followUpSentAt: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
});

export type Application = z.infer<typeof applicationSchema>;

export const createApplicationSchema = applicationSchema.omit({ id: true });
export const updateApplicationSchema = applicationSchema.partial();

export const syncApplicationsSchema = z.object({
  applications: z.array(createApplicationSchema),
});
export type SyncApplicationsInput = z.infer<typeof syncApplicationsSchema>;

export const syncProfileSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
});
export type SyncProfileInput = z.infer<typeof syncProfileSchema>;
