import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  durationMin: z.number().int().min(5).max(1440),
  bufferMin: z.number().int().min(0).max(240).default(0),
  capacity: z.number().int().min(1).max(500).default(1),
});
export type CreateServiceDto = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'At least one field is required');
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
