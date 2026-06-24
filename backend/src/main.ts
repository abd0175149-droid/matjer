import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { UPLOADS_DIR } from './modules/uploads/uploads.controller';

async function bootstrap() {
  // rawBody:true لازم لتحقق توقيع webhooks لاحقاً (errata R-6)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.setGlobalPrefix('api'); // errata C-1: بلا نسخة في MVP
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // خدمة الصور المرفوعة على /uploads (خارج /api؛ توكّلها الواجهة عبر rewrites)
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });

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
