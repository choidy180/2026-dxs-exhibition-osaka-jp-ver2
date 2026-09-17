import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isPushTestEnabled } from '@/lib/push-test/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '고모텍 CCTV',
  manifest: '/lab/push/manifest.webmanifest',
  icons: { apple: '/lab/push/icon/180' },
  appleWebApp: { capable: true, title: '고모텍 CCTV', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
};

export default function PushTestLayout({ children }: { children: React.ReactNode }) {
  if (!isPushTestEnabled()) notFound();
  return children;
}
