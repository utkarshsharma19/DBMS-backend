import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CafeteriaBookingService }      from './cafeteria_booking.service';
import { CreateCafeteriaBookingDto }    from './dto/create-cafeteria_booking.dto';
import { UpdateCafeteriaBookingDto }    from './dto/update-cafeteria_booking.dto';
import { GetAvailabilityDto }           from './dto/get-availability.dto';
import { AccessTokenGuard }             from '../auth/access-token-guard';

@ApiTags('Cafeteria Booking')
// @ApiBearerAuth('access-token')
// @UseGuards(AccessTokenGuard)
@Controller('cafeteria-booking')
export class CafeteriaBookingController {
  constructor(
    private readonly cafeteriaBookingService: CafeteriaBookingService,
  ) {}

  @Post()
  async create(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateCafeteriaBookingDto,
  ) {
    try {
      return await this.cafeteriaBookingService.create(req.user.sub, dto);
    } catch (err) {
      console.error('🔥 CafeteriaBookingController.create error:', err);
      // If it’s already a proper HttpException, let it pass
      if (err instanceof HttpException) throw err;
      // Otherwise, re‑throw with the real message
      throw new HttpException(
        err.message || 'Booking failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  findAll() {
    return this.cafeteriaBookingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cafeteriaBookingService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCafeteriaBookingDto,
  ) {
    return this.cafeteriaBookingService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cafeteriaBookingService.remove(+id);
  }

  @Get('total_availability/date')
  getAvailDate() {
    return this.cafeteriaBookingService.getAvailDate();
  }

  @Get('booking/:token')
  getByToken(@Param('token') token: string) {
    return this.cafeteriaBookingService.getByToken(token);
  }

  @Post('availability/datetime')
getAvailDateTime(
  @Body(new ValidationPipe({ transform: true, whitelist: true }))
  dto: GetAvailabilityDto,
) {
  return this.cafeteriaBookingService.getAvailDateTime(dto);
}
}
