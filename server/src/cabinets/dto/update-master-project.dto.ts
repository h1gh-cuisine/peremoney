import { ProjectType, RenewalStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateMasterProjectDto {
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsEnum(RenewalStatus) renewalStatus?: RenewalStatus;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() hidden?: boolean;
  @IsOptional() @IsEnum(ProjectType) type?: ProjectType;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) managerName?: string;
  @IsOptional() @IsString() @MinLength(8) clientPassword?: string;
  // "Связанные проекты" ("Связать с другим"): project_id из Leads Factory, чьи
  // заявки должны дополнительно дублироваться в этот кабинет (docs-agent.md 2.2/2.8.4).
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsInt({ each: true }) @Min(1, { each: true })
  linkedProviderProjectIds?: number[];
}
