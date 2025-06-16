"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var GlassType;
(function (GlassType) {
    GlassType["FLOAT"] = "FLOAT";
    GlassType["TEMPERED"] = "TEMPERED";
    GlassType["LAMINATED"] = "LAMINATED";
    GlassType["INSULATED"] = "INSULATED";
    GlassType["LOW_E"] = "LOW_E";
    GlassType["REFLECTIVE"] = "REFLECTIVE";
    GlassType["TINTED"] = "TINTED";
    GlassType["FROSTED"] = "FROSTED";
    GlassType["PATTERNED"] = "PATTERNED";
    GlassType["BULLETPROOF"] = "BULLETPROOF";
})(GlassType || (GlassType = {}));
var GlassClass;
(function (GlassClass) {
    GlassClass["SINGLE_GLASS"] = "SINGLE_GLASS";
    GlassClass["IG_CLASS"] = "IG_CLASS";
    GlassClass["DOUBLE_GLAZED"] = "DOUBLE_GLAZED";
    GlassClass["TRIPLE_GLAZED"] = "TRIPLE_GLAZED";
    GlassClass["SAFETY_GLASS"] = "SAFETY_GLASS";
    GlassClass["FIRE_RATED"] = "FIRE_RATED";
    GlassClass["ACOUSTIC"] = "ACOUSTIC";
    GlassClass["SOLAR_CONTROL"] = "SOLAR_CONTROL";
})(GlassClass || (GlassClass = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["CONFIRMED"] = "CONFIRMED";
    OrderStatus["IN_PRODUCTION"] = "IN_PRODUCTION";
    OrderStatus["QUALITY_CHECK"] = "QUALITY_CHECK";
    OrderStatus["READY_FOR_DELIVERY"] = "READY_FOR_DELIVERY";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["ON_HOLD"] = "ON_HOLD";
})(OrderStatus || (OrderStatus = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "LOW";
    Priority["MEDIUM"] = "MEDIUM";
    Priority["HIGH"] = "HIGH";
    Priority["URGENT"] = "URGENT";
})(Priority || (Priority = {}));
class CreateOrderDto {
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ORD-2025-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "orderNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'customer-id-here' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: GlassType, example: GlassType.TEMPERED }),
    (0, class_validator_1.IsEnum)(GlassType),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "glassType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: GlassClass, example: GlassClass.IG_CLASS }),
    (0, class_validator_1.IsEnum)(GlassClass),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "glassClass", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 6.0, description: 'Thickness in mm' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "thickness", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1200.0, description: 'Width in mm' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "width", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 800.0, description: 'Height in mm' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "height", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 150.0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1500.0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "totalPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'USD', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: OrderStatus, example: OrderStatus.PENDING, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(OrderStatus),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: Priority, example: Priority.MEDIUM, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Priority),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Polished edges', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "edgeWork", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Anti-reflective coating', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "coating", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateOrderDto.prototype, "tempering", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateOrderDto.prototype, "laminated", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-07-15T10:00:00Z', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "requiredDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Customer special requirements', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Internal production notes', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "internalNotes", void 0);
//# sourceMappingURL=create-order.dto.js.map