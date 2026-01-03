import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // CORS
  app.enableCors({
    origin: [
      'https://zimmarkets-22fq.vercel.app', 
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
     allowedHeaders: [
      'Content-Type', 
      'Authorization',
      'x-api-key',
      'X-API-Key',
      // For WebSocket authentication
      'Sec-WebSocket-Protocol',
      'Sec-WebSocket-Version',
      'Sec-WebSocket-Extensions',
      'Upgrade',
      'Connection',
    ],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Zimbabwe Marketplace API')
    .setDescription(`
      eBay-like marketplace API for Zimbabwe

      ## Real-time Chat System
      The platform includes a Facebook Messenger-style chat system with:
      - Real-time messaging between users
      - Online/offline status
      - Read receipts
      - Typing indicators
      - File/media sharing
      
      ### WebSocket Connection
      For real-time chat, connect to: \`ws://localhost:3004/chat\`
      Requires WebSocket token from: \`POST /api/v1/chat/auth/websocket-token\`
      `)
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth')
    .addBearerAuth({
      type: 'apiKey',
      in: 'query',
      name: 'token',
      description: 'WebSocket authentication token',
    }, 'WebSocket-auth')
    .addServer('http://localhost:3004/api/v1', 'Local Development with API prefix')
    .addServer('https://zimmarkets.vercel.app/api/v1', 'Production')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('listings', 'Product listings')
    .addTag('auctions', 'Auction management')
    .addTag('orders', 'Order processing')
    .addTag('payments', 'Payment processing')
    .addTag('reviews', 'User reviews')
    .addTag('chat', 'Real-time messagging between users')
    .addTag('artisans', 'Artisan/handy person management')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'ZimMarket API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .information-container { background: #fafafa; padding: 20px; }
    `,
    customJs: [
      'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js'
    ],
    customCssUrl: [
      'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css'
    ],
  });



  const port = process.env.PORT || 3004;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
  console.log(`📊 API Endpoint: http://localhost:${port}/api/v1`);
  console.log(`💬 WebSocket Chat: ws://localhost:${port}/chat`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // WebSocket server information
  console.log('\n=== Chat System Information ===');
  console.log(`WebSocket Path: /chat`);
  console.log(`Authentication: Bearer token via query parameter (?token=...)`);
  console.log(`Real-time Features:`);
  console.log(`  • Instant messaging`);
  console.log(`  • Online/offline status`);
  console.log(`  • Typing indicators`);
  console.log(`  • Read receipts`);
  console.log(`  • Message history`);
}
bootstrap();