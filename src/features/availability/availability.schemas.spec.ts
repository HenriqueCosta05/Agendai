import { describe, expect, it } from 'vitest';
import { availabilityQuerySchema } from './availability.schemas.js';

describe('availability query schema', () => {
  it('accepts a single day and a range of up to 31 days', () => {
    expect(availabilityQuerySchema.safeParse({ from: '2026-03-02', to: '2026-03-02' }).success).toBe(true);
    expect(availabilityQuerySchema.safeParse({ from: '2026-03-01', to: '2026-03-31' }).success).toBe(true);
  });

  it('rejects a range longer than 31 days', () => {
    expect(availabilityQuerySchema.safeParse({ from: '2026-03-01', to: '2026-04-01' }).success).toBe(false);
  });

  it('rejects a range that ends before it starts', () => {
    expect(availabilityQuerySchema.safeParse({ from: '2026-03-02', to: '2026-03-01' }).success).toBe(false);
  });

  it('rejects dates that are not real calendar days', () => {
    expect(availabilityQuerySchema.safeParse({ from: '2026-02-30', to: '2026-03-01' }).success).toBe(false);
    expect(availabilityQuerySchema.safeParse({ from: '02/03/2026', to: '2026-03-01' }).success).toBe(false);
  });
});
