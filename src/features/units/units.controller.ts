import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { AccessPolicy } from '../auth/access.policy.js';
import type { User } from '../users/user.js';
import { createUnitSchema, updateUnitSchema, type CreateUnitDto, type UpdateUnitDto } from './units.schemas.js';
import { UnitsService } from './units.service.js';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @Can(AccessPolicy, 'read')
  list(@CurrentUser() user: User) {
    return this.unitsService.list(user.tenantId);
  }

  @Get(':id')
  @Can(AccessPolicy, 'read')
  get(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.get(user.tenantId, id);
  }

  @Post()
  @Can(AccessPolicy, 'manage')
  create(@CurrentUser() user: User, @Body({ schema: createUnitSchema }) body: CreateUnitDto) {
    return this.unitsService.create(user.tenantId, body);
  }

  @Patch(':id')
  @Can(AccessPolicy, 'manage')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateUnitSchema }) body: UpdateUnitDto,
  ) {
    return this.unitsService.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Can(AccessPolicy, 'manage')
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.remove(user.tenantId, id);
  }
}
