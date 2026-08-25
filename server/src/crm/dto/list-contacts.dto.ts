import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ListContactsDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsIn(['new', 'noAnswerFinal', 'recall', 'notRelevant', 'success']) status?: string;
}
