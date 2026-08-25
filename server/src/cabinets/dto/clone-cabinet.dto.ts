import { ProjectType } from '@prisma/client';
import { IsEnum, IsNumber, IsString, Min, MinLength } from 'class-validator';
export class CloneCabinetDto {
  @IsString() @MinLength(2) name!: string;
  @IsEnum(ProjectType) type!: ProjectType;
  @IsNumber() @Min(0) price!: number;
  @IsString() managerName!: string;
}
