import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVisibilityDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() contacts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sources?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() script?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() finance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() settings?: boolean;
}
