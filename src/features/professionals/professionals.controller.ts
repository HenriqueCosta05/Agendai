import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { AccessPolicy } from '../auth/access.policy.js';
import type { User } from '../users/user.js';
import {
  createProfessionalSchema,
  updateProfessionalSchema,
  type CreateProfessionalDto,
  type UpdateProfessionalDto,
} from './professionals.schemas.js';
import { ProfessionalsService } from './professionals.service.js';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get()
  @Can(AccessPolicy, 'read')
  list(@CurrentUser() user: User) {
    return this.professionalsService.list(user.tenantId);
  }

  @Get(':id')
  @Can(AccessPolicy, 'read')
  get(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.get(user.tenantId, id);
  }

  @Post()
  @Can(AccessPolicy, 'manage')
  create(@CurrentUser() user: User, @Body({ schema: createProfessionalSchema }) body: CreateProfessionalDto) {
    return this.professionalsService.create(user.tenantId, body);
  }

  @Patch(':id')
  @Can(AccessPolicy, 'manage')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateProfessionalSchema }) body: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Can(AccessPolicy, 'manage')
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.remove(user.tenantId, id);
  }
}
