declare enum GlassType {
    FLOAT = "FLOAT",
    TEMPERED = "TEMPERED",
    LAMINATED = "LAMINATED",
    INSULATED = "INSULATED",
    LOW_E = "LOW_E",
    REFLECTIVE = "REFLECTIVE",
    TINTED = "TINTED",
    FROSTED = "FROSTED",
    PATTERNED = "PATTERNED",
    BULLETPROOF = "BULLETPROOF"
}
declare enum GlassClass {
    SINGLE_GLASS = "SINGLE_GLASS",
    IG_CLASS = "IG_CLASS",
    DOUBLE_GLAZED = "DOUBLE_GLAZED",
    TRIPLE_GLAZED = "TRIPLE_GLAZED",
    SAFETY_GLASS = "SAFETY_GLASS",
    FIRE_RATED = "FIRE_RATED",
    ACOUSTIC = "ACOUSTIC",
    SOLAR_CONTROL = "SOLAR_CONTROL"
}
declare enum OrderStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    IN_PRODUCTION = "IN_PRODUCTION",
    QUALITY_CHECK = "QUALITY_CHECK",
    READY_FOR_DELIVERY = "READY_FOR_DELIVERY",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED",
    ON_HOLD = "ON_HOLD"
}
declare enum Priority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare class CreateOrderDto {
    orderNumber: string;
    customerId: string;
    glassType: GlassType;
    glassClass: GlassClass;
    thickness: number;
    width: number;
    height: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency?: string;
    status?: OrderStatus;
    priority?: Priority;
    edgeWork?: string;
    coating?: string;
    tempering?: boolean;
    laminated?: boolean;
    requiredDate?: string;
    notes?: string;
    internalNotes?: string;
}
export {};
