import { z } from 'zod';

export const requestCodeSchema = z.object({
  email: z.string().email(),
});

export const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'code must be 6 digits'),
  remember: z.boolean().default(false),
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

// kept as aliases for any old imports
export const requestMagicLinkSchema = requestCodeSchema;
export const verifyMagicLinkSchema = verifyCodeSchema;
export type RequestMagicLinkInput = RequestCodeInput;
export type VerifyMagicLinkInput = VerifyCodeInput;
