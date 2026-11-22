import type {} from '@nestjs/authentication';

export type Role = 'admin' | 'professional' | 'client';

export type User = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
};

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: User;
  }
}
