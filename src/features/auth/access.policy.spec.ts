import { describe, expect, it } from 'vitest';
import type { Role, User } from '../users/user.js';
import { AccessPolicy } from './access.policy.js';

const userWith = (role: Role): User => ({ id: 'u1', tenantId: 't1', name: 'Test', email: 't@example.com', role });

describe('AccessPolicy', () => {
  const policy = new AccessPolicy();

  it('lets every signed-in role read and rejects guests', () => {
    expect(policy.read(userWith('admin'))).toBe(true);
    expect(policy.read(userWith('professional'))).toBe(true);
    expect(policy.read(userWith('client'))).toBe(true);
    expect(policy.read(null)).toBe(false);
  });

  it('lets only admins manage', () => {
    expect(policy.manage(userWith('admin'))).toBe(true);
    expect(policy.manage(userWith('professional'))).toBe(false);
    expect(policy.manage(userWith('client'))).toBe(false);
    expect(policy.manage(null)).toBe(false);
  });
});
