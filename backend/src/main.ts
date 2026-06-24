import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // rawBody:true لازم لتحقق توقيع webhooks لاحقاً (errata R-6)
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api'); // errata C-1: بلا نسخة في MVP
  app.use(helmet({ crossOriginResourcePolicy: false }));

  const origins = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT) || 4002;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 matjer backend on :${port} (prefix /api)`);
}
bootstrap();
