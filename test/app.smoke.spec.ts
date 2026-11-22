import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('API smoke (no database)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
  });

  afterAll(() => app.close());

  it('rejects guests on protected routes', async () => {
    await request(app.getHttpServer()).get('/units').expect(401);
    await request(app.getHttpServer()).get('/services').expect(401);
    await request(app.getHttpServer()).get('/professionals').expect(401);
    await request(app.getHttpServer()).post('/members').send({}).expect(401);
  });

  it('validates the sign-up body before touching the database', async () => {
    await request(app.getHttpServer()).post('/auth/sign-up').send({ email: 'nope' }).expect(400);
  });

  it('exposes Prometheus metrics, including requests that were rejected', async () => {
    await request(app.getHttpServer()).get('/units').expect(401);
    const response = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('agendai_process_cpu_user_seconds_total');
    expect(response.text).toMatch(/agendai_http_requests_total\{[^}]*route="\/units"[^}]*status="401"[^}]*\}/);
  });
});
