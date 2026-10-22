# 입고 검수 영상 언어

`/material/inbound-inspection`의 일반 카메라와 확대 화면은 같은 언어별 재생 목록을 사용합니다.

| 선택 언어 | 영상 | 경로 |
| --- | --- | --- |
| 일본어 | 기존 일본어 11개 | `public/videos/material-inbound/web-v1/*_JP.mp4` |
| 한국어 | 한국어 11개 | `public/videos/material-inbound/web-ko-v1/*_KO.mp4` |
| 영어 | 한국어와 동일 | `public/videos/material-inbound/web-ko-v1/*_KO.mp4` |

목록 선택은 `constants/material-camera-videos.ts`의 `getMaterialCameraVideos()`에서 처리하고,
`hooks/use-material-camera-videos.ts`에서 현재 언어로 적용합니다. 언어가 바뀌면 영상 선택도 초기화됩니다.
동시에 재생하는 여섯 영상의 중복 방지와 영상 종료 후 3초 초기화 동작은 유지합니다.

한국어판은 일본어 문구를 덮어 가리지 않고, UI가 없는 원본 촬영 영상에 한국어를 합성했습니다.
번호·품번·입고수량, 녹화·저장 상태, 전표 인식·저장 알림을 한국어로 표시하며,
품번·수량·전체 재생 길이와 표시 시점은 일본어판에 맞췄습니다.
촬영 영상에 담긴 전표와 현장 표지판은 그대로입니다.

## 한국어 영상 재생성

필요 도구: Python + Pillow, 프로젝트 Node.js 의존성(`tsx`), FFmpeg(`libx264`).

1. UI 합성 전 원본 11개를 별도 폴더에 준비합니다. 각 파일명은 대응하는
   `public/videos/material-inbound/`의 일본어 파일명과 같게 지정합니다.
2. 프로젝트 루트에서 실행합니다.

```powershell
python scripts/render-material-camera-videos.py --source-dir <원본-폴더> --ffmpeg <ffmpeg-실행파일>
```

한 영상만 다시 만들 때는 `--index 1`~`--index 11`을 추가합니다.
렌더러는 `styles/design-tokens.ts`의 색상·반경과 프로젝트 Pretendard 폰트를 사용합니다.
출력은 기존 배포 영상과 같은 1280×720, 24fps, 무음 H.264 MP4이며 fast-start를 적용합니다.

```powershell
npx tsx --test tests/exhibition/material-camera-video.test.ts
```

위 검사는 언어별 연결, 11개 파일의 존재·품번 대응·재생 길이·해상도·코덱·비트레이트·용량을 확인합니다.
