import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/common/BottomNav';
import { MotionProvider } from '@/components/common/MotionProvider';

export const metadata: Metadata = {
  title: 'Golf Swing Compare - 本機高爾夫揮桿影片比對工具',
  description: '手機優先的本機高爾夫揮桿影片比對與階段標記工具，影片不離開裝置。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GolfSwing',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen pb-20 bg-canvas text-label flex flex-col antialiased selection:bg-tint-line">
        <MotionProvider>
          <main className="flex-1 max-w-md mx-auto w-full flex flex-col">
            {children}
          </main>
          <BottomNav />
        </MotionProvider>
      </body>
    </html>
  );
}
