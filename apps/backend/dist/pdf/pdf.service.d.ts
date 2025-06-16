import { OrdersService } from '../orders/orders.service';
export declare class PdfService {
    private ordersService;
    constructor(ordersService: OrdersService);
    generateOrderPdf(orderId: string): Promise<string>;
    private generateOrderHtml;
}
