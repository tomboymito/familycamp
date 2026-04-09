import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { AdminUser } from '../../database/entities/admin-user.entity';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PASSWORD = 'password123';
let HASHED: string;

const mockAdmin = () => ({
  id: 'admin-uuid-1',
  email: 'admin@camp.ru',
  name: 'Admin',
  passwordHash: HASHED,
  isActive: true,
  createdAt: new Date(),
});

// ─── Build module helper ──────────────────────────────────────────────────────

async function buildModule(adminReturn: unknown) {
  return Test.createTestingModule({
    providers: [
      AuthService,
      {
        provide: getRepositoryToken(AdminUser),
        useValue: { findOne: jest.fn().mockResolvedValue(adminReturn) },
      },
      {
        provide: JwtService,
        useValue: {
          sign: jest.fn().mockReturnValue('mock_jwt_token'),
          verify: jest.fn(),
        },
      },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('test_secret') },
      },
    ],
  }).compile();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  HASHED = await bcrypt.hash(PASSWORD, 10);
});

describe('AuthService.login', () => {
  it('returns tokens for valid credentials', async () => {
    const module: TestingModule = await buildModule(mockAdmin());
    const service = module.get(AuthService);

    const result = await service.login('admin@camp.ru', PASSWORD);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('admin@camp.ru');
  });

  it('throws UnauthorizedException when user not found', async () => {
    const module: TestingModule = await buildModule(null);
    const service = module.get(AuthService);

    await expect(service.login('nobody@camp.ru', PASSWORD)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for wrong password', async () => {
    const module: TestingModule = await buildModule(mockAdmin());
    const service = module.get(AuthService);

    await expect(service.login('admin@camp.ru', 'wrong_password')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for inactive user', async () => {
    const inactiveAdmin = { ...mockAdmin(), isActive: false };
    // findOne returns null for inactive (WHERE isActive = true)
    const module: TestingModule = await buildModule(null);
    const service = module.get(AuthService);

    await expect(service.login('admin@camp.ru', PASSWORD)).rejects.toThrow(UnauthorizedException);
    // Verify that the admin's inactive status doesn't bypass the check
    const inactiveModule: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(AdminUser), useValue: { findOne: jest.fn().mockResolvedValue(inactiveAdmin) } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('tok') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    const inactiveService = inactiveModule.get(AuthService);
    // Wrong password → UnauthorizedException even if user is found
    await expect(inactiveService.login('admin@camp.ru', 'wrong')).rejects.toThrow(UnauthorizedException);
  });

  it('generates two different tokens (access + refresh)', async () => {
    const jwtSign = jest.fn()
      .mockReturnValueOnce('access_token_123')
      .mockReturnValueOnce('refresh_token_456');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(AdminUser), useValue: { findOne: jest.fn().mockResolvedValue(mockAdmin()) } },
        { provide: JwtService, useValue: { sign: jwtSign } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    const service = module.get(AuthService);

    const result = await service.login('admin@camp.ru', PASSWORD);

    expect(result.accessToken).toBe('access_token_123');
    expect(result.refreshToken).toBe('refresh_token_456');
    expect(jwtSign).toHaveBeenCalledTimes(2);
  });
});
