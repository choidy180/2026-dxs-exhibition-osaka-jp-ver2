# DXS CCTV 테스트 APK

기존 `/lab/push` 화면을 Android WebView에서 열고, 알림은 Android의 Firebase Cloud Messaging으로 받습니다. 앱을 닫아도 알림 수신은 WebView나 페이지 타이머에 의존하지 않습니다. Android 설정에서 앱을 **강제 종료**한 경우에는 다시 앱을 열어야 알림이 재개될 수 있습니다. 실제 갤럭시에서 수신·영상 재생 검증이 필요합니다.

## 빌드

- JDK 17, Android SDK 35 / Build Tools 35.0.0, Gradle 8.11.1을 사용합니다.
- 서버 주소는 `-PserverOrigin=https://내부서버주소:포트`로 지정합니다. 다음 우선순위는 `PUSH_TEST_ORIGIN` 환경변수이며, 미설정 빌드는 `https://localhost:3000`을 사용합니다.
- `app/src/debug/res/raw/push_test_ca.crt`에 현재 내부 HTTPS 서버를 서명한 **공개 CA 인증서만** 넣습니다. 이 인증서는 debug 앱에서만 추가로 신뢰하며, 일반 휴대폰의 인증서 설정은 변경하지 않습니다. 개인키를 넣으면 안 됩니다.
- `app/src/main/res/values/firebase-config.xml`에 Firebase Android 앱 `com.scct.dxs.pushtest`의 `google_app_id`, `google_api_key`, `gcm_defaultSenderId`, `project_id` 문자열을 생성합니다. Firebase 서버 비밀키/서비스 계정 파일은 APK에 포함하지 않습니다. 이 XML이 없으면 앱 화면은 열리지만 푸시 등록에는 설정 필요 안내가 표시됩니다.
- `local.properties`의 `sdk.dir`에는 해당 컴퓨터의 Android SDK 경로를 지정합니다.

```powershell
.\gradlew.bat -PserverOrigin=https://192.168.137.1:3000 :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

위 주소는 현재 테스트 핫스팟의 예시입니다. 실제 내부 서버 주소와 인증서가 일치해야 합니다. 결과물은 `app/build/outputs/apk/debug/app-debug.apk`입니다. HTTPS 오류를 무시하는 우회나 HTTP 접속은 지원하지 않습니다.

## 웹 화면 연결 계약

허용한 HTTPS origin의 최상위 프레임에만 `window.DxsNativePush` 요청을 처리합니다. 다른 origin으로의 화면 이동과 iframe의 네이티브 호출을 차단합니다.

```javascript
DxsNativePush.onmessage = (event) => {
  const response = JSON.parse(event.data); // { id, result } 또는 { id, error: { code, message } }
};
DxsNativePush.postMessage(JSON.stringify({ id: 'request-1', method: 'getStatus' }));
```

| 메서드 | 반환값 | 동작 |
| --- | --- | --- |
| `getStatus` | `{permission, configured}` | 현재 시스템 권한과 Firebase 설정만 확인 |
| `getToken` | `{token: string \| null}` | 이전에 등록한 캐시 토큰만 읽기 |
| `requestPermission` | `{permission, configured}` | 버튼 클릭 흐름에서 Android 13 이상 권한 요청 |
| `register` | `{token}` | 허용된 기기의 FCM 토큰 발급·갱신 |
| `unregister` | `{unregistered: true}` | 토큰 삭제 및 자동 발급 해제 |

권한은 `granted`, `denied`, `default` 중 하나입니다. 서버의 인증과 현재 기기 등록/예약 취소는 웹 API가 수행하며, 네이티브 앱은 서버 계정·비밀번호를 별도로 저장하지 않습니다. 앱 재개 시 웹의 `focus` 이벤트로 현재 기기 상태를 다시 확인할 수 있습니다.

알림 채널은 `push_test`입니다. 서버는 제목·본문이 포함된 FCM `notification`과 `data`를 함께 보내며, 앱이 열려 있으면 서비스가 시스템 알림을 표시하고 닫혀 있으면 FCM SDK가 표시합니다. 알림 클릭은 payload URL과 무관하게 앱의 `/lab/push?native=android`로 이동합니다. 외부망에서는 내부 CCTV 페이지가 열리지 않을 수 있습니다.
