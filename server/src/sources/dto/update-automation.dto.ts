import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateAutomationDto {
  @IsOptional() @IsBoolean() autoCleanupEnabled?: boolean;
  @IsOptional() @IsBoolean() autoManagementEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) minContactsPerLead?: number;
  @IsOptional() @IsNumber() @Min(0) minConversion?: number;
  // Отправляются в Leads Factory (default_limit/max_limit) при сохранении, в
  // отличие от minContactsPerLead/minConversion — они только для локальной автоочистки.
  @IsOptional() @IsInt() @Min(1) defaultLimit?: number;
  @IsOptional() @IsInt() @Min(1) maxLimit?: number;
}
