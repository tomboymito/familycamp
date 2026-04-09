import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Place } from '../../database/entities/place.entity';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePlaceDto {
  @IsUUID() typeId: string;
  @IsString() name: string;
  @IsString() code: string;
  @IsInt() @Min(1) capacity: number;
  @IsBoolean() @IsOptional() hasElectricity?: boolean;
  @IsBoolean() @IsOptional() hasWater?: boolean;
  @IsInt() @IsOptional() sortOrder?: number;
}

export class UpdatePlaceDto {
  @IsString() @IsOptional() name?: string;
  @IsInt() @Min(1) @IsOptional() capacity?: number;
  @IsBoolean() @IsOptional() hasElectricity?: boolean;
  @IsBoolean() @IsOptional() hasWater?: boolean;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsInt() @IsOptional() sortOrder?: number;
}

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Place)
    private readonly repo: Repository<Place>,
  ) {}

  findAll(typeId?: string, onlyActive = false) {
    const where: FindOptionsWhere<Place> = {};
    if (typeId) where.typeId = typeId;
    if (onlyActive) where.isActive = true;
    return this.repo.find({
      where,
      relations: ['accommodationType'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const place = await this.repo.findOne({ where: { id }, relations: ['accommodationType'] });
    if (!place) throw new NotFoundException(`Place ${id} not found`);
    return place;
  }

  create(dto: CreatePlaceDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdatePlaceDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async toggle(id: string) {
    const place = await this.findOne(id);
    await this.repo.update(id, { isActive: !place.isActive });
    return this.findOne(id);
  }

  async setHousekeepingStatus(id: string, status: string) {
    await this.findOne(id);
    await this.repo.update(id, { housekeepingStatus: status as Place['housekeepingStatus'] });
    return this.findOne(id);
  }
}
