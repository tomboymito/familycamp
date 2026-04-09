import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AccommodationType } from '../entities/accommodation-type.entity';
import { Place } from '../entities/place.entity';
import { PricingRule } from '../entities/pricing-rule.entity';
import { AdminUser } from '../entities/admin-user.entity';
import { Customer } from '../entities/customer.entity';
import { Booking } from '../entities/booking.entity';
import { Hold } from '../entities/hold.entity';
import { Blocking } from '../entities/blocking.entity';
import { Payment } from '../entities/payment.entity';
import { IntegrationLog } from '../entities/integration-log.entity';
import { ReviewsCache } from '../entities/reviews-cache.entity';

config({ path: resolve(process.cwd(), '../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  entities: [
    AccommodationType, Place, Customer, Booking, Hold,
    Blocking, PricingRule, Payment, IntegrationLog,
    ReviewsCache, AdminUser,
  ],
  synchronize: false,
  logging: false,
});

async function seed(): Promise<void> {
  await dataSource.initialize();
  console.log('Connected to database');

  const typeRepo = dataSource.getRepository(AccommodationType);
  const placeRepo = dataSource.getRepository(Place);
  const pricingRepo = dataSource.getRepository(PricingRule);
  const adminRepo = dataSource.getRepository(AdminUser);
  const customerRepo = dataSource.getRepository(Customer);
  const bookingRepo = dataSource.getRepository(Booking);
  const holdRepo = dataSource.getRepository(Hold);
  const blockingRepo = dataSource.getRepository(Blocking);
  const reviewsRepo = dataSource.getRepository(ReviewsCache);

  // --- Accommodation types ---
  const existingTypes = await typeRepo.count();
  if (existingTypes > 0) {
    console.log('Data already exists, skipping seed');
    await dataSource.destroy();
    return;
  }

  const pitchType = typeRepo.create({ name: 'Автопитч', slug: 'pitch', defaultCapacity: 4, description: 'Место для палатки с автомобилем', isActive: true });
  const tentType = typeRepo.create({ name: 'Палатка', slug: 'tent', defaultCapacity: 3, description: 'Место только для палатки', isActive: true });
  const cabinType = typeRepo.create({ name: 'Домик', slug: 'cabin', defaultCapacity: 6, description: 'Деревянный домик с удобствами', isActive: true });
  const [savedPitch, savedTent, savedCabin] = await typeRepo.save([pitchType, tentType, cabinType]);
  console.log('Created 3 accommodation types');

  // --- Places: 4 pitch, 4 tent, 2 cabin ---
  const places = await placeRepo.save([
    placeRepo.create({ typeId: savedPitch.id, name: 'Автопитч А1', code: 'A1', capacity: 4, hasElectricity: true, hasWater: true, isActive: true, sortOrder: 1 }),
    placeRepo.create({ typeId: savedPitch.id, name: 'Автопитч А2', code: 'A2', capacity: 4, hasElectricity: true, hasWater: false, isActive: true, sortOrder: 2 }),
    placeRepo.create({ typeId: savedPitch.id, name: 'Автопитч А3', code: 'A3', capacity: 4, hasElectricity: false, hasWater: false, isActive: true, sortOrder: 3 }),
    placeRepo.create({ typeId: savedPitch.id, name: 'Автопитч А4', code: 'A4', capacity: 5, hasElectricity: true, hasWater: true, isActive: true, sortOrder: 4 }),
    placeRepo.create({ typeId: savedTent.id, name: 'Палатка Б1', code: 'B1', capacity: 3, hasElectricity: false, hasWater: false, isActive: true, sortOrder: 5 }),
    placeRepo.create({ typeId: savedTent.id, name: 'Палатка Б2', code: 'B2', capacity: 3, hasElectricity: false, hasWater: false, isActive: true, sortOrder: 6 }),
    placeRepo.create({ typeId: savedTent.id, name: 'Палатка Б3', code: 'B3', capacity: 4, hasElectricity: true, hasWater: false, isActive: true, sortOrder: 7 }),
    placeRepo.create({ typeId: savedTent.id, name: 'Палатка Б4', code: 'B4', capacity: 2, hasElectricity: false, hasWater: false, isActive: true, sortOrder: 8 }),
    placeRepo.create({ typeId: savedCabin.id, name: 'Домик В1', code: 'C1', capacity: 6, hasElectricity: true, hasWater: true, isActive: true, sortOrder: 9 }),
    placeRepo.create({ typeId: savedCabin.id, name: 'Домик В2', code: 'C2', capacity: 6, hasElectricity: true, hasWater: true, isActive: true, sortOrder: 10 }),
  ]);
  console.log('Created 10 places');

  // --- Pricing rules ---
  await pricingRepo.save([
    pricingRepo.create({ typeId: savedPitch.id, validFrom: '2025-06-01', validTo: '2025-08-31', pricePerNight: '2100.00', minGuests: 1, maxGuests: null, seasonLabel: 'Высокий сезон', isActive: true }),
    pricingRepo.create({ typeId: savedPitch.id, validFrom: '2025-09-01', validTo: '2025-10-31', pricePerNight: '1200.00', minGuests: 1, maxGuests: null, seasonLabel: 'Низкий сезон', isActive: true }),
    pricingRepo.create({ typeId: savedTent.id, validFrom: '2025-06-01', validTo: '2025-08-31', pricePerNight: '1000.00', minGuests: 1, maxGuests: null, seasonLabel: 'Высокий сезон', isActive: true }),
    pricingRepo.create({ typeId: savedTent.id, validFrom: '2025-09-01', validTo: '2025-10-31', pricePerNight: '600.00', minGuests: 1, maxGuests: null, seasonLabel: 'Низкий сезон', isActive: true }),
    pricingRepo.create({ typeId: savedCabin.id, validFrom: '2025-01-01', validTo: '2025-12-31', pricePerNight: '5000.00', minGuests: 1, maxGuests: null, seasonLabel: 'Круглый год', isActive: true }),
  ]);
  console.log('Created 5 pricing rules');

  // --- Admin user ---
  const passwordHash = await bcrypt.hash('password123', 10);
  await adminRepo.save(adminRepo.create({ email: 'admin@camp.ru', passwordHash, name: 'Администратор', isActive: true }));
  console.log('Created admin user: admin@camp.ru / password123');

  // --- Demo customers ---
  const [customer1, customer2] = await customerRepo.save([
    customerRepo.create({ name: 'Иван Петров', phone: '+79001234567', email: 'ivan@example.com', carNumber: 'А123ВС77', notes: null }),
    customerRepo.create({ name: 'Мария Сидорова', phone: '+79009876543', email: 'maria@example.com', carNumber: null, notes: 'Постоянный гость' }),
  ]);

  // --- Demo bookings (5 in different statuses) ---
  await bookingRepo.save([
    bookingRepo.create({ placeId: places[0].id, customerId: customer1.id, checkIn: '2025-07-10', checkOut: '2025-07-15', guestsCount: 2, source: 'website', status: 'confirmed', paymentStatus: 'paid', totalPrice: '10500.00', crmSyncStatus: 'synced' }),
    bookingRepo.create({ placeId: places[1].id, customerId: customer2.id, checkIn: '2025-07-12', checkOut: '2025-07-14', guestsCount: 3, source: 'admin', status: 'awaiting_payment', paymentStatus: 'not_paid', totalPrice: '4200.00', crmSyncStatus: 'pending' }),
    bookingRepo.create({ placeId: places[4].id, customerId: customer1.id, checkIn: '2025-08-01', checkOut: '2025-08-07', guestsCount: 2, source: 'telegram', status: 'confirmed', paymentStatus: 'paid', totalPrice: '6000.00', crmSyncStatus: 'synced' }),
    bookingRepo.create({ placeId: places[8].id, customerId: customer2.id, checkIn: '2025-07-20', checkOut: '2025-07-25', guestsCount: 4, source: 'website', status: 'cancelled', paymentStatus: 'refunded', totalPrice: '25000.00', crmSyncStatus: 'synced' }),
    bookingRepo.create({ placeId: places[2].id, customerId: customer1.id, checkIn: '2025-09-05', checkOut: '2025-09-08', guestsCount: 1, source: 'admin', status: 'confirmed', paymentStatus: 'paid', totalPrice: '3600.00', crmSyncStatus: 'pending' }),
  ]);
  console.log('Created 5 demo bookings');

  // --- Demo blockings ---
  await blockingRepo.save([
    blockingRepo.create({ placeId: places[3].id, dateFrom: '2025-07-01', dateTo: '2025-07-05', reason: 'Технический ремонт', createdBy: 'admin' }),
    blockingRepo.create({ placeId: places[9].id, dateFrom: '2025-08-15', dateTo: '2025-08-20', reason: 'Корпоративное мероприятие', createdBy: 'admin' }),
  ]);
  console.log('Created 2 blockings');

  // --- Demo hold ---
  const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await holdRepo.save(
    holdRepo.create({ placeId: places[5].id, checkIn: '2025-07-18', checkOut: '2025-07-22', guestsCount: 2, sessionToken: 'demo_hold_token_' + Date.now(), expiresAt: holdExpiresAt }),
  );
  console.log('Created 1 active hold');

  // --- Demo reviews ---
  await reviewsRepo.save([
    reviewsRepo.create({ source: 'yandex', authorName: 'Алексей К.', rating: 5, reviewText: 'Отличный кемпинг! Чисто, уютно, персонал очень приветливый. Обязательно вернёмся!', reviewDate: '2025-06-15', externalId: 'yandex_001', fetchedAt: new Date() }),
    reviewsRepo.create({ source: 'google', authorName: 'Елена М.', rating: 5, reviewText: 'Прекрасное место для отдыха с семьёй. Дети в восторге от природы. Удобства на высоте.', reviewDate: '2025-06-20', externalId: 'google_001', fetchedAt: new Date() }),
    reviewsRepo.create({ source: '2gis', authorName: 'Дмитрий В.', rating: 4, reviewText: 'Хорошее место, тихо и спокойно. Рядом лес и речка. Немного далеко от города, но оно того стоит.', reviewDate: '2025-07-01', externalId: '2gis_001', fetchedAt: new Date() }),
  ]);
  console.log('Created 3 reviews');

  await dataSource.destroy();
  console.log('\n✅ Seed completed successfully!');
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
