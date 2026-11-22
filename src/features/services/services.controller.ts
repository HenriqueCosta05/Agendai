import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { AccessPolicy } from '../auth/access.policy.js';
import type { User } from '../users/user.js';
import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceDto,
  type UpdateServiceDto,
} from './services.schemas.js';
import { ServicesService } from './services.service.js';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Can(AccessPolicy, 'read')
  list(@CurrentUser() user: User) {
    return this.servicesService.list(user.tenantId);
  }

  @Get(':id')
  @Can(AccessPolicy, 'read')
  get(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.get(user.tenantId, id);
  }

  @Post()
  @Can(AccessPolicy, 'manage')
  create(@CurrentUser() user: User, @Body({ schema: createServiceSchema }) body: CreateServiceDto) {
    return this.servicesService.create(user.tenantId, body);
  }

  @Patch(':id')
  @Can(AccessPolicy, 'manage')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateServiceSchema }) body: UpdateServiceDto,
  ) {
    return this.servicesService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Can(AccessPolicy, 'manage')
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.remove(user.tenantId, id);
  }
}
