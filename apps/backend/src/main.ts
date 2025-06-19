import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend - updated for production
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      
      // Allow any localhost origin in development
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }
      
      // Production allowed origins
      const allowedOrigins = [
        'http://localhost:5173', 
        'http://localhost:5174',
        'http://localhost:5175',
        'https://localhost:5173', 
        'http://localhost:3000',
        'https://localhost:3000',
        // Vercel domains
        'https://order-over-view-frontend.vercel.app',
        'https://order-over-view-frontend-git-main-soumitras-projects-cad3dd70.vercel.app',
        // Environment variable for dynamic CLIENT_URL
        process.env.CLIENT_URL
      ].filter(Boolean);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check regex patterns for Vercel and other domains
      const regexPatterns = [
        /https:\/\/order-over-view-frontend.*\.vercel\.app$/,
        /https:\/\/.*\.vercel\.app$/,
        /https:\/\/.*\.onrender\.com$/,
      ];
      
      for (const pattern of regexPatterns) {
        if (pattern.test(origin)) {
          return callback(null, true);
        }
      }
      
      // Log rejected origins for debugging
      console.warn(`🚫 CORS: Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation 
  // Enable by default, but can be disabled with DISABLE_SWAGGER=true
  if (process.env.DISABLE_SWAGGER !== 'true') {
    const config = new DocumentBuilder()
      .setTitle('Glass Order Management API')
      .setDescription('API for managing glass orders and customers')
      .setVersion('1.0')
      .addTag('customers')
      .addTag('orders')
      .addTag('voice')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  
  // For Vercel, don't call listen in production
  if (process.env.VERCEL) {
    await app.init();
  } else {
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

// Export for Vercel
let app: any;
export default async (req: any, res: any) => {
  if (!app) {
    app = await bootstrap();
  }
  return app.getHttpAdapter().getInstance()(req, res);
};

// For local development and Render
if (!process.env.VERCEL) {
  bootstrap();
}
