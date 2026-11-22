import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { isForeignKeyViolation, isUniqueViolation } from '../../shared/database/pg-errors.js';
import { professionals, units, users } from '../../shared/database/schema.js';
import type { CreateProfessionalDto, UpdateProfessionalDto } from './professionals.schemas.js';

const view = {
  id: professionals.id,
  userId: professionals.userId,
  unitId: professionals.unitId,
  name: users.name,
  email: users.email,
};

const inTenant = (tenantId: string, id: string) =>
  and(eq(professionals.tenantId, tenantId), eq(professionals.id, id));

@Injectable()
export class ProfessionalsService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  list(tenantId: string) {
    return this.selectView().where(eq(professionals.tenantId, tenantId)).orderBy(users.name);
  }

  async get(tenantId: string, id: string) {
    const [professional] = await this.selectView().where(inTenant(tenantId, id));
    if (!professional) {
      throw new NotFoundException('Professional not found');
    }
    return professional;
  }

  async create(tenantId: string, input: CreateProfessionalDto) {
    await this.assertUnit(tenantId, input.unitId);
    await this.assertProfessionalUser(tenantId, input.userId);
    const [created] = await this.db
      .insert(professionals)
      .values({ ...input, tenantId })
      .returning({ id: professionals.id })
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) {
          throw new ConflictException('User is already a professional');
        }
        throw error;
      });
    return this.get(tenantId, created!.id);
  }

  async update(tenantId: string, id: string, changes: UpdateProfessionalDto) {
    await this.assertUnit(tenantId, changes.unitId);
    const updated = await this.db
      .update(professionals)
      .set(changes)
      .where(inTenant(tenantId, id))
      .returning({ id: professionals.id });
    if (updated.length === 0) {
      throw new NotFoundException('Professional not found');
    }
    return this.get(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const deleted = await this.db
      .delete(professionals)
      .where(inTenant(tenantId, id))
      .returning({ id: professionals.id })
      .catch((error: unknown) => {
        if (isForeignKeyViolation(error)) {
          throw new ConflictException('Professional has bookings');
        }
        throw error;
      });
    if (deleted.length === 0) {
      throw new NotFoundException('Professional not found');
    }
  }

  private selectView() {
    return this.db.select(view).from(professionals).innerJoin(users, eq(users.id, professionals.userId));
  }

  private async assertUnit(tenantId: string, unitId: string) {
    const [unit] = await this.db
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.id, unitId), eq(units.tenantId, tenantId)));
    if (!unit) {
      throw new BadRequestException('Unit does not belong to this tenant');
    }
  }

  private async assertProfessionalUser(tenantId: string, userId: string) {
    const [user] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
    if (user?.role !== 'professional') {
      throw new BadRequestException('User must exist in this tenant with the professional role');
    }
  }
}
