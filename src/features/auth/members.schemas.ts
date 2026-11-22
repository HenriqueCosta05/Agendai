import { z } from 'zod';

export const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(12).max(128),
  role: z.enum(['admin', 'professional', 'client']),
});
export type CreateMemberDto = z.infer<typeof createMemberSchema>;
