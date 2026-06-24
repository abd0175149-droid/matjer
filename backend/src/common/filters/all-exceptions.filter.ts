import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

// شكل خطأ موحّد: { success:false, error:{ code, message } }
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'حدث خطأ غير متوقع';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      message = typeof body === 'string' ? body : body?.message ?? message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) console.error('[error]', exception);

    res.status(status).json({
      success: false,
      error: { code: status, message },
    });
  }
}
