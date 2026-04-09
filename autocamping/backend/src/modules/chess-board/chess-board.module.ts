import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blocking } from '../../database/entities/blocking.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Hold } from '../../database/entities/hold.entity';
import { Place } from '../../database/entities/place.entity';
import { ChessBoardController } from './chess-board.controller';
import { ChessBoardService } from './chess-board.service';

@Module({
  imports: [TypeOrmModule.forFeature([Place, Booking, Blocking, Hold])],
  controllers: [ChessBoardController],
  providers: [ChessBoardService],
})
export class ChessBoardModule {}
