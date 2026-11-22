import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tenants, users } from '../../shared/database/schema.js';
import type { Role, User } from './user.js';

const columns = { id: users.id, tenantId: users.tenantId, name: users.name, email: users.email, role: users.role };

const normalize = (email: string) => email.trim().normalize('NFC').toLowerCase();

export type NewMember = { name: string; email: string; passwordHash: string; role: Role };

@Injectable()
export class UsersRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async createWithTenant(tenantName: string, admin: Omit<NewMember, 'role'>): Promise<User | null> {
    return this.db.transaction(async (tx) => {
      const email = normalize(admin.email);
      const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (existing) {
        return null;
      }
      const [tenant] = await tx.insert(tenants).values({ name: tenantName }).returning({ id: tenants.id });
      const values = { ...admin, email, tenantId: tenant!.id, role: 'admin' as const };
      const [user] = await tx.insert(users).values(values).returning(columns);
      return user ?? null;
    });
  }

  async createInTenant(tenantId: string, member: NewMember): Promise<User | null> {
    const [user] = await this.db
      .insert(users)
      .values({ ...member, email: normalize(member.email), tenantId })
      .onConflictDoNothing({ target: users.email })
      .returning(columns);
    return user ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select(columns).from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async findCredentials(email: string): Promise<{ user: User; passwordHash: string } | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, normalize(email)));
    if (!row) {
      return null;
    }
    const { id, tenantId, name, role } = row;
    return { user: { id, tenantId, name, email: row.email, role }, passwordHash: row.passwordHash };
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }
}
