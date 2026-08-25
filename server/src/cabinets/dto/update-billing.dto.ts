import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBillingDto {
  @ApiPropertyOptional({ enum: ProjectType }) @IsOptional() @IsEnum(ProjectType) type?: ProjectType;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() managerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sphere?: string;
}
