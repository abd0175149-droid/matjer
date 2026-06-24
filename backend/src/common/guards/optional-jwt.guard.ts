import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// مصادقة اختيارية: تربط المستخدم إن وُجد توكن صالح، ولا تفشل إن غاب (للـ guest checkout)
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
