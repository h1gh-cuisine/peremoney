import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePaymentDto {
  @ApiProperty({ enum: PaymentStatus }) @IsEnum(PaymentStatus) status!: PaymentStatus;
}
