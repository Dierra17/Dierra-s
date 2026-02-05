import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Made in Russia — каталог',
  description: 'Каталог брендов из Telegram-канала madeinrussia'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="border-b border-zinc-200 bg-white">
          <div className="container-main flex items-center justify-between py-4">
            <Link href="/" className="text-lg font-semibold">
              Made in Russia Catalog
            </Link>
            <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-900">
              Админка
            </Link>
          </div>
        </header>
        <main className="container-main py-6">{children}</main>
      </body>
    </html>
  );
}
