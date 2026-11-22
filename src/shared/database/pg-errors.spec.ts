import { describe, expect, it } from 'vitest';
import { isForeignKeyViolation, isUniqueViolation } from './pg-errors.js';

describe('pg-errors', () => {
  it('reads the code from the error or from its cause', () => {
    expect(isForeignKeyViolation({ code: '23503' })).toBe(true);
    expect(isUniqueViolation({ message: 'wrapped', cause: { code: '23505' } })).toBe(true);
  });

  it('does not confuse codes or accept non-errors', () => {
    expect(isForeignKeyViolation({ code: '23505' })).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
  });
});
