import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { isForeignKeyViolation } from '../../shared/database/pg-errors.js';
import { units } from '../../shared/database/schema.js';
import type { CreateUnitDto, UpdateUnitDto } from './units.schemas.js';

const inTenant = (tenantId: string, id: string) => and(eq(units.tenantId, tenantId), eq(units.id, id));

@Injectable()
export class UnitsService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  list(tenantId: string) {
    return this.db.select().from(units).where(eq(units.tenantId, tenantId)).orderBy(units.name);
  }

  async get(tenantId: string, id: string) {
    const [unit] = await this.db.select().from(units).where(inTenant(tenantId, id));
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return unit;
  }

  async create(tenantId: string, input: CreateUnitDto) {
    const [unit] = await this.db.insert(units).values({ ...input, tenantId }).returning();
    return unit;
  }

  async update(tenantId: string, id: string, changes: UpdateUnitDto) {
    const [unit] = await this.db.update(units).set(changes).where(inTenant(tenantId, id)).returning();
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return unit;
  }

  async remove(tenantId: string, id: string) {
    const deleted = await this.db
      .delete(units)
      .where(inTenant(tenantId, id))
      .returning({ id: units.id })
      .catch((error: unknown) => {
        if (isForeignKeyViolation(error)) {
          throw new ConflictException('Unit still has professionals');
        }
        throw error;
      });
    if (deleted.length === 0) {
      throw new NotFoundException('Unit not found');
    }
  }
}
