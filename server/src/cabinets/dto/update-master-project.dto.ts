import { RenewalStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateMasterProjectDto {
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsEnum(RenewalStatus) renewalStatus?: RenewalStatus;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() hidden?: boolean;
  @IsOptional() @IsString() @MinLength(8) clientPassword?: string;
}
