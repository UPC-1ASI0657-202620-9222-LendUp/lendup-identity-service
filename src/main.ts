import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',').map(value => value.trim()).filter(Boolean);
  app.enableCors({ origin: origins });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  if (process.env.OPENAPI_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('LendUp - API de Identidad')
      .setDescription('Perfiles universitarios y verificación de tokens Firebase')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID Token' }, 'firebase')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(Number(process.env.PORT || 8081), '0.0.0.0');
}

void bootstrap();
