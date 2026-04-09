import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../../database/entities/admin-user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.adminRepo.findOne({ where: { email, isActive: true } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string; name: string }>(
        refreshToken,
        { secret: this.config.get<string>('JWT_REFRESH_SECRET') },
      );
      const user = await this.adminRepo.findOne({ where: { id: payload.sub, isActive: true } });
      if (!user) throw new UnauthorizedException();
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokens(user: AdminUser) {
    const payload = { sub: user.id, email: user.email, name: user.name };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: 3600, // 1h in seconds
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: 604800, // 7d in seconds
    });
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } };
  }
}
