import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isPushTestEnabled } from '@/lib/push-test/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'PWA 푸시 테스트',
  manifest: '/lab/push/manifest.webmanifest',
  icons: { apple: '/lab/push/icon/180' },
  appleWebApp: { capable: true, title: 'PWA 푸시 테스트', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
};

export default function PushTestLayout({ children }: { children: React.ReactNode }) {
  if (!isPushTestEnabled()) notFound();
  return children;
}
