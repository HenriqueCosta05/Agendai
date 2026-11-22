import { z } from 'zod';

export const signUpSchema = z.object({
  tenantName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(12).max(128),
});
export type SignUpDto = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().max(128),
});
export type SignInDto = z.infer<typeof signInSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
