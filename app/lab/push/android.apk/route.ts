import { readAndroidTestApk } from '@/lib/push-test/android-apk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const apk = await readAndroidTestApk();
  if (!apk) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(apk), { headers: {
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': 'attachment; filename="dxs-cctv-test.apk"',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
