import { z } from 'zod';

const optionalUrl = z
  .union([z.string().url(), z.literal(''), z.undefined(), z.null()])
  .transform((v) => (v ? v : undefined));

export const workHistoryEntrySchema = z.object({
  id: z.string().uuid().optional(),
  company: z.string().min(1),
  title: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().nullable(),
  current: z.boolean().default(false),
  location: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const educationEntrySchema = z.object({
  id: z.string().uuid().optional(),
  institution: z.string().min(1),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
});

export const profileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  workAuthorization: z.string().optional(),
  requiresSponsorship: z.boolean().optional(),
  yearsExperience: z.number().int().nonnegative().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  roleInterest: z.string().optional(),
  desiredSalary: z.string().optional(),
  availableStartDate: z.string().optional(),
  noticePeriod: z.string().optional(),
  eeoAge: z.number().int().positive().optional(),
  eeoGender: z.string().optional(),
  eeoEthnicity: z.array(z.string()).default([]),
  eeoCommunities: z.array(z.string()).default([]),
  eeoVeteranStatus: z.string().optional(),
  eeoDisabilityStatus: z.string().optional(),
  workHistory: z.array(workHistoryEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  skills: z.array(z.string()).default([]),
  websites: z.array(z.string()).default([]),
  baseCvText: z.string().optional(),
  cvFile: z
    .object({
      name: z.string(),
      type: z.string(),
      size: z.number(),
      dataUrl: z.string(),
      uploadedAt: z.number(),
    })
    .optional(),
});

export type Profile = z.infer<typeof profileSchema>;
export type WorkHistoryEntry = z.infer<typeof workHistoryEntrySchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
