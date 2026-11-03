import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AccessoryCategoryDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/) @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
