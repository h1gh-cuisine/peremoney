import { IsBoolean } from 'class-validator';

export class ToggleSourceDto { @IsBoolean() enabled!: boolean; }
