import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');
  private enabled = false;

  constructor(private prisma: PrismaService) {
    try {
      const sa = this.loadServiceAccount();
      if (sa && !admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(sa) });
        this.enabled = true;
        this.logger.log('Firebase Admin مُهيّأ — دفع الإشعارات مُفعّل');
      } else if (!sa) {
        this.logger.warn('لا توجد بيانات خدمة Firebase — دفع الإشعارات معطّل (الإشعارات الداخلية تعمل)');
      }
    } catch (e: any) {
      this.logger.error(`فشل تهيئة Firebase: ${e.message}`);
    }
  }

  // يقرأ حساب الخدمة من env (JSON أو base64) أو من ملف
  private loadServiceAccount(): admin.ServiceAccount | null {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw && raw.trim()) {
      const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      return JSON.parse(text);
    }
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (path && fs.existsSync(path)) return JSON.parse(fs.readFileSync(path, 'utf8'));
    return null;
  }

  async registerToken(token: string, userId?: number, userAgent?: string) {
    if (!token) return { ok: false };
    await this.prisma.pushToken.upsert({
      where: { token },
      update: { userId: userId ?? null, userAgent },
      create: { token, userId: userId ?? null, userAgent },
    });
    return { ok: true };
  }

  listForUser(userId: number) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async unreadCount(userId: number) {
    return { count: await this.prisma.notification.count({ where: { userId, isRead: false } }) };
  }

  async markRead(userId: number, id?: number) {
    await this.prisma.notification.updateMany({ where: { userId, ...(id ? { id } : {}) }, data: { isRead: true } });
    return { ok: true };
  }

  // ينشئ إشعاراً داخلياً + يدفع FCM لأجهزة المستخدم (إن كان مفعّلاً)
  async notifyUser(userId: number | null | undefined, title: string, body: string, data?: Record<string, string>) {
    if (!userId) return;
    await this.prisma.notification.create({ data: { userId, title, body, data: data ?? undefined } });
    if (!this.enabled) return;
    const tokens = (await this.prisma.pushToken.findMany({ where: { userId }, select: { token: true } })).map((t) => t.token);
    if (tokens.length) await this.push(tokens, title, body, data);
  }

  private async push(tokens: string[], title: string, body: string, data?: Record<string, string>) {
    try {
      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data ?? {},
        webpush: { fcmOptions: { link: process.env.FRONTEND_URL || 'https://sooq.grade.sbs' }, notification: { icon: '/icons/icon-192.png' } },
      });
      // نظّف الرموز غير الصالحة
      const dead: string[] = [];
      res.responses.forEach((r, i) => {
        if (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code || '')) dead.push(tokens[i]);
      });
      if (dead.length) await this.prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    } catch (e: any) {
      this.logger.error(`فشل دفع FCM: ${e.message}`);
    }
  }
}
