# 스마트 팩토리 카메라 이미지

`/production/smart-factory-dashboard` 왼쪽의 두 영상 영역은 첨부 화면의 위·아래 장면을 기반으로 편집한 정지 이미지로 표시합니다. 내장 ImageGen 도구로 사진 위의 기존 UI를 제거했으며, 가려져 있던 부분은 이미지 편집으로 복원한 것이므로 원본 사진의 무손실 크롭은 아닙니다.

- 위쪽: `public/images/smart-factory/gr5-material-1.png`
- 아래쪽: `public/images/smart-factory/gr5-material-2.png`
- 이미지 설정과 첨부 화면의 수치: `constants/smart-factory-camera-snapshots.ts`
- 문구·숫자·진행률: `components/smart-factory-dashboard/CameraSnapshotCard.tsx`

한국어가 이미지에 고정되지 않도록 문구를 별도 UI로 표시합니다. `useLocale()`를 통해 프로젝트에서 선택한 한국어·일본어·영어로 전환되며, 초기 언어는 프로젝트 설정에 따릅니다. 사진과 적재 수치는 첨부된 화면 기준으로 고정됩니다(위 43%, 3/7 EA · 아래 67%, 2/3 EA).

## 이미지 편집 도구와 프롬프트

내장 `image_gen` 편집 도구를 사용했습니다. 입력은 사용자가 첨부한 두 카메라가 세로로 배치된 이미지 한 장입니다. 다음 공통 프롬프트 뒤에 각 장면의 선택 지시를 붙여 두 번 실행했습니다.

```text
Use case: precise-object-edit.
Input image 1 is the user's edit target, a tall screenshot containing TWO vertically stacked factory CCTV camera images.
Create a clean photographic asset for the existing software dashboard, NOT a new scene or redesigned UI.
Preserve the chosen camera photo's EXACT machinery, carts, stored materials, floors, perspective, lighting, all green/red detection rectangles, yellow slot boundaries and small floor numbers. Keep the original photographic quality, without beautifying or inventing equipment.
Remove all UI overlays from the chosen photo: the top-left translucent title with Korean writing and video icon, the top-right three-dot menu, and the lower-left translucent occupancy card including all Korean text, percentages, quantities and progress bar. Reconstruct only the small areas obscured by those overlays, continuing the immediately surrounding photo faithfully. No Korean, Japanese, English or other added text, no UI badges, no progress bars.
Output just ONE borderless rectangular landscape CCTV photograph filling the entire image, approximately 3:2 ratio, no rounded corners, white gutters, second panel or extra margins.
```

위쪽 장면:

```text
Select ONLY the UPPER photo, GR5 pre-assembly material camera #1: oblique view along a bright aisle on the RIGHT, long angled equipment/material slots on the LEFT. Exclude the lower photo completely.
```

아래쪽 장면:

```text
Select ONLY the LOWER photo, GR5 pre-assembly material camera #2: more top-down view with overhead curved conveyor pipes across the TOP, and three rectangular numbered slots 1, 2, 3 below; two large metal materials in the RIGHT slots. Exclude the upper photo completely.
```
