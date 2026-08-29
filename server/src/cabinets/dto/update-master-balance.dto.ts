import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateMasterBalanceDto {
  @ApiProperty({ minimum: 0, maximum: 99_999_999_999.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999_999.99)
  moneyBalance!: number;
}
