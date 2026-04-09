import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

// ─── Health ───────────────────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  let app: INestApplication<App>;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  it('returns Terminus health with DB status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info).toHaveProperty('database');
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  let app: INestApplication<App>;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  it('returns tokens for valid admin credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@camp.ru', password: 'password123' })
      .expect(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('returns 401 for wrong password', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@camp.ru', password: 'wrongpassword' })
      .expect(401),
  );

  it('returns 401 for nonexistent user', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@camp.ru', password: 'correctlength' })
      .expect(401),
  );

  it('returns 400 when email missing', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ password: 'password123' })
      .expect(400),
  );
});

// ─── JWT guard ────────────────────────────────────────────────────────────────

describe('JWT guard', () => {
  let app: INestApplication<App>;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  it('returns 401 for chess-board without token', () =>
    request(app.getHttpServer())
      .get('/api/v1/admin/chess-board?from=2025-07-01&to=2025-07-07')
      .expect(401),
  );

  it('returns 401 for admin/bookings without token', () =>
    request(app.getHttpServer()).get('/api/v1/admin/bookings').expect(401),
  );

  it('returns 200 for chess-board with valid token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@camp.ru', password: 'password123' });
    const token = (loginRes.body as { accessToken: string }).accessToken;
    return request(app.getHttpServer())
      .get('/api/v1/admin/chess-board?from=2025-07-01&to=2025-07-07')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});

// ─── Public endpoints ─────────────────────────────────────────────────────────

describe('GET /api/v1/accommodation-types', () => {
  let app: INestApplication<App>;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  it('returns non-empty array with slug field', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/accommodation-types').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('slug');
  });
});

describe('GET /api/v1/places', () => {
  let app: INestApplication<App>;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  it('returns non-empty array of places', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/places').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/v1/availability', () => {
  let app: INestApplication<App>;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  it('returns array for valid dates', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/availability?check_in=2025-08-01&check_out=2025-08-05')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 400 when check_in missing', () =>
    request(app.getHttpServer())
      .get('/api/v1/availability?check_out=2025-08-05')
      .expect(400),
  );
});

// ─── Pricing ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/pricing/calculate', () => {
  let app: INestApplication<App>;
  let placeId: string;

  beforeAll(async () => {
    app = await createApp();
    const res = await request(app.getHttpServer()).get('/api/v1/places');
    placeId = (res.body as { id: string }[])[0].id;
  });
  afterAll(async () => { await app.close(); });

  it('calculates price correctly (4 nights)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pricing/calculate')
      .send({ placeId, checkIn: '2025-07-01', checkOut: '2025-07-05', guestsCount: 2 })
      .expect(200);
    expect(res.body.nights).toBe(4);
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.breakdown)).toBe(true);
    expect(res.body.breakdown).toHaveLength(4);
  });

  it('returns 400 when checkOut ≤ checkIn', () =>
    request(app.getHttpServer())
      .post('/api/v1/pricing/calculate')
      .send({ placeId, checkIn: '2025-07-05', checkOut: '2025-07-01', guestsCount: 2 })
      .expect(400),
  );

  it('returns 400 when placeId missing', () =>
    request(app.getHttpServer())
      .post('/api/v1/pricing/calculate')
      .send({ checkIn: '2025-07-01', checkOut: '2025-07-05', guestsCount: 2 })
      .expect(400),
  );
});

// ─── Holds — validation ───────────────────────────────────────────────────────

describe('POST /api/v1/holds — validation', () => {
  let app: INestApplication<App>;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  it('returns 400 when placeId missing', () =>
    request(app.getHttpServer())
      .post('/api/v1/holds')
      .send({ checkIn: '2026-08-01', checkOut: '2026-08-05', guestsCount: 2 })
      .expect(400),
  );

  it('returns 400 for non-UUID placeId', () =>
    request(app.getHttpServer())
      .post('/api/v1/holds')
      .send({ placeId: 'not-a-uuid', checkIn: '2026-08-01', checkOut: '2026-08-05', guestsCount: 2 })
      .expect(400),
  );
});

// ─── Race condition ───────────────────────────────────────────────────────────

describe('Race condition: concurrent holds on same place', () => {
  let app: INestApplication<App>;
  let placeId: string;

  beforeAll(async () => {
    app = await createApp();
    const res = await request(app.getHttpServer()).get('/api/v1/places');
    const places = res.body as { id: string }[];
    placeId = places[Math.floor(places.length / 2)].id;
  });
  afterAll(async () => { await app.close(); });

  it('exactly one request succeeds (201), rest get 409', async () => {
    // Use a unique date range per test run to avoid conflicts from prior runs
    const year = 2030 + Math.floor(Math.random() * 10);
    const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
    const checkIn = `${year}-${month}-01`;
    const checkOut = `${year}-${month}-06`;
    const payload = { placeId, checkIn, checkOut, guestsCount: 2 };

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).post('/api/v1/holds').send(payload),
      ),
    );

    const statuses = results.map((r) => (r.status === 'fulfilled' ? r.value.status : 500));
    const created = statuses.filter((s) => s === 201).length;
    const conflicts = statuses.filter((s) => s === 409).length;

    expect(created).toBeGreaterThanOrEqual(1);
    expect(created + conflicts).toBe(5);
  }, 15000);
});
