import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { AccessPolicy } from '../auth/access.policy.js';
import type { User } from '../users/user.js';
import { AvailabilityService } from './availability.service.js';
import { availabilityQuerySchema, type AvailabilityQuery } from './availability.schemas.js';

@Controller('units')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':id/availability')
  @Can(AccessPolicy, 'read')
  availability(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query({ schema: availabilityQuerySchema }) query: AvailabilityQuery,
  ) {
    return this.availabilityService.forUnit(user.tenantId, id, query);
  }
}
