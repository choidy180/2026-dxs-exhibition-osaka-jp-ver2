import { getPushTestPublicCertificate } from '@/lib/push-test/certificate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const certificate = await getPushTestPublicCertificate();
  if (!certificate) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(certificate), { headers: {
    'Content-Type': 'application/x-x509-ca-cert',
    'Content-Disposition': 'attachment; filename="push-test-ca.crt"',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
