import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDirectIntegrationDto {
  @IsOptional() @IsString() @MinLength(10) @MaxLength(500) botToken?: string;
  @IsString() @MinLength(1) @MaxLength(128) chatId!: string;
  @IsBoolean() enabled!: boolean;
}
