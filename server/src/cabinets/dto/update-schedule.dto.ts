import { ApiProperty } from '@nestjs/swagger';
import { SchedulePreset } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateScheduleDto {
  @ApiProperty({ enum: SchedulePreset })
  @IsEnum(SchedulePreset)
  schedulePreset!: SchedulePreset;
}
