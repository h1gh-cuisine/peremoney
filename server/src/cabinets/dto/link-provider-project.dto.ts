import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LinkProviderProjectDto {
  @ApiProperty({ description: 'Внутренний ID существующего проекта Leads Factory' })
  @IsInt() @Min(1) providerProjectId!: number;

  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) price!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() managerName?: string;
}
