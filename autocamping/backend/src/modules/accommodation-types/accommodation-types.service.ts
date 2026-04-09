import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccommodationType } from '../../database/entities/accommodation-type.entity';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccommodationTypeDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsInt() @Min(1) defaultCapacity: number;
  @IsString() @IsOptional() description?: string;
}

export class UpdateAccommodationTypeDto {
  @IsString() @IsOptional() name?: string;
  @IsInt() @Min(1) @IsOptional() defaultCapacity?: number;
  @IsString() @IsOptional() description?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@Injectable()
export class AccommodationTypesService {
  constructor(
    @InjectRepository(AccommodationType)
    private readonly repo: Repository<AccommodationType>,
  ) {}

  findAll(onlyActive = false) {
    return this.repo.find({ where: onlyActive ? { isActive: true } : {}, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const type = await this.repo.findOne({ where: { id } });
    if (!type) throw new NotFoundException(`AccommodationType ${id} not found`);
    return type;
  }

  create(dto: CreateAccommodationTypeDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateAccommodationTypeDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }
}
