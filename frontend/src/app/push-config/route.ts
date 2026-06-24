import { NextResponse } from 'next/server';

// إعداد Firebase للويب (قيم عامة) من بيئة التشغيل — يقرأها العميل والـ service worker
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_WEB_PROJECT_ID || '',
    messagingSenderId: process.env.FIREBASE_WEB_SENDER_ID || '',
    appId: process.env.FIREBASE_WEB_APP_ID || '',
    vapidKey: process.env.FIREBASE_WEB_VAPID_KEY || '',
  });
}
