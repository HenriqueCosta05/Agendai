import { z } from 'zod';

const isTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const createUnitSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().refine(isTimezone, 'Unknown IANA timezone'),
});
export type CreateUnitDto = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = createUnitSchema
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'At least one field is required');
export type UpdateUnitDto = z.infer<typeof updateUnitSchema>;
