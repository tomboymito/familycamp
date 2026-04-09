import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Blocking } from '../../database/entities/blocking.entity';

export class CreateBlockingDto {
  @IsUUID() placeId: string;
  @IsString() dateFrom: string;
  @IsString() dateTo: string;
  @IsString() @IsOptional() reason?: string;
}

export class UpdateBlockingDto {
  @IsString() @IsOptional() dateFrom?: string;
  @IsString() @IsOptional() dateTo?: string;
  @IsString() @IsOptional() reason?: string;
}

@Injectable()
export class BlockingsService {
  constructor(
    @InjectRepository(Blocking) private readonly repo: Repository<Blocking>,
  ) {}

  findAll(placeId?: string, from?: string, to?: string) {
    const qb = this.repo.createQueryBuilder('b').leftJoinAndSelect('b.place', 'place').orderBy('b.date_from', 'ASC');
    if (placeId) qb.andWhere('b.place_id = :placeId', { placeId });
    if (from) qb.andWhere('b.date_to >= :from', { from });
    if (to) qb.andWhere('b.date_from <= :to', { to });
    return qb.getMany();
  }

  async create(dto: CreateBlockingDto) {
    return this.repo.save(this.repo.create({ ...dto, createdBy: 'admin' }));
  }

  async update(id: string, dto: UpdateBlockingDto) {
    const blocking = await this.repo.findOne({ where: { id } });
    if (!blocking) throw new NotFoundException(`Blocking ${id} not found`);
    await this.repo.update(id, dto);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    const blocking = await this.repo.findOne({ where: { id } });
    if (!blocking) throw new NotFoundException(`Blocking ${id} not found`);
    await this.repo.delete(id);
  }
}
