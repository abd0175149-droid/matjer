'use client';
import { apiPost } from '@/lib/api';

// تفعيل إشعارات الجهاز عبر FCM (mds/09 §3). يرمي خطأ بالعربية عند الفشل.
export async function enablePush(authToken: string): Promise<string> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('متصفحك لا يدعم الإشعارات');
  }
  const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
  const { initializeApp, getApps } = await import('firebase/app');

  if (!(await isSupported())) throw new Error('الإشعارات غير مدعومة في هذا المتصفح');

  const cfg = await fetch('/push-config').then((r) => r.json());
  if (!cfg?.apiKey || !cfg?.vapidKey) throw new Error('الإشعارات غير مُهيّأة على الخادم بعد');

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('لم يُسمح بالإشعارات من المتصفح');

  const app = getApps().length ? getApps()[0] : initializeApp(cfg);
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: cfg.vapidKey, serviceWorkerRegistration: reg });
  if (!token) throw new Error('تعذّر الحصول على رمز الإشعار');

  await apiPost('/notifications/register', { token }, authToken);
  return token;
}
