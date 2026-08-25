import { SchedulePreset } from '@prisma/client';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsBoolean() isActive!: boolean;
  @IsInt() @Min(2) @Max(12) timezoneOffset!: number;
  @IsBoolean() uploadsEnabled!: boolean;
  @IsBoolean() callsEnabled!: boolean;
  @IsEnum(SchedulePreset) schedulePreset!: SchedulePreset;
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true }) scheduleDays!: number[];
  @IsString() @IsIn(['', 'bitrix', 'amocrm']) crmIntegration!: string;
  @IsArray() @ArrayUnique() @IsIn(['telegram', 'max', 'email'], { each: true }) messengerIntegrations!: string[];
  @IsBoolean() contacts!: boolean;
  @IsBoolean() sources!: boolean;
  @IsBoolean() script!: boolean;
  @IsBoolean() finance!: boolean;
  @IsBoolean() settings!: boolean;
}
