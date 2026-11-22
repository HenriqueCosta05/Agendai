import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import type { User } from '../users/user.js';
import { AccessPolicy } from './access.policy.js';
import { CredentialsService } from './credentials.service.js';
import { createMemberSchema, type CreateMemberDto } from './members.schemas.js';

@Controller('members')
export class MembersController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post()
  @Can(AccessPolicy, 'manage')
  create(@CurrentUser() admin: User, @Body({ schema: createMemberSchema }) body: CreateMemberDto) {
    return this.credentialsService.addMember(admin.tenantId, body);
  }
}
