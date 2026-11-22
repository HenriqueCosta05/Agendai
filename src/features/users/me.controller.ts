import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { AccessPolicy } from '../auth/access.policy.js';
import type { User } from './user.js';

@Controller('me')
export class MeController {
  @Get()
  @Can(AccessPolicy, 'read')
  me(@CurrentUser() user: User) {
    return user;
  }
}
