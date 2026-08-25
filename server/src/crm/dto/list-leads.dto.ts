import { LeadSaleStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListLeadsDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsEnum(LeadSaleStatus) status?: LeadSaleStatus;
  @IsOptional() @IsString() search?: string;
}
