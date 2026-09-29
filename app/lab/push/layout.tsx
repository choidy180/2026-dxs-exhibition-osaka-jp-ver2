import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '고모텍 CCTV',
  manifest: '/lab/push/manifest.webmanifest',
  icons: { apple: '/lab/push/icon/180' },
  appleWebApp: { capable: true, title: '고모텍 CCTV', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
};

export default function PushTestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
