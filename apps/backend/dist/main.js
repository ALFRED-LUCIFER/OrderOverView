"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: [
            'http://localhost:5173',
            'https://localhost:5173',
            'http://localhost:3000',
            'https://localhost:3000',
            'https://your-frontend-domain.vercel.app',
            /https:\/\/.*\.vercel\.app$/,
            'https://your-frontend-url.onrender.com',
            /https:\/\/.*\.onrender\.com$/,
            process.env.CLIENT_URL
        ].filter(Boolean),
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api');
    if (process.env.DISABLE_SWAGGER !== 'true') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Glass Order Management API')
            .setDescription('API for managing glass orders and customers')
            .setVersion('1.0')
            .addTag('customers')
            .addTag('orders')
            .addTag('voice')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
    }
    const port = process.env.PORT || 3001;
    if (process.env.VERCEL) {
        await app.init();
    }
    else {
        await app.listen(port);
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        console.log(`🚀 Application is running on: ${protocol}://localhost:${port}`);
        if (process.env.DISABLE_SWAGGER !== 'true') {
            console.log(`📚 Swagger docs available at: ${protocol}://localhost:${port}/api/docs`);
        }
        console.log(`📡 WebSocket available at: ${protocol === 'https' ? 'wss' : 'ws'}://localhost:${port}`);
    }
    return app;
}
let app;
exports.default = async (req, res) => {
    if (!app) {
        app = await bootstrap();
    }
    return app.getHttpAdapter().getInstance()(req, res);
};
if (!process.env.VERCEL) {
    bootstrap();
}
//# sourceMappingURL=main.js.map