import { Vazirmatn } from 'next/font/google';
import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-vazirmatn',
  display: 'swap',
});

export const metadata = {
  title: 'پنل فروش لینک شو | مدیریت فروشگاه و رستوران',
  description: 'پنل اختصاصی فروشندگان، رستوران‌ها و فروشگاه‌های اینترنتی برای مدیریت محصولات، سفارش‌ها و اتصال مستقیم به آگهی‌های لینک شو',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="font-vazir bg-[#f5f5f7] text-[#1d1d1f] min-h-screen">
        {children}
      </body>
    </html>
  );
}
