import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class RamOptionDto {
  @IsOptional() @IsUUID() id?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(4096) capacityGB!: number;
  @IsIn(['DDR4', 'DDR5', 'LPDDR4X', 'LPDDR5', 'LPDDR5X', 'OTHER']) type!: 'DDR4'|'DDR5'|'LPDDR4X'|'LPDDR5'|'LPDDR5X'|'OTHER';
  @Type(() => Number) @IsInt() @Min(-1_000_000_000) @Max(1_000_000_000) priceDeltaMinor!: number;
  @IsBoolean() isBase!: boolean;
  @IsBoolean() isAvailable!: boolean;
}

export class StorageOptionDto {
  @IsOptional() @IsUUID() id?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(131072) capacityGB!: number;
  @IsIn(['SSD', 'HDD', 'NVME', 'SATA', 'OTHER']) type!: 'SSD'|'HDD'|'NVME'|'SATA'|'OTHER';
  @Type(() => Number) @IsInt() @Min(-1_000_000_000) @Max(1_000_000_000) priceDeltaMinor!: number;
  @IsBoolean() isBase!: boolean;
  @IsBoolean() isAvailable!: boolean;
}

export class UpgradeCombinationDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(4096) ramCapacityGB!: number;
  @IsIn(['DDR4', 'DDR5', 'LPDDR4X', 'LPDDR5', 'LPDDR5X', 'OTHER']) ramType!: RamOptionDto['type'];
  @Type(() => Number) @IsInt() @Min(1) @Max(131072) storageCapacityGB!: number;
  @IsIn(['SSD', 'HDD', 'NVME', 'SATA', 'OTHER']) storageType!: StorageOptionDto['type'];
  @IsBoolean() isAvailable!: boolean;
}

export class ProductDto {
  @IsString() @IsNotEmpty() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(180) slug!: string;
  @IsOptional() @IsIn(['LAPTOP', 'KEYBOARD', 'MOUSE', 'MOUSE_PAD', 'OTHER_ACCESSORY'])
  productType: 'LAPTOP'|'KEYBOARD'|'MOUSE'|'MOUSE_PAD'|'OTHER_ACCESSORY' = 'LAPTOP';
  @IsString() @IsNotEmpty() @MaxLength(80) brand!: string;
  @IsString() @IsNotEmpty() @MaxLength(160) model!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsIn(['NEW', 'PRE_OWNED']) condition!: 'NEW'|'PRE_OWNED';
  @IsOptional() @IsString() @MaxLength(1000) conditionNotes?: string;
  @IsOptional() @IsIn(['WORK', 'STUDY', 'GAMING']) useCase?: 'WORK'|'STUDY'|'GAMING'|null;
  @IsOptional() @IsObject() specs?: Record<string, unknown>;
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED']) status!: 'DRAFT'|'ACTIVE'|'ARCHIVED';
  @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000_000) priceMinor!: number;
  @IsOptional() @IsString() @MaxLength(200) cpu?: string;
  @IsOptional() @IsString() @MaxLength(200) gpu?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(4096) baseRamGB?: number;
  @IsOptional() @IsIn(['DDR4', 'DDR5', 'LPDDR4X', 'LPDDR5', 'LPDDR5X', 'OTHER']) baseRamType?: RamOptionDto['type'];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(131072) baseStorageGB?: number;
  @IsOptional() @IsIn(['SSD', 'HDD', 'NVME', 'SATA', 'OTHER']) baseStorageType?: StorageOptionDto['type'];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) displaySizeInches?: number;
  @IsOptional() @IsString() @MaxLength(80) displayResolution?: string;
  @IsOptional() @IsString() @MaxLength(80) displayPanel?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) refreshRateHz?: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) stockQuantity!: number;
  @IsOptional() @IsUUID() imageId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => RamOptionDto) ramOptions: RamOptionDto[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => StorageOptionDto) storageOptions: StorageOptionDto[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(10_000) @ValidateNested({ each: true }) @Type(() => UpgradeCombinationDto) combinations: UpgradeCombinationDto[] = [];
}

export class PriceQuoteDto {
  @IsUUID() ramOptionId!: string;
  @IsUUID() storageOptionId!: string;
}

export class UpdateInventoryDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) stockQuantity!: number;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class ProductSearchDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsIn(['LAPTOP', 'KEYBOARD', 'MOUSE', 'MOUSE_PAD', 'OTHER_ACCESSORY'])
  productType?: 'LAPTOP'|'KEYBOARD'|'MOUSE'|'MOUSE_PAD'|'OTHER_ACCESSORY';
  @IsOptional() @IsIn(['NEW', 'PRE_OWNED']) condition?: 'NEW'|'PRE_OWNED';
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED']) status?: 'DRAFT'|'ACTIVE'|'ARCHIVED';
  @IsOptional() @IsIn(['WORK', 'STUDY', 'GAMING', 'UNCATEGORIZED']) useCase?: 'WORK'|'STUDY'|'GAMING'|'UNCATEGORIZED';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000_000) minPriceMinor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000_000) maxPriceMinor?: number;
  @IsOptional() @IsString() @MaxLength(200) cpu?: string;
  @IsOptional() @IsString() @MaxLength(200) gpu?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(4096) ramGB?: number;
  @IsOptional() @IsIn(['DDR4', 'DDR5', 'LPDDR4X', 'LPDDR5', 'LPDDR5X', 'OTHER']) ramType?: RamOptionDto['type'];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(131072) storageGB?: number;
  @IsOptional() @IsIn(['SSD', 'HDD', 'NVME', 'SATA', 'OTHER']) storageType?: StorageOptionDto['type'];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) displaySizeInches?: number;
  @IsOptional() @IsString() @MaxLength(80) displayResolution?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 12;
  @IsOptional() @IsIn(['PRICE_ASC', 'PRICE_DESC', 'NAME_ASC', 'NAME_DESC', 'CREATED_DESC', 'UPDATED_DESC'])
  sort?: 'PRICE_ASC'|'PRICE_DESC'|'NAME_ASC'|'NAME_DESC'|'CREATED_DESC'|'UPDATED_DESC';
}
