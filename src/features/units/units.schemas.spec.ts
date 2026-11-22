import { describe, expect, it } from 'vitest';
import { createUnitSchema, updateUnitSchema } from './units.schemas.js';

describe('unit schemas', () => {
  it('accepts a valid IANA timezone', () => {
    const result = createUnitSchema.safeParse({ name: 'Downtown', timezone: 'America/Sao_Paulo' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown timezone', () => {
    const result = createUnitSchema.safeParse({ name: 'Downtown', timezone: 'Mars/Olympus' });
    expect(result.success).toBe(false);
  });

  it('requires at least one field on update', () => {
    expect(updateUnitSchema.safeParse({}).success).toBe(false);
    expect(updateUnitSchema.safeParse({ name: 'Uptown' }).success).toBe(true);
  });
});
