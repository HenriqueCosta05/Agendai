import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { isForeignKeyViolation } from '../../shared/database/pg-errors.js';
import { services } from '../../shared/database/schema.js';
import type { CreateServiceDto, UpdateServiceDto } from './services.schemas.js';

const inTenant = (tenantId: string, id: string) => and(eq(services.tenantId, tenantId), eq(services.id, id));

@Injectable()
export class ServicesService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  list(tenantId: string) {
    return this.db.select().from(services).where(eq(services.tenantId, tenantId)).orderBy(services.name);
  }

  async get(tenantId: string, id: string) {
    const [service] = await this.db.select().from(services).where(inTenant(tenantId, id));
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async create(tenantId: string, input: CreateServiceDto) {
    const [service] = await this.db.insert(services).values({ ...input, tenantId }).returning();
    return service;
  }

  async update(tenantId: string, id: string, changes: UpdateServiceDto) {
    const [service] = await this.db.update(services).set(changes).where(inTenant(tenantId, id)).returning();
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async remove(tenantId: string, id: string) {
    const deleted = await this.db
      .delete(services)
      .where(inTenant(tenantId, id))
      .returning({ id: services.id })
      .catch((error: unknown) => {
        if (isForeignKeyViolation(error)) {
          throw new ConflictException('Service is referenced by class sessions');
        }
        throw error;
      });
    if (deleted.length === 0) {
      throw new NotFoundException('Service not found');
    }
  }
}
