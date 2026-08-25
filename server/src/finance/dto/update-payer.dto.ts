import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdatePayerDto {
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() data!: Record<string, unknown>;
}
