// src/overall_booking/overall_booking.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OverallBookingService } from './overall_booking.service';
import { CreateOverallBookingDto } from './dto/create-overall_booking.dto';
import { UpdateOverallBookingDto } from './dto/update-overall_booking.dto';

@ApiTags('Overall Booking')
@Controller('overall-booking')
export class OverallBookingController {
  constructor(
    private readonly overallBookingService: OverallBookingService,
  ) {}

  @Post()
  create(@Body() dto: CreateOverallBookingDto) {
    return this.overallBookingService.add(dto);
  }

  @Get()
  findAll() {
    return this.overallBookingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.overallBookingService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOverallBookingDto,
    @Query('amenity') amenity: string,
  ) {
    return this.overallBookingService.update(+id, dto, amenity);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.overallBookingService.remove(+id);
  }

  @Get('homescreen_api/:token')
  homescreenAPI(@Param('token') token: string) {
    return this.overallBookingService.homescreenAPI(token);
  }
}
