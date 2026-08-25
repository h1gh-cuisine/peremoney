import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateAutomationDto {
  @IsOptional() @IsBoolean() autoCleanupEnabled?: boolean;
  @IsOptional() @IsBoolean() autoManagementEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) minContactsPerLead?: number;
  @IsOptional() @IsNumber() @Min(0) minConversion?: number;
}
