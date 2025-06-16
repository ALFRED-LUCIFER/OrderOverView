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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createOrderDto) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: createOrderDto.customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${createOrderDto.customerId} not found`);
        }
        const existingOrder = await this.prisma.order.findUnique({
            where: { orderNumber: createOrderDto.orderNumber },
        });
        if (existingOrder) {
            throw new Error(`Order number ${createOrderDto.orderNumber} already exists`);
        }
        return this.prisma.order.create({
            data: {
                ...createOrderDto,
                requiredDate: createOrderDto.requiredDate ? new Date(createOrderDto.requiredDate) : null,
            },
            include: {
                customer: true,
            },
        });
    }
    async findAll() {
        return this.prisma.order.findMany({
            include: {
                customer: true,
            },
            orderBy: {
                orderDate: 'desc',
            },
        });
    }
    async findOne(id) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${id} not found`);
        }
        return order;
    }
    async update(id, updateOrderDto) {
        const order = await this.prisma.order.findUnique({
            where: { id },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${id} not found`);
        }
        return this.prisma.order.update({
            where: { id },
            data: {
                ...updateOrderDto,
                requiredDate: updateOrderDto.requiredDate ? new Date(updateOrderDto.requiredDate) : undefined,
            },
            include: {
                customer: true,
            },
        });
    }
    async remove(id) {
        const order = await this.prisma.order.findUnique({
            where: { id },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${id} not found`);
        }
        return this.prisma.order.delete({
            where: { id },
        });
    }
    async findByCustomer(customerId) {
        return this.prisma.order.findMany({
            where: { customerId },
            include: {
                customer: true,
            },
            orderBy: {
                orderDate: 'desc',
            },
        });
    }
    async findByStatus(status) {
        return this.prisma.order.findMany({
            where: { status: status },
            include: {
                customer: true,
            },
            orderBy: {
                orderDate: 'desc',
            },
        });
    }
    async search(query) {
        return this.prisma.order.findMany({
            where: {
                OR: [
                    { orderNumber: { contains: query } },
                    { notes: { contains: query } },
                    { customer: { name: { contains: query } } },
                    { customer: { company: { contains: query } } },
                ],
            },
            include: {
                customer: true,
            },
        });
    }
    async generateOrderNumber() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const lastOrder = await this.prisma.order.findFirst({
            where: {
                orderNumber: {
                    startsWith: `ORD-${year}${month}${day}`,
                },
            },
            orderBy: {
                orderNumber: 'desc',
            },
        });
        let sequence = 1;
        if (lastOrder) {
            const lastSequence = parseInt(lastOrder.orderNumber.split('-').pop() || '0');
            sequence = lastSequence + 1;
        }
        return `ORD-${year}${month}${day}-${String(sequence).padStart(3, '0')}`;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map