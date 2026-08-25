import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class AddSourcesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5000) @IsString({ each: true }) sources!: string[];
  @IsIn(['phone', 'domain']) sourceType!: 'phone' | 'domain';
  @IsOptional() @IsString() tagType?: string;
  @IsOptional() @IsBoolean() activeDuplicateSource?: boolean;
}
