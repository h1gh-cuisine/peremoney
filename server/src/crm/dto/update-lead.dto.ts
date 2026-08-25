import { LeadSaleStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateLeadDto {
  @IsOptional() @IsString() @MaxLength(5000) feedback?: string;
  @IsOptional() @IsEnum(LeadSaleStatus) saleStatus?: LeadSaleStatus;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
}
