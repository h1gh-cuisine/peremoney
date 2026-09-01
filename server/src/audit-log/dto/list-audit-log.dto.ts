import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListAuditLogDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsUUID() actorId?: string;
  @IsOptional() @IsUUID() cabinetId?: string;
  @IsOptional() @IsIn(['success', 'denied', 'error']) outcome?: 'success' | 'denied' | 'error';
  @IsOptional() @IsString() action?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}
