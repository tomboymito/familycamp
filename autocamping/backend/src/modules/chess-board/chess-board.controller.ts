import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChessBoardService } from './chess-board.service';

@ApiTags('chess-board')
@Controller('admin/chess-board')
export class ChessBoardController {
  constructor(private readonly service: ChessBoardService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getBoard(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type_id') typeId?: string,
  ): Promise<unknown> {
    if (!from || !to) throw new BadRequestException('from and to are required');
    return this.service.getBoard(from, to, typeId);
  }
}
