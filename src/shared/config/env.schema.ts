import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development')
    .describe('Runtime mode: development, test or production.'),
  PORT: z.coerce.number().int().default(3000).describe('TCP port the HTTP server listens on.'),
  DATABASE_URL: z.url().describe('PostgreSQL connection string used by the API and the migrations.'),
  JWT_SECRET: z.string().min(32).describe('Secret that signs access tokens. Use at least 32 characters.'),
  OBSERVE_APP_KEY: z.string().optional().describe('NestJS Observe application key. Without it no telemetry is sent.'),
  OBSERVE_APP_SECRET: z
    .string()
    .optional()
    .describe('NestJS Observe application secret, paired with OBSERVE_APP_KEY.'),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): Env => envSchema.parse(config);
