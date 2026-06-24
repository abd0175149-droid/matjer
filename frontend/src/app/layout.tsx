import type { Metadata } from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import { apiGet } from '@/lib/api';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'متجر — إكسسوارات الذهب التقليدي',
  description: 'متجر إلكتروني لإكسسوارات الذهب التقليدي (الروسي والصيني): أطقم، خواتم، أساور، قلادات.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // لون العلامة من إعدادات الإدارة (تخصيص الموقع) — mds/13 §7
  let brand = '';
  try {
    const s = await apiGet('/settings');
    if (s?.primary_color) brand = `:root{--gold:${s.primary_color};}`;
  } catch {
    /* defaults */
  }

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={tajawal.variable}>
      <body className="font-sans min-h-screen flex flex-col antialiased">
        {/* لا تستخدم <head> يدوياً في App Router — يُحقن الستايل كعنصر يرفعه Next تلقائياً */}
        {brand && <style dangerouslySetInnerHTML={{ __html: brand }} />}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
