import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

export const UPLOADS_DIR = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

@Controller('admin/uploads')
export class UploadsController {
  @Post()
  @RequirePermissions('products.write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`;
          cb(null, safe);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        const ok = /image\/(jpe?g|png|webp|gif|avif)/.test(file.mimetype);
        cb(ok ? null : new BadRequestException('نوع ملف غير مدعوم'), ok);
      },
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('لا ملف');
    return { url: `/uploads/${file.filename}`, filename: file.filename };
  }
}
