/**
 * main.ts — Bootstrap. Cookie parser (JWT) + global validation pipe + CORS (with cookies) + port.
 */
import 'reflect-metadata';
// Loads .env.development (dev) or .env (prod) before AppModule is imported.
import './load-env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // External boundary: strip unknown fields and transform/validate into DTOs.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // credentials must be allowed to send/receive httpOnly cookies.
  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
