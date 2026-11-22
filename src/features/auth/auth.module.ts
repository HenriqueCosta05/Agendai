import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AccessPolicy } from './access.policy.js';
import { AuthController } from './auth.controller.js';
import { CredentialsService } from './credentials.service.js';
import { DrizzleRefreshTokenStore } from './drizzle-refresh-token.store.js';
import { JwtAuth } from './jwt-auth.provider.js';
import { MembersController } from './members.controller.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, MembersController],
  providers: [JwtAuth, CredentialsService, DrizzleRefreshTokenStore, AccessPolicy],
})
export class AuthModule {}
