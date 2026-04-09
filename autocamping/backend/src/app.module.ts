import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccommodationTypesModule } from './modules/accommodation-types/accommodation-types.module';
import { PlacesModule } from './modules/places/places.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { HoldsModule } from './modules/holds/holds.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BlockingsModule } from './modules/blockings/blockings.module';
import { ChessBoardModule } from './modules/chess-board/chess-board.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { IcalModule } from './modules/ical/ical.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },    // 20 req/s burst
      { name: 'medium', ttl: 60000, limit: 300 },  // 300 req/min
    ]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        database: config.get<string>('POSTGRES_DB'),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false,
      }),
    }),
    HealthModule,
    AuthModule,
    AccommodationTypesModule,
    PlacesModule,
    AvailabilityModule,
    PricingModule,
    HoldsModule,
    CustomersModule,
    BookingsModule,
    PaymentsModule,
    BlockingsModule,
    ChessBoardModule,
    DashboardModule,
    SettingsModule,
    NotificationsModule,
    ReportsModule,
    PdfModule,
    IcalModule,
    WebhooksModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
