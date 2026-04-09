import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  const docsPath = `${apiPrefix}/docs`;

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000',
      process.env.ADMIN_URL ?? 'http://localhost:5173',
      'http://localhost',
      'http://localhost:80',
      'http://localhost:3002',
      'http://localhost:4173',
      'http://localhost:5173',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:4173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  });

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/health'],
  });

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // ── Class serializer ──────────────────────────────────────────────────────
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ── Swagger ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ФэмКэмп API')
      .setDescription('REST API автокемпинга — бронирования, доступность, платежи')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Аутентификация администратора')
      .addTag('accommodation-types', 'Типы размещения')
      .addTag('places', 'Места кемпинга')
      .addTag('availability', 'Доступность')
      .addTag('pricing', 'Расчёт стоимости')
      .addTag('holds', 'Резервирования (холды)')
      .addTag('bookings', 'Бронирования')
      .addTag('payments', 'Платежи')
      .addTag('blockings', 'Блокировки')
      .addTag('chess-board', 'Шахматка (admin)')
      .addTag('health', 'Состояние сервиса')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(docsPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log(`Swagger docs available at /${docsPath}`);
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.BACKEND_PORT ?? 3000;
  await app.listen(port);
  logger.log(`Backend listening on port ${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
