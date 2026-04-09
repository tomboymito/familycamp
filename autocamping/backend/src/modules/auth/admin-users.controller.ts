import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminUser } from '../../database/entities/admin-user.entity';

class CreateAdminUserDto {
  @IsEmail() email: string;
  @IsString() name: string;
  @IsString() @MinLength(8) password: string;
}

class UpdateAdminUserDto {
  @IsString() @IsOptional() name?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsString() @MinLength(8) @IsOptional() password?: string;
}

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUsersController {
  constructor(
    @InjectRepository(AdminUser) private readonly repo: Repository<AdminUser>,
  ) {}

  private stripPasswordHash(user: AdminUser): Omit<AdminUser, 'passwordHash'> {
    const plain = { ...user } as Partial<AdminUser>;
    delete plain.passwordHash;
    return plain as Omit<AdminUser, 'passwordHash'>;
  }

  @Get()
  async findAll() {
    const users = await this.repo.find({ order: { createdAt: 'ASC' } });
    return users.map((u) => this.stripPasswordHash(u));
  }

  @Post()
  async create(@Body() dto: CreateAdminUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.repo.save(
      this.repo.create({ email: dto.email, name: dto.name, passwordHash }),
    );
    return this.stripPasswordHash(user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    const update: Partial<AdminUser> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.password) update.passwordHash = await bcrypt.hash(dto.password, 10);
    await this.repo.update(id, update);
    const user = await this.repo.findOneOrFail({ where: { id } });
    return this.stripPasswordHash(user);
  }
}
