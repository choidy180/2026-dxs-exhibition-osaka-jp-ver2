# GMT 운송 차량 모델

현재 원본 및 dev 3D 지도가 불러오는 파일은 **`gmt-tripo-red-white-container-truck.glb`**입니다. 2026-09-12 Tripo Studio에서 새로 생성한 붉은 운전석·긴 흰색 컨테이너 차량의 실제 지오메트리와 재질을 사용합니다.

- Tripo 원본: [생성 모델](https://studio.tripo3d.ai/ko/workspace/generate/23eeda37-33ab-4b0e-a8e9-065a9e34ce6e)
- 원본 보관: `assets/transport/gmt-tripo-red-white-source.glb` (프로젝트 루트 기준, 8,140,000 bytes)
- 웹용 후처리: `scripts/prepare-tripo-gmt-truck.mjs`
- 로딩 화면과 동일한 로고: `public/logo/gmt_logo_copy.png` (1,024 × 285)
- 사용 위치: `hooks/use-gmt-truck-model.ts` → 공유 `Transport3DMap` → 원본 및 dev 페이지

## 모델 구성

Tripo의 1,867,932개 삼각형 모델을 Studio에서 19,999개로 리토폴로지하고 GLB·2k로 내보냈습니다. 후처리는 원본 메쉬·재질·UV를 보존하고, 전체 방향·축척 조정과 양측 로고 추가 및 텍스처 축소만 수행합니다. 차량 외형은 Tripo가 생성한 결과이며 실차 CAD 치수를 보증하지 않습니다.

| 항목 | 웹용 파일 |
| --- | --- |
| 파일 크기 | 3,029,188 bytes |
| 삼각형 | 21,023개 (원본 19,999 + 양측 로고 1,024) |
| 메쉬 / 재질 | 3 / 2 |
| 이미지 | 차량 텍스처 3개 + 원본 GMT PNG 1개 |
| 차량 텍스처 최대 크기 | 1,024 × 1,024 |
| 정규화 길이 | 10.8 (지도에서는 2.2로 균일 축소) |
| 전방 / 바닥 | +Z / Y = 0 |
| 중심 | XZ 원점 |

내보낸 원본의 붉은 운전석은 -X 방향입니다. 후처리에서 Y축으로 +90° 회전해 전방을 +Z에 맞췄습니다. 컨테이너 양 측면의 실제 표면에 로고를 투영하며 양쪽에서 정방향으로 읽힙니다. 모든 이미지가 GLB 내부에 포함되어 외부 CDN·서명 URL·텍스처 요청에 의존하지 않습니다.

## 재생성

프로젝트 의존성이 설치된 **Node.js 24 이상**에서 실행합니다. 원본 파일을 덮어쓰지 않습니다.

```sh
node scripts/prepare-tripo-gmt-truck.mjs assets/transport/gmt-tripo-red-white-source.glb public/models/transport/gmt-tripo-red-white-container-truck.glb --yaw-deg 90 --max-texture-size 1024
```

`--inspect`는 파일을 쓰지 않고 원본 바운드·면 수·텍스처를 확인합니다. 다른 Tripo 파일로 교체할 때는 앞뒤 방향과 컨테이너 로고 위치를 다시 확인해야 합니다. GLB 메타데이터에는 원본 SHA-256과 후처리 방향을 기록합니다. 공개 폴더에는 만료되는 다운로드 URL이나 인증정보를 저장하지 않습니다.

## 이전 파일

`gmt-red-white-container-truck.glb`와 `scripts/generate-gmt-truck.mjs`는 이전에 프로젝트 안에서 직접 만든 차량입니다. Tripo 모델이 아니며 현재 지도에서는 불러오지 않습니다. 로딩·실패 동안의 간소화된 차량은 `GmtTruckModel`에서 표시하고 오류 안내에 재시도를 제공합니다.
