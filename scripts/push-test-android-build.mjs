import { spawn } from 'node:child_process';
import { X509Certificate, createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseEnv } from 'node:util';
import { resolvePrivateHost } from './push-test-local.mjs';

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const xml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);

async function main() {
  const settings = existsSync('.env.push-test.local') ? parseEnv(readFileSync('.env.push-test.local', 'utf8')) : {};
  if ((process.env.APP_ENV ?? settings.APP_ENV) !== 'test'
    || (process.env.PUSH_TEST_ENABLED ?? settings.PUSH_TEST_ENABLED) !== 'true') {
    throw new Error('명시적으로 활성화한 테스트 환경에서만 APK를 만듭니다. 먼저 push:setup을 실행해주세요.');
  }
  const port = process.env.PORT || '3000';
  if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65534) throw new Error('테스트 포트를 확인해주세요.');
  const origin = `https://${resolvePrivateHost(option('host'))}:${port}`;
  const project = resolve('android/push-test');
  const firebasePath = resolve(option('firebase') || '.data/push-test-android/google-services.json');
  if (!existsSync(firebasePath)) throw new Error('Firebase Android 구성 파일을 .data/push-test-android/google-services.json에 저장해주세요.');
  let firebase;
  try { firebase = JSON.parse(readFileSync(firebasePath, 'utf8')); }
  catch { throw new Error('Firebase Android 구성 파일을 읽지 못했습니다. 올바른 google-services.json 파일인지 확인해주세요.'); }
  const client = firebase.client?.find(item => item.client_info?.android_client_info?.package_name === 'com.scct.dxs.pushtest');
  const resources = {
    google_app_id: client?.client_info?.mobilesdk_app_id,
    google_api_key: client?.api_key?.[0]?.current_key,
    gcm_defaultSenderId: firebase.project_info?.project_number,
    project_id: firebase.project_info?.project_id,
  };
  if (!client || Object.values(resources).some(value => typeof value !== 'string' || !/^[A-Za-z0-9_:.-]+$/.test(value))) {
    throw new Error('이 앱 패키지에 맞는 Firebase Android 구성 파일인지 확인해주세요.');
  }
  if (!resources.google_app_id.includes(':android:')) throw new Error('Firebase 웹 앱 구성을 Android 앱에 사용할 수 없습니다.');
  const caPath = resolve('.data/push-test-ca.crt');
  if (!existsSync(caPath)) throw new Error('먼저 push:phone으로 내부 HTTPS 서버를 실행해주세요.');
  const certificate = new X509Certificate(readFileSync(caPath));
  if (!certificate.ca || Date.parse(certificate.validTo) <= Date.now()) throw new Error('유효한 테스트 CA 인증서가 필요합니다.');
  const localJdkRoot = resolve('.data/android-tools/jdk');
  const localJdk = existsSync(localJdkRoot) ? readdirSync(localJdkRoot).find(name => name.startsWith('jdk-')) : undefined;
  const javaHome = process.env.JAVA_HOME || (localJdk ? join(localJdkRoot, localJdk) : '');
  const java = join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || resolve('.data/android-tools/sdk');
  if (!existsSync(java) || !existsSync(join(sdk, 'platforms/android-35/android.jar'))) {
    throw new Error('JDK 17과 Android SDK 35가 필요합니다. docs/push-test-android.md의 빌드 준비를 확인해주세요.');
  }
  await mkdir(join(project, 'app/src/main/res/values'), { recursive: true });
  await mkdir(join(project, 'app/src/debug/res/raw'), { recursive: true });
  await writeFile(join(project, 'app/src/main/res/values/firebase-config.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${Object.entries(resources).map(([name, value]) => `  <string name="${name}" translatable="false">${xml(value)}</string>`).join('\n')}\n</resources>\n`);
  // APK에는 공개 CA만 포함한다. 개인키나 서버 환경변수는 빌드에 전달하지 않는다.
  await writeFile(join(project, 'app/src/debug/res/raw/push_test_ca.crt'), certificate.toString());
  const buildEnv = Object.fromEntries(Object.entries(process.env)
    .filter(([name]) => !name.startsWith('PUSH_TEST_') && name !== 'GOOGLE_APPLICATION_CREDENTIALS'));
  Object.assign(buildEnv, { JAVA_HOME: javaHome, ANDROID_HOME: sdk, GRADLE_USER_HOME: resolve('.data/android-tools/gradle-cache') });
  console.log(`갤럭시 테스트 APK를 만듭니다. 연결 서버: ${origin}`);
  const exitCode = await new Promise((resolveExit, reject) => {
    const child = spawn(java, ['-classpath', 'gradle/wrapper/gradle-wrapper.jar', 'org.gradle.wrapper.GradleWrapperMain',
      '--no-daemon', `-PserverOrigin=${origin}`, ':app:assembleDebug', ':app:testDebugUnitTest', ':app:lintDebug'],
    { cwd: project, env: buildEnv, stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('exit', code => resolveExit(code));
  });
  if (exitCode !== 0) throw new Error('APK 빌드 또는 Android 검사에 실패했습니다. 위 오류를 확인해주세요.');
  const output = resolve('.data/push-test-apk/dxs-cctv-test.apk');
  await mkdir(resolve('.data/push-test-apk'), { recursive: true });
  await copyFile(join(project, 'app/build/outputs/apk/debug/app-debug.apk'), output);
  const sha256 = createHash('sha256').update(readFileSync(output)).digest('hex');
  await writeFile(resolve('.data/push-test-apk/build-info.json'), JSON.stringify({ origin, sha256, builtAt: new Date().toISOString() }, null, 2));
  console.log(`APK 준비 완료: ${output}\n휴대폰 다운로드: ${origin}/lab/push/android.apk`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
