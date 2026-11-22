import { randomBytes } from 'node:crypto';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: randomBytes(32).toString('base64'),
      DATABASE_URL: 'postgres://127.0.0.1:1/agendai_test',
    },
  },
});
