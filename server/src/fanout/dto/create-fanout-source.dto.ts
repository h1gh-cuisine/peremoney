import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateFanoutSourceDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
}
