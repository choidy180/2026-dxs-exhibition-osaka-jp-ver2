# 고모텍 CCTV — 갤럭시 테스트 앱

로그인 후 CCTV 목록과 푸시 알림 ON/OFF를 사용하는 Android 앱입니다. 알림은 Firebase Cloud Messaging(FCM)으로 받습니다. 홈 화면에 추가한 웹 앱과는 별도 앱이며 이름은 **고모텍 CCTV**입니다.

## 서버와 APK를 준비한 PC에서 테스트하기

**아래의 `192.168.137.1`은 핫스팟 주소 예시입니다. 그대로 입력하지 말고 현재 PC에 실제 할당된 주소와 서버 실행 창의 접속 주소를 사용하세요.** 서버와 APK는 아래 관리자 절차로 먼저 준비해야 합니다.

1. PC의 모바일 핫스팟을 켜고 갤럭시를 연결합니다. CCTV에 연결된 PC의 원래 네트워크도 유지합니다.
2. 프로젝트 폴더에서 터미널을 열고 아래 명령을 실행합니다. 이미 서버가 켜져 있다면 다시 실행할 필요가 없습니다.

   ```powershell
   npm run push:phone -- --host=192.168.137.1
   ```

3. 갤럭시의 삼성 인터넷 또는 Chrome 주소 입력칸에 `https://192.168.137.1:3000/lab/push`를 입력합니다.
4. **앱 설치 → Android 앱 다운로드** → 다운로드한 `dxs-cctv-test.apk` → **설치**를 누릅니다. 휴대폰에서 출처 허용을 요청하면 사용 중인 브라우저에 대해 설치를 허용합니다. 회사 정책으로 차단된 기기는 기기 관리자에게 확인합니다.
5. 설치된 **고모텍 CCTV**를 열고 기존 테스트 계정으로 **로그인**합니다. 로그인만으로 새 알림 권한 요청이나 등록·발송을 시작하지 않습니다. 아래 CCTV 목록에서 카메라를 선택하면 해당 영상 하나를 볼 수 있습니다.
6. 목록 위 **CCTV Push**를 **ON**으로 바꾸고 처음 나타나는 알림 요청에서 **허용**을 누릅니다. 첫 알림을 바로 발송하고 이후 10초 간격으로 반복합니다. 홈 화면으로 나가거나 최근 앱에서 닫아도 PC 서버·워커가 실행 중이면 발송합니다.
7. 휴대폰 알림창에서 제목 **고모텍 CCTV**, 본문 **`123번 CCTV 영상 수신 오류가 발생했습니다. (test)`** 형식의 알림을 확인합니다. 번호는 매번 1~200 중 무작위로 선택하며 실제 CCTV 장애와 무관합니다. 알림을 누르면 앱의 CCTV 화면으로 돌아갑니다.
8. **CCTV Push OFF**로 바꿔 현재 기기의 서버 반복 설정과 미발송 예약을 취소합니다. 이미 푸시 서비스에 전달된 알림은 OFF 직후에도 도착할 수 있습니다. 이전에 ON으로 켜 둔 반복 발송은 앱을 닫거나 다시 로그인해도 유지되므로, 테스트를 끝낼 때는 OFF로 끕니다.

직접 다운로드 주소의 예시는 `https://192.168.137.1:3000/lab/push/android.apk`입니다. 실제 서버 실행 창의 주소를 사용합니다. 다운로드 버튼과 파일은 관리자가 아래 절차로 APK를 빌드해 둔 경우에만 제공됩니다. PC 서버가 꺼진 동안에는 발송되지 않지만, **OFF로 끄지 않은 반복 설정과 미발송 예약이 남아 서버 재시작 후 발송이 재개될 수 있습니다.** 종료하거나 장소를 옮기기 전에는 앱에서 **CCTV Push OFF**를 확인한 뒤 서버 창에서 `Ctrl+C`를 누릅니다. 휴대폰과 서버 모두 Google 푸시 서비스에 접속할 인터넷 연결이 필요합니다. OS·네트워크에 따라 실제 수신 간격은 달라질 수 있습니다. 외부망에서는 알림을 받아도 내부 CCTV 화면을 열 수 없을 수 있습니다.

앱을 일반적으로 닫은 상태에서도 알림을 받도록 구현했습니다. 휴대폰 설정의 **강제 종료** 상태에서는 앱을 다시 열어야 수신이 재개될 수 있습니다. Android가 알림을 차단했거나 기기를 절전 대상으로 지정한 경우 휴대폰 설정을 확인합니다. **실제 갤럭시에서 설치·권한 허용·앱 종료 후 수신·알림 클릭·영상 재생은 실기기 검증 필요**입니다.

## 다른 사람에게 전달할 때

- 같은 내부망에서 위 웹 페이지의 APK 다운로드 버튼을 사용합니다. APK에 현재 서버의 공개 CA 인증서를 포함하므로, 설치된 앱 안에서는 CA를 휴대폰에 별도로 설치하지 않아도 됩니다.
- APK를 처음 받는 브라우저는 HTTPS 인증서를 신뢰해야 합니다. 브라우저 인증서 설치 없이 받으려면 관리자가 APK 파일을 직접 전달할 수 있습니다. APK 파일 위치: `.data/push-test-apk/dxs-cctv-test.apk`.
- 앱 설치만으로 내부망에 접속되는 것은 아닙니다. 서버 주소 또는 CA가 바뀌면 새 APK를 만들어 전달합니다. 공인 HTTPS, 외부 공개, VPN, 터널, 포트포워딩은 구성하지 않았습니다.
- 테스트 계정은 관리자에게 받습니다. 비밀번호를 소스 코드나 이 문서에 기록하지 않습니다.

## 관리자: 빌드와 서버 설정

APK를 빌드할 PC에는 JDK 17, Android SDK platform 35, Build Tools 35.0.0을 준비하고 `JAVA_HOME`, `ANDROID_HOME`을 지정합니다. 프로젝트 폴더를 복사하는 것만으로 빌드 도구가 설치되지는 않습니다. Gradle wrapper는 8.11.1이며 배포 ZIP의 SHA-256을 확인합니다.

1. 기존 [PWA 테스트 설정](push-test.md)을 준비합니다. `.env.push-test.local`의 `APP_ENV=test`, `PUSH_TEST_ENABLED=true`와 기존 인증·VAPID·DB 설정을 유지합니다.
2. Firebase 프로젝트에 패키지 이름 `com.scct.dxs.pushtest`인 Android 앱을 등록합니다. 다운로드한 `google-services.json`을 `.data/push-test-android/google-services.json`에 둡니다. 이 파일은 앱용 공개 구성이고, 아래 서버 비밀키와는 다릅니다.
3. 같은 프로젝트에서 FCM v1 API를 활성화하고 전용 서비스 계정에 `roles/firebasecloudmessaging.admin` 역할을 부여합니다. 서비스 계정 JSON을 **서버 전용** 환경변수 `PUSH_TEST_FCM_SERVICE_ACCOUNT_JSON`에 설정합니다. `.env.push-test.local`에 저장할 경우 JSON을 한 줄로 만들고 작은따옴표로 감쌉니다. `NEXT_PUBLIC_`을 붙이지 않으며 APK·public·Git에 넣지 않습니다.
4. `push:phone`을 실행해 내부 HTTPS 인증서를 준비한 후 APK를 만듭니다. **다음 명령의 IP도 예시이므로 실제 서버 주소로 바꿉니다.**

   ```powershell
   npm run push:apk -- --host=192.168.137.1
   ```

5. 빌드는 Firebase 앱용 공개 값과 공개 CA만 APK에 넣습니다. APK 빌드, Android 단위 검사, Android lint 성공 후 `.data/push-test-apk/dxs-cctv-test.apk`로 복사합니다. 서버 환경변수를 변경했다면 `push:phone`을 껐다가 다시 실행합니다.

`/lab/push/android.apk`는 테스트 활성 플래그가 모두 맞고 APK가 있을 때만 다운로드됩니다. 앱과 발송 API는 기존 테스트 인증·기기 식별을 사용합니다. 현재 사용자·현재 등록 기기만 반복 발송을 시작할 수 있으며, 반복 설정과 미발송 예약은 **CCTV Push OFF**로 취소합니다. FCM 설정 누락은 기존 웹 푸시 기능에 영향을 주지 않습니다.

즉시 첫 발송과 10초 간격 반복 예약은 SQLite와 독립 서버 작업자가 처리합니다. 성공한 발송마다 10초 뒤의 다음 예약 한 건만 만들며, 실패하거나 발송 결과가 불명확하면 반복을 중지합니다. FCM에는 완결된 제목·본문과 내부 이동 경로를 보냅니다. 수신 시 CCTV 서버를 조회하지 않습니다. 서버의 FCM 수락 응답은 휴대폰 표시를 확인한 결과가 아닙니다.

이 APK는 내부 테스트용 debug 서명입니다. 스토어 배포나 정식 배포 서명은 이번 범위에 포함하지 않습니다. 이후 업데이트를 같은 앱으로 설치하려면 같은 서명 키를 유지합니다.

## 주요 코드

- `android/push-test/`: 네이티브 앱, 기기 권한, FCM 수신, 출처 제한 WebView 연결
- `components/lab/push/`, `hooks/use-push-test.ts`, `utils/push-test-native.ts`: 앱 로그인, 푸시 ON/OFF와 모바일 CCTV 목록 연결
- `lib/push-test/fcm.ts`: 분리된 FCM 발송 함수
- `lib/push-test/{api,store,worker}.ts`: 현재 기기 등록, 기존 예약·인증 재사용
- `scripts/push-test-android-build.mjs`, `app/lab/push/android.apk/route.ts`: APK 빌드·테스트 전용 다운로드

공식 참고: [Firebase Android 설정](https://firebase.google.com/docs/android/setup), [FCM 메시지 수신](https://firebase.google.com/docs/cloud-messaging/android/receive-messages), [Android 네트워크 보안 구성](https://developer.android.com/privacy-and-security/security-config).
