# 로컬 전시회 데모 실행 안내

## 실행

최초 한 번 인터넷이 연결된 상태에서 의존성을 설치합니다.

```powershell
npm install
```

개발 모드:

```powershell
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 변경 전 개발 서버가 실행 중이었다면 종료한 뒤 다시 실행해야 번역 로더 설정이 적용됩니다.

전시 운영용 빌드:

```powershell
npm run build
npm start
```

설치 및 빌드가 끝난 뒤에는 인터넷·사내 API·Firebase·카메라 서버·지도 키·AI API 키 없이 실행할 수 있습니다. 브라우저와 로컬 Next.js 서버 사이의 페이지/정적 파일 요청은 필요합니다. 3D 화면은 WebGL을 지원하는 데스크톱 브라우저를 사용합니다.

## 언어

- 첫 방문은 일본어입니다. 왼쪽 사이드바의 **실험실 → 전시 설정 → 언어 선택**에서 한국어·영어·일본어를 선택합니다.
- 선택한 언어는 브라우저에 저장되며 새로고침 후에도 유지됩니다.
- 사이드바 없는 전체 화면에서는 오른쪽 위 **실험실** 버튼으로 같은 설정을 엽니다.
- 언어 변경 시 현재 주소와 저장한 데모 데이터는 유지하고 열려 있는 팝업·임시 필터는 초기화합니다.
- 번역 추가 방법은 [다국어 구현 안내](exhibition-localization.md)를 참고합니다.

## 캐릭터 안내

- 각 페이지에 들어가면 왼쪽 아래에 DX 고양이의 상체와 말풍선이 나타납니다. 사이드바와 펼친 하위메뉴를 피해서 배치됩니다.
- 고양이는 데스크톱 폭 336px(확대 버전의 70%)으로 표시되고, 숨 쉬기·살짝 흔들리기·상하 움직임을 반복합니다. 말풍선은 제목·본문 길이에 필요한 만큼만 가로로 늘어나고, 화면의 남은 너비에 도달하면 줄바꿈됩니다. 제목 28px·본문 24px를 유지하며 좁은 모바일 화면에서는 말풍선을 캐릭터 위에 배치합니다.
- 선택한 언어로 현재 페이지를 소개하며 **다음 안내** 버튼으로 두 번째 설명을 볼 수 있습니다.
- 닫기 또는 `Esc`로 말풍선을 접고, 캐릭터를 눌러 다시 볼 수 있습니다. 페이지 이동 시 새 페이지 안내가 시작됩니다.
- **실험실 → 전시 설정 → 마스코트 안내 ON/OFF**로 캐릭터 전체를 표시하거나 숨깁니다. 기본값은 ON이며 `dxs.exhibition.guide.enabled`에 저장합니다.
- 안내 문안과 개발·백업 경로 연결은 `data/exhibition-page-guides.ts`에서 관리합니다. 외부 AI나 음성 API를 호출하지 않습니다.
- 동작 줄이기 설정을 사용하는 경우 반복 모션을 멈추고 등장 이동과 글자 표시 효과도 줄입니다.

## 시연 동작

| 영역 | 로컬 시연 방식 |
| --- | --- |
| 자재·입고·차량·창고 | 현재 날짜 기준 샘플, 입출고 및 점유율 표시 |
| 생산계획 | 샘플 계획 조회, 파일 업로드, 확정 및 브라우저 저장 |
| BOM·발주 | 샘플 BOM 전개, Excel 다운로드, 전송 상태 시뮬레이션 |
| 품질 검사 | 정상/불량 전환, 주기 갱신, 날짜별 검사 이력, 생성 이미지 |
| CCTV·현장 영상 | 저장된 MP4 반복 재생 및 로컬 이미지, 미디어 오류 재시도 |
| 입고 검수 CAM01~06 | 01~11 영상에서 카메라마다 중복 없이 무작위 재생. 종료 후 3초 초기화 카운트다운을 표시하고 직전 영상과 다른 영상 재생 |
| 운송 지도 | 외부 지도 타일 없이 그린 시연용 지도 및 차량 이동 |
| 3D 공장 | 저장된 GLB와 `public/draco` 디코더 사용 |
| AI 상담 | 자재·품질·운송·생산 시나리오별 설명과 표 |
| 알림 실험실 | 화면 안에서 반복 알림 시뮬레이션 |

AI 답변은 정해진 시연 시나리오입니다. 실제 ERP 전송, AI 추론, 카메라 스트리밍, 위치 추적, OS 푸시 발송은 수행하지 않습니다. 로컬 지도는 실제 도로 안내용이 아닙니다.

선택 언어는 `dxs.exhibition.locale`, 생산계획은 `dxs-exhibition-plans-v1-<날짜>`, 발주 상태는 `dxs-exhibition-orders-<리비전>` 키에 저장됩니다. 해당 사이트의 브라우저 저장 데이터를 지우면 처음 상태로 돌아옵니다. 저장소가 제한된 환경에서는 메모리 상태로 동작합니다.

## 로컬 시각 자료

입고 검수 영상 원본은 `video/`와 `public/videos/material-inbound/`에 보관합니다. 실제 CAM01~06은 `public/videos/material-inbound/web-v1/`의 웹용 영상을 재생합니다. 재생 목록은 `constants/material-camera-videos.ts`에서 관리합니다.

원본은 각각 1080p·약 7~9.5Mbps여서 여섯 카메라의 동시 재생에 약 45~55Mbps가 필요합니다. 웹용은 H.264 Main / 720p / 24fps / 최대 비트레이트 목표 1.2Mbps / 무음 / fast-start로 변환해 다운로드와 디코딩 부담을 낮췄습니다. 실제 네트워크 속도가 여섯 영상의 합산 전송량보다 낮으면 버퍼링은 여전히 발생할 수 있습니다.

버퍼링 중에는 마지막 프레임을 유지하고 작은 안내를 표시합니다. 브라우저가 재생을 차단하거나 일시 정지하면 재생 버튼을 제공하고, 탭으로 돌아왔을 때 재생을 다시 시도합니다. 영상 종료 후에는 기존처럼 3초 초기화 후 다른 영상을 선택합니다.

FFmpeg가 설치된 환경에서 `node scripts/optimize-material-camera-videos.mjs`로 웹용 파일을 재생성할 수 있습니다. 별도 실행 파일은 `FFMPEG_PATH`로 지정합니다. Vercel 빌드에서는 변환하지 않으므로 생성된 MP4 11개를 Git에 함께 커밋해야 합니다. `web-v1`은 1년 immutable 캐시를 사용하므로 원본을 교체할 때는 폴더 버전을 올리고 변환 스크립트·재생 목록·`next.config.ts` 헤더 경로를 함께 갱신합니다.

- `public/demo/factory-floor.png`: 제조 현장 카메라 대체 이미지.
- `public/demo/inspection-door.png`: 도어·가스켓 검사 이미지.
- `public/demo/exhibition-guide-cat.png`: 사용자가 제공한 열쇠고리 이미지에서 캐릭터만 분리·정리한 투명 배경의 상체 PNG.
- `public/videos/`: 기존 프로젝트 영상 재사용.
- `public/draco/`: 압축 3D 모델 디코더와 라이선스.

두 PNG는 내장 ImageGen 도구로 신규 생성했습니다. 사용한 생성 문안은 다음과 같습니다.

1. **Factory floor** — Photorealistic natural industrial exhibition demo CCTV still, landscape 16:9. Elevated security-camera view of a modern refrigerator factory: white and stainless cabinets on an assembly conveyor, yellow safety rails, robotic inspection fixtures, overhead lighting, clean gray floor, distant workers without identifiable faces. Authentic wide composition. No UI, overlays, timestamps, captions, logos or watermarks.
2. **Inspection door** — Photorealistic industrial machine-vision inspection close-up, landscape. White refrigerator door with a gray rubber gasket on a stainless fixture, at a slight angle, with a narrow black glass inset on the right. Neat seal corners, realistic neutral fixture. No labels, UI, arrows, logos or watermarks.

캐릭터는 내장 ImageGen 도구의 이미지 편집 모드로 제작했고 알파 채널을 보존했습니다. 편집 대상은 사용자 제공 열쇠고리 사진이며 최종 편집 문안은 다음과 같습니다.

> Use case: background-extraction. Asset type: transparent PNG upper-body mascot for a local exhibition website guide. Input image 1 is the EDIT TARGET: the supplied acrylic keychain photograph. Extract and faithfully clean up ONLY the illustrated lucky cat character inside the acrylic. Remove all metal keyring, clasp, chains, acrylic outline, reflections, texture, shadows, black background, legs and floor. Preserve this same cute white cat identity: orange forehead patches and short orange stripes, pink inner ears, friendly closed smiling eyes behind dark gray rectangular smart glasses with side modules, pink nose and smiling mouth, short whiskers, red collar with yellow bell, the raised paw on the viewer's left and orange forearm marking, and the white DX SOLUTIONS shirt with its small blue/gray circuit-tree mark. Retain the tiny shirt branding as closely as possible without adding text. Composition: single front-facing head-and-torso upper-body portrait cropped neatly just below the chest, both ears fully visible, friendly raised paw fully visible. Omit the lower gold coin and legs because this is a bust. Reconstruct a clean crisp flat 2D illustration from the printed artwork, dark soft outlines, original colors and proportions, no redesign, no 3D rendering. Character should fill 90% of the canvas with only a small transparent margin. True transparent background with alpha, not a checkerboard painted into the image, not a white or black backdrop. No speech bubble, no UI, no caption, no watermark. Output one isolated upper-body cat character.

## Vercel Git 배포

- 저장소의 애플리케이션 코드와 `public`을 함께 커밋하고 GitHub에 푸시한 뒤, Vercel에서 저장소를 Import합니다. Framework는 Next.js, Build Command는 `npm run build`, Output Directory는 기본값을 사용합니다. `EXHIBITION_DIST_DIR`은 설정하지 않습니다.
- 영상은 `public/videos/`와 `public/sample.mp4`, 스마트 팩토리 이미지는 `public/images/smart-factory/`에서 제공합니다. 원본 `video/`와 `.cursor.zip`은 배포에 필요하지 않습니다.
- Hobby 배포에서 서버 함수 12개 제한 오류가 발생하지 않도록 푸시 테스트 API 5개를 `app/api/push-test/[action]/route.ts`로 통합했습니다. `/api/push-test/` 아래 `login`, `status`, `subscribe`, `schedule`, `unsubscribe`의 기존 URL과 POST 동작은 유지됩니다. 빌드의 동적 서버 경로는 14개에서 10개로 줄어듭니다. 실제 Vercel 함수 수는 플랫폼의 번들링 결과에 따라 달라질 수 있습니다.
- 기존 5개 `route.ts`의 삭제와 새 `[action]/route.ts` 추가를 함께 커밋해야 합니다. 새 파일만 추가하면 기존 경로가 남아 함수 수가 줄어들지 않습니다.
- 전시 데모는 별도 외부 API 키가 필요하지 않습니다. 실제 푸시 테스트의 SQLite 저장소와 상시 워커는 Vercel용으로 전환한 것이 아니므로 `PUSH_TEST_ENABLED`를 켜지 않습니다.
- 공식 참고: [Vercel 함수 수와 번들링](https://vercel.com/docs/functions/runtimes#functions-created-per-deployment), [Next.js 동적 경로](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes).

## 검증 명령

```powershell
npx tsc --noEmit
npm run lint
npm run test:exhibition
npm run test:push
npm run build
```

전시 테스트는 외부 통신 호출 금지, 로컬 미디어 존재, 번역, 샘플 데이터 조회·저장·Excel 변환과 무발송 알림 동작을 확인합니다.
