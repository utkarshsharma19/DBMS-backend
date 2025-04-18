import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt } from 'class-validator';
export class GetAvailabilityDto {
    @Type(() => Date) @IsDate()
    date: Date;
  
    @Type(() => Date) @IsDate()
    start_time: Date;
  
    @Type(() => Date) @IsDate()
    end_time: Date;
  
    @ApiProperty()
    @IsInt()
    floorId: number;           // <— new
  }