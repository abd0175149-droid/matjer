import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

// يسجّل العمليات الإدارية (mds/10 §7)
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url: string = req.originalUrl || req.url || '';
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
    const isAdmin = url.includes('/admin/');
    const user = req.user;

    if (!isMutation || !isAdmin || !user) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
        this.prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action: `${method} ${url.split('?')[0]}`,
              entity: url.split('/admin/')[1]?.split('/')[0] ?? null,
              entityId: req.params?.id ? String(req.params.id) : null,
              meta: req.body && Object.keys(req.body).length ? { keys: Object.keys(req.body) } : undefined,
              ip: String(ip || '').slice(0, 64),
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}
