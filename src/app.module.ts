import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthenticationModule } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AuthModule } from './features/auth/auth.module.js';
import { MetricsModule } from './features/metrics/metrics.module.js';
import { ProfessionalsModule } from './features/professionals/professionals.module.js';
import { ServicesModule } from './features/services/services.module.js';
import { UnitsModule } from './features/units/units.module.js';
import { UsersModule } from './features/users/users.module.js';
import { validateEnv, type Env } from './shared/config/env.schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        drizzle,
        connection: config.get('DATABASE_URL', { infer: true }),
      }),
    }),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        accessToken: {
          key: config.get('JWT_SECRET', { infer: true }),
          issuer: 'agendai-api',
          audience: 'agendai-api',
          ttl: '15m',
        },
        refreshToken: { ttl: '30d', absoluteTtl: '90d' },
      }),
    }),
    AuthorizationModule.forRoot(),
    UsersModule,
    AuthModule,
    UnitsModule,
    ServicesModule,
    ProfessionalsModule,
    MetricsModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: StandardSchemaValidationPipe }],
})
export class AppModule {}
