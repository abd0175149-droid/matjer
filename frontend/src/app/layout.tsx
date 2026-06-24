import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'متجر — إكسسوارات الذهب التقليدي',
  description: 'متجر إلكتروني لإكسسوارات الذهب التقليدي (الروسي والصيني): أطقم، خواتم، أساور، قلادات.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
