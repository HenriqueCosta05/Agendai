import { z } from 'zod';

export const createProfessionalSchema = z.object({
  userId: z.uuid(),
  unitId: z.uuid(),
});
export type CreateProfessionalDto = z.infer<typeof createProfessionalSchema>;

export const updateProfessionalSchema = z.object({
  unitId: z.uuid(),
});
export type UpdateProfessionalDto = z.infer<typeof updateProfessionalSchema>;
