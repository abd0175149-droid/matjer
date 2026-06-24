/* Service Worker لـ matjer — PWA + استقبال إشعارات FCM في الخلفية */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// معالج fetch بسيط (مطلوب لقابلية تثبيت PWA) — يمرّر الطلبات للشبكة
self.addEventListener('fetch', () => {});

// يجلب إعداد Firebase من الخادم (قيم عامة) ثم يهيّئ استقبال الإشعارات
fetch('/push-config')
  .then((r) => r.json())
  .then((cfg) => {
    if (!cfg || !cfg.apiKey) return; // لم تُضبط بيانات Firebase بعد
    firebase.initializeApp(cfg);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const n = payload.notification || {};
      self.registration.showNotification(n.title || 'متجر الذهب', {
        body: n.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        dir: 'rtl',
        data: payload.data || {},
      });
    });
  })
  .catch(() => {});

// فتح الموقع عند النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
