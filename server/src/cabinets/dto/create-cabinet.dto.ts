import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateCabinetDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiProperty({ enum: ProjectType }) @IsEnum(ProjectType) type!: ProjectType;
  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) price!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) providerProjectId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() managerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sphere?: string;
  @ApiPropertyOptional({ description: 'Регион для имени и создания проекта Leads Factory' }) @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional({ description: 'Числовой ID региона Leads Factory' }) @IsOptional() @IsInt() @Min(1) regionId?: number;
  @ApiPropertyOptional({ description: 'Ключ безопасного повтора создания' }) @IsOptional() @IsUUID() idempotencyKey?: string;
  @ApiProperty() @IsString() @MinLength(3) employeeLogin!: string;
  @ApiProperty() @IsString() @MinLength(3) clientLogin!: string;
}
