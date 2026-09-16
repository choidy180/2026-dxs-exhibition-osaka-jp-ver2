# 갤럭시 CCTV 테스트 앱

기존 CCTV 화면을 별도 Android 앱에서 열고, 알림은 Firebase Cloud Messaging(FCM)으로 받습니다. 홈 화면에 추가한 웹 앱과는 별도 앱이며 이름은 **DXS CCTV 테스트**입니다.

## 지금 준비된 PC에서 테스트하기

1. PC의 모바일 핫스팟을 켜고 갤럭시를 연결합니다. CCTV에 연결된 PC의 원래 네트워크도 유지합니다.
2. 프로젝트 폴더에서 터미널을 열고 아래 명령을 실행합니다. 이미 서버가 켜져 있다면 다시 실행할 필요가 없습니다.

   ```powershell
   npm run push:phone -- --host=192.168.137.1
   ```

3. 갤럭시의 삼성 인터넷 또는 Chrome 주소 입력칸에 `https://192.168.137.1:3000/lab/push`를 입력합니다.
4. **갤럭시 APK 다운로드** → 다운로드한 `dxs-cctv-test.apk` → **설치**를 누릅니다. 휴대폰에서 출처 허용을 요청하면 사용 중인 브라우저에 대해 설치를 허용합니다. 회사 정책으로 차단된 기기는 기기 관리자에게 확인합니다.
5. 설치된 **DXS CCTV 테스트**를 엽니다. 기존 테스트 계정으로 로그인하고 알림을 **허용**합니다. 별도 알림 켜기 버튼을 누를 필요 없이 현재 기기를 등록합니다.
6. 상단 **알림 설정** → **테스트 푸시**를 누릅니다. “30초 후 발송됩니다”가 나오면 홈 화면으로 나가거나 최근 앱에서 닫고 기다립니다.
7. 휴대폰 알림창에 `[테스트] TEST-CAM-…` 알림이 한 번 오는지 확인합니다. 알림을 누르면 앱의 CCTV 화면으로 돌아갑니다.

직접 다운로드 주소는 `https://192.168.137.1:3000/lab/push/android.apk`입니다. 이 주소는 현재 PC 핫스팟 예시이며 서버 실행 중 같은 내부망에서 접속합니다. PC 서버를 종료하면 예약 발송이 중단되고, 오래된 예약은 만료됩니다. 휴대폰과 서버 모두 Google 푸시 서비스에 접속할 인터넷 연결이 필요합니다. 외부망에서는 알림을 받아도 내부 CCTV 화면을 열 수 없을 수 있습니다.

앱을 일반적으로 닫은 상태에서도 알림을 받도록 구현했습니다. 휴대폰 설정의 **강제 종료** 상태에서는 앱을 다시 열어야 수신이 재개될 수 있습니다. Android가 알림을 차단했거나 기기를 절전 대상으로 지정한 경우 휴대폰 설정을 확인합니다. **실제 갤럭시에서 설치·권한 허용·앱 종료 후 수신·알림 클릭·영상 재생은 실기기 검증 필요**입니다.

## 다른 사람에게 전달할 때

- 같은 내부망에서 위 웹 페이지의 APK 다운로드 버튼을 사용합니다. APK에 현재 서버의 공개 CA 인증서를 포함하므로, 설치된 앱 안에서는 CA를 휴대폰에 별도로 설치하지 않아도 됩니다.
- APK를 처음 받는 브라우저는 HTTPS 인증서를 신뢰해야 합니다. 브라우저 인증서 설치 없이 받으려면 관리자가 APK 파일을 직접 전달할 수 있습니다. APK 파일 위치: `.data/push-test-apk/dxs-cctv-test.apk`.
- 앱 설치만으로 내부망에 접속되는 것은 아닙니다. 서버 주소 또는 CA가 바뀌면 새 APK를 만들어 전달합니다. 공인 HTTPS, 외부 공개, VPN, 터널, 포트포워딩은 구성하지 않았습니다.
- 테스트 계정은 관리자에게 받습니다. 비밀번호를 소스 코드나 이 문서에 기록하지 않습니다.

## 관리자: 빌드와 서버 설정

현재 PC의 빌드 도구는 `.data/android-tools/`에 준비되어 있습니다. 새 PC에는 JDK 17, Android SDK platform 35, Build Tools 35.0.0을 준비하고 `JAVA_HOME`, `ANDROID_HOME`을 지정합니다. Gradle wrapper는 8.11.1이며 배포 ZIP의 SHA-256을 확인합니다.

1. 기존 [PWA 테스트 설정](push-test.md)을 준비합니다. `.env.push-test.local`의 `APP_ENV=test`, `PUSH_TEST_ENABLED=true`와 기존 인증·VAPID·DB 설정을 유지합니다.
2. Firebase 프로젝트에 패키지 이름 `com.scct.dxs.pushtest`인 Android 앱을 등록합니다. 다운로드한 `google-services.json`을 `.data/push-test-android/google-services.json`에 둡니다. 이 파일은 앱용 공개 구성이고, 아래 서버 비밀키와는 다릅니다.
3. 같은 프로젝트에서 FCM v1 API를 활성화하고 전용 서비스 계정에 `roles/firebasecloudmessaging.admin` 역할을 부여합니다. 서비스 계정 JSON을 **서버 전용** 환경변수 `PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON`에 설정합니다. `.env.push-test.local`에 저장할 경우 JSON을 한 줄로 만들고 작은따옴표로 감쌉니다. `NEXT_PUBLIC_`을 붙이지 않으며 APK·public·Git에 넣지 않습니다.
4. `push:phone`을 실행해 내부 HTTPS 인증서를 준비한 후 APK를 만듭니다.

   ```powershell
   npm run push:apk -- --host=192.168.137.1
   ```

5. 빌드는 Firebase 앱용 공개 값과 공개 CA만 APK에 넣습니다. APK 빌드, Android 단위 검사, Android lint 성공 후 `.data/push-test-apk/dxs-cctv-test.apk`로 복사합니다. 서버 환경변수를 변경했다면 `push:phone`을 껐다가 다시 실행합니다.

`/lab/push/android.apk`는 테스트 활성 플래그가 모두 맞고 APK가 있을 때만 다운로드됩니다. 앱과 발송 API는 기존 테스트 인증·기기 식별을 사용합니다. 현재 사용자·현재 등록 기기만 예약할 수 있으며, 미발송 예약은 알림 끄기로 취소합니다. FCM 설정 누락은 기존 웹 푸시 기능에 영향을 주지 않습니다.

30초 예약은 기존 SQLite와 독립 서버 작업자가 처리합니다. FCM에는 완결된 제목·본문과 내부 이동 경로를 보냅니다. 수신 시 CCTV 서버를 조회하지 않습니다. 서버의 FCM 수락 응답은 휴대폰 표시를 확인한 결과가 아닙니다.

이 APK는 내부 테스트용 debug 서명입니다. 스토어 배포나 정식 배포 서명은 이번 범위에 포함하지 않습니다. 이후 업데이트를 같은 앱으로 설치하려면 같은 서명 키를 유지합니다.

## 주요 코드

- `android/push-test/`: 네이티브 앱, 기기 권한, FCM 수신, 출처 제한 WebView 연결
- `components/lab/push/`, `hooks/use-push-test.ts`, `utils/push-test-native.ts`: 앱 로그인과 기존 CCTV 화면 연결
- `lib/push-test/fcm.ts`: 분리된 FCM 발송 함수
- `lib/push-test/{api,store,worker}.ts`: 현재 기기 등록, 기존 예약·인증 재사용
- `scripts/push-test-android-build.mjs`, `app/lab/push/android.apk/route.ts`: APK 빌드·테스트 전용 다운로드

공식 참고: [Firebase Android 설정](https://firebase.google.com/docs/android/setup), [FCM 메시지 수신](https://firebase.google.com/docs/cloud-messaging/android/receive-messages), [Android 네트워크 보안 구성](https://developer.android.com/privacy-and-security/security-config).
