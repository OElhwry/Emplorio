import { z } from 'zod';

export const requestMagicLinkSchema = z.object({
  email: z.string().email(),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(16),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;
export type VerifyMagicLinkInput = z.infer<typeof verifyMagicLinkSchema>;
