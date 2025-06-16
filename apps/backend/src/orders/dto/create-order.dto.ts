import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsInt,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';

enum GlassType {
  FLOAT = 'FLOAT',
  TEMPERED = 'TEMPERED',
  LAMINATED = 'LAMINATED',
  INSULATED = 'INSULATED',
  LOW_E = 'LOW_E',
  REFLECTIVE = 'REFLECTIVE',
  TINTED = 'TINTED',
  FROSTED = 'FROSTED',
  PATTERNED = 'PATTERNED',
  BULLETPROOF = 'BULLETPROOF',
}

enum GlassClass {
  SINGLE_GLASS = 'SINGLE_GLASS',
  IG_CLASS = 'IG_CLASS',
  DOUBLE_GLAZED = 'DOUBLE_GLAZED',
  TRIPLE_GLAZED = 'TRIPLE_GLAZED',
  SAFETY_GLASS = 'SAFETY_GLASS',
  FIRE_RATED = 'FIRE_RATED',
  ACOUSTIC = 'ACOUSTIC',
  SOLAR_CONTROL = 'SOLAR_CONTROL',
}

enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  QUALITY_CHECK = 'QUALITY_CHECK',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateOrderDto {
  @ApiProperty({ example: 'ORD-2025-001' })
  @IsString()
  orderNumber: string;

  @ApiProperty({ example: 'customer-id-here' })
  @IsString()
  customerId: string;

  @ApiProperty({ enum: GlassType, example: GlassType.TEMPERED })
  @IsEnum(GlassType)
  glassType: GlassType;

  @ApiProperty({ enum: GlassClass, example: GlassClass.IG_CLASS })
  @IsEnum(GlassClass)
  glassClass: GlassClass;

  @ApiProperty({ example: 6.0, description: 'Thickness in mm' })
  @IsNumber()
  @Min(0)
  thickness: number;

  @ApiProperty({ example: 1200.0, description: 'Width in mm' })
  @IsNumber()
  @Min(0)
  width: number;

  @ApiProperty({ example: 800.0, description: 'Height in mm' })
  @IsNumber()
  @Min(0)
  height: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 1500.0 })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING, required: false })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ enum: Priority, example: Priority.MEDIUM, required: false })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiProperty({ example: 'Polished edges', required: false })
  @IsOptional()
  @IsString()
  edgeWork?: string;

  @ApiProperty({ example: 'Anti-reflective coating', required: false })
  @IsOptional()
  @IsString()
  coating?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  tempering?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  laminated?: boolean;

  @ApiProperty({ example: '2025-07-15T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  requiredDate?: string;

  @ApiProperty({ example: 'Customer special requirements', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'Internal production notes', required: false })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}
