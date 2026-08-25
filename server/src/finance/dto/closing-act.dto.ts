import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ClosingActDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true }) paymentIds!: string[];
}
