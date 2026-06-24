'use client';
import { useEffect } from 'react';

// تسجيل الـ service worker لتمكين تثبيت PWA + استقبال الإشعارات
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
    }
  }, []);
  return null;
}
