import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteCabinetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  secretCode!: string;
}
