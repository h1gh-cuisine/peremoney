import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { RateLimitMiddleware } from './common/rate-limit.middleware';
import { requestLogging } from './common/request-logging.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(requestLogging);
  const rateLimit = new RateLimitMiddleware(app.get(ConfigService));
  app.use(rateLimit.use.bind(rateLimit));
  app.use(helmet());
  const config = app.get(ConfigService);
  const allowedOrigins = (config.get<string>('CORS_ORIGINS')
    ?? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3010,http://127.0.0.1:3010')
    .split(',').map((value) => value.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (config.get<string>('SWAGGER_ENABLED') === 'true' || config.get<string>('NODE_ENV') !== 'production') {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Peremoney API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  await app.listen(
    Number(process.env.PORT ?? 4000),
    process.env.HOST ?? '0.0.0.0',
  );
}

void bootstrap();
