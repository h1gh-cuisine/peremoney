import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class IncomingLeadDto {
  @ApiProperty() @IsString() @MinLength(1) externalId!: string;
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty() @IsString() @MinLength(1) mobileTel!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() site?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobileOperator?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) @IsOptional() @IsObject()
  payload?: Record<string, unknown>;
}
