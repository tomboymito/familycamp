import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blocking } from '../../database/entities/blocking.entity';
import { BlockingsController } from './blockings.controller';
import { BlockingsService } from './blockings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Blocking])],
  controllers: [BlockingsController],
  providers: [BlockingsService],
  exports: [BlockingsService],
})
export class BlockingsModule {}
