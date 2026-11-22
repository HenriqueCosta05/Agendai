import { ConflictException, Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import type { Role, User } from '../users/user.js';
import { UsersRepository } from '../users/users.repository.js';

export type SignUpInput = { tenantName: string; name: string; email: string; password: string };
export type MemberInput = { name: string; email: string; password: string; role: Role };

@Injectable()
export class CredentialsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async registerTenant(input: SignUpInput): Promise<User> {
    const passwordHash = await this.passwordHasher.hash(input.password);
    const { tenantName, name, email } = input;
    const user = await this.usersRepository.createWithTenant(tenantName, { name, email, passwordHash });
    if (!user) {
      throw new ConflictException('Email already registered');
    }
    return user;
  }

  async addMember(tenantId: string, input: MemberInput): Promise<User> {
    const passwordHash = await this.passwordHasher.hash(input.password);
    const { name, email, role } = input;
    const user = await this.usersRepository.createInTenant(tenantId, { name, email, role, passwordHash });
    if (!user) {
      throw new ConflictException('Email already registered');
    }
    return user;
  }

  async verify(email: string, password: string): Promise<User | null> {
    const found = await this.usersRepository.findCredentials(email);
    const valid = await this.passwordHasher.verify(password, found?.passwordHash);
    if (!valid || !found) {
      return null;
    }
    if (this.passwordHasher.needsRehash(found.passwordHash)) {
      await this.usersRepository.updatePasswordHash(found.user.id, await this.passwordHasher.hash(password));
    }
    return found.user;
  }
}
