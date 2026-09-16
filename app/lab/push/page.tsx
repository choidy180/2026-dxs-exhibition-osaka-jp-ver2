import PushTestClient from '@/components/lab/push/PushTestClient';
import { getPushTestCertificateSetup } from '@/lib/push-test/certificate';
import { getAndroidApkDownloadPath } from '@/lib/push-test/android-apk';

export default function PushTestPage() {
  return <PushTestClient certificateSetup={getPushTestCertificateSetup()} apkDownloadPath={getAndroidApkDownloadPath()} />;
}
