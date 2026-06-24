import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

// التحقق من الصلاحية على مستوى الخادم (mds/10 §6). يُستخدم بعد JwtAuthGuard.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const perms: string[] = user?.permissions ?? [];
    const ok = required.every((p) => perms.includes(p));
    if (!ok) throw new ForbiddenException('لا تملك الصلاحية لهذه العملية');
    return true;
  }
}
