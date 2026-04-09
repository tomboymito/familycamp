import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ФэмКэмп — Автокемпинг у леса',
  description: 'Уютный автокемпинг для всей семьи. Автопитчи, палатки, домики. Лес, речка, чистый воздух.',
  keywords: 'кемпинг, автокемпинг, отдых на природе, палатка, домик, семейный отдых',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="scroll-smooth">
      <body className="min-h-screen flex flex-col antialiased">{children}</body>
    </html>
  );
}
