# DXS 프론트엔드 디자인 가이드 (v1)

> **기준 화면**: [`/material/inbound-inspection`](../../app/material/inbound-inspection/page.tsx) — 자재 입고 검수 관제 대시보드
> **코드 토큰**: [`styles/design-tokens.ts`](../../styles/design-tokens.ts)
> **적용 범위**: `app/**`, `components/**`, `styles/**` 의 모든 신규 화면과 리팩터링
> **제정일**: 2026-08-19 (Asia/Seoul) — 이전에 흩어져 있던 화면별 임의 스타일 규칙은 모두 폐기하고 이 문서를 유일한 기준으로 삼는다.

---

## 0. 이 문서를 쓰는 방법

1. 새 페이지를 만들기 전에 **1장(레이아웃)과 2장(토큰)** 을 먼저 읽는다.
2. 색상·반경·여백·그림자는 **직접 hex를 쓰지 않고** `styles/design-tokens.ts` 를 import 한다.
3. 컴포넌트를 새로 만들기 전에 **5장(공통 컴포넌트 레시피)** 에 같은 역할의 패턴이 있는지 확인한다.
4. 작업을 끝내기 전 **9장 체크리스트** 를 통과시킨다.
5. 기준 화면과 다르게 갈 이유가 있으면, 그 예외를 **10장** 에 근거와 함께 추가한다.

가장 좋은 참고 구현체는 다음 두 파일이다. 새 화면은 이 둘의 구조를 복사해서 시작한다.

| 목적 | 파일 |
| --- | --- |
| 다중 컬럼 관제 대시보드 | [components/material-monitoring/MaterialMonitoringClient.tsx](../../components/material-monitoring/MaterialMonitoringClient.tsx) |
| 지표 + 필터 + 데이터 그리드 화면 | [components/material-inbound-status/InboundInspectionStatusClient.tsx](../../components/material-inbound-status/InboundInspectionStatusClient.tsx) |

---

## 1. 페이지 구조와 파일 배치

### 1-1. 라우트는 얇게, 화면은 클라이언트 컴포넌트로

`app/**/page.tsx` 는 **클라이언트 컴포넌트를 감싸는 5줄 래퍼**만 둔다. 화면 로직과 스타일은 전부 `components/<feature>/` 아래에 둔다.

```tsx
// app/material/inbound-inspection/page.tsx
import MaterialMonitoringClient from '@/components/material-monitoring/MaterialMonitoringClient';

export default function MaterialMonitoringPage() {
  return <MaterialMonitoringClient />;
}
```

### 1-2. 폴더 규칙

```
app/<domain>/<page>/page.tsx          # 라우트 래퍼 (서버 컴포넌트, 로직 없음)
components/<feature-name>/
  ├─ <Feature>Client.tsx              # 'use client' 오케스트레이터 (상태·데이터·레이아웃 조립)
  ├─ <Sub>Card.tsx                    # 카드/패널 단위 프레젠테이션 컴포넌트
  └─ styles.ts                        # 해당 feature 전용 styled-components
components/common/<component>/        # 두 개 이상의 feature 가 쓰는 공용 컴포넌트 + 전용 styles.ts
                                      # 예: components/common/date-picker (일자 선택 팝오버)
hooks/use-<feature>-data.ts           # 데이터 조회 훅 (fetch + loading + error + retry)
types/<feature>.ts                    # API/도메인 타입
utils/date.ts                         # 공용 날짜 유틸 (일자 표기, 근무일, 달력, 월 그룹)
utils/<feature>.ts                    # 순수 변환·집계 함수
utils/<feature>-api.ts                # API 클라이언트 (요청·응답 매핑, 목업 스위치)
constants/<feature>.ts                # API URL, 상수, 임계값
data/dummy-<feature>.ts               # 폴백/데모용 더미 데이터
styles/design-tokens.ts               # 공통 디자인 토큰
styles/styles.ts                      # 레거시 공통 primitive (Card, Column, PinkButton 등)
```

폴더명·파일명은 **kebab-case 폴더 + PascalCase 컴포넌트**. `styles.ts` 는 feature 폴더 안에 두고, 다른 feature 에서 import 하지 않는다.

### 1-3. Client 컴포넌트의 표준 순서

```tsx
'use client';

// 1) 데이터 훅
const { data, isLoading, error, refetch } = useFeatureData();
// 2) 로컬 UI 상태 (모달, 전체화면, 선택값)
const [showModal, setShowModal] = useState(false);
// 3) 파생값 (useMemo)
// 4) 콜백 (useCallback) — 개별 fetch 를 refreshData 하나로 모은다
// 5) 최초 조회 + 폴링 useEffect
// 6) 오버레이 중 body 스크롤 잠금 useEffect
// 7) 키보드 단축키 useEffect (Esc = 최상위 오버레이 닫기, Enter = 새로고침)
// 8) return JSX — Shell > Header > 지표 > 작업영역 > 오버레이
```

### 1-3-1. 실험실(개발 진행 중) 화면

아직 데이터가 연결되지 않은 화면은 **실험실** 메뉴 아래(`app/lab/**`, `components/lab/`)에 두고,
운영 메뉴에 노출하지 않는다. 실험실 화면은 다음을 지킨다.

- 페이지 상단에 `tone.info` 안내 배너로 **개발 진행 중이며 실제 데이터가 연결되지 않았음**을 밝힌다.
- eyebrow 에 `Lab · <화면 성격>` 을 쓰고, 목업 모드일 때는 `· MOCK DATA` 를 덧붙인다.
- 목업/실제 API 전환은 환경변수 한 개로 되도록 `utils/<feature>-api.ts` 에 분기를 둔다.
- 미연결 동작(전송·저장 등)은 버튼을 없애지 말고, 눌렀을 때 "API 연결 후 사용할 수 있습니다" 안내를 띄운다.

기준 구현: [components/lab/MesBomListClient.tsx](../../components/lab/MesBomListClient.tsx),
[components/lab/OrderPlanClient.tsx](../../components/lab/OrderPlanClient.tsx)

### 1-4. 폰트 스코프 (필수)

전역 스타일에 레거시 폰트가 섞여 있으므로, 페이지 루트에서 Pretendard 를 강제한다.

```tsx
const PageFontScope = styled.div`
  width: 100%;
  min-height: 100vh;
  font-family: ${font.family};

  *, *::before, *::after { font-family: inherit; }
`;
```

> 기존 화면 일부는 `!important` 로 강제하고 있으나, 신규 화면은 `inherit` 만 사용한다. 숫자 강조용 Rajdhani(`font.numeric`)를 쓰는 요소는 이 규칙의 예외로 두고 해당 요소에 직접 지정한다.

---

## 2. 디자인 토큰

전부 [styles/design-tokens.ts](../../styles/design-tokens.ts) 에 정의되어 있다. 아래 표는 요약이며, **값이 충돌하면 코드 파일이 기준**이다.

### 2-1. 색상 — Slate 중립색 + 브랜드 레드

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `color.pageBg` | `#f8fafc` | 페이지 최외곽 배경 |
| `color.surface` | `#ffffff` | 카드·패널·모달 표면 |
| `color.surfaceSubtle` | `#f8fafc` | 카드 내부 스테이지, 스크롤 영역, 테이블 헤더 |
| `color.fill` | `#f1f5f9` | 칩·세그먼트 트랙·프로그레스 트랙 |
| `color.surfaceZebra` | `#fbfcfe` | 데이터 그리드 짝수 행 |
| `color.border` | `#e2e8f0` | 기본 외곽선 |
| `color.borderSoft` | `#edf2f7` | 대시보드 카드 외곽선(기본값) |
| `color.borderStrong` | `#cbd5e1` | hover 테두리, 점선 empty 테두리 |
| `color.divider` | `#f1f5f9` | 테이블·리스트 행 구분선 |
| `color.ink` | `#0f172a` | 제목, 핵심 수치 |
| `color.ink2` | `#334155` | 본문 |
| `color.ink3` | `#64748b` | 라벨, 보조 설명 |
| `color.ink4` | `#94a3b8` | 비활성, placeholder, empty 문구 |
| `color.brand` | `#D31145` | 브랜드 accent — 아이콘 배지, 활성 세그먼트, 진행률, eyebrow |
| `color.brandStrong` | `#be123c` | 브랜드 버튼 hover/pressed |
| `color.brandSoft` | `#FFF0F3` | 브랜드 칩 배경, 행 hover |
| `color.live` / `color.idle` | `#10b981` / `#cbd5e1` | 실시간 연결 dot / 대기 dot |

**금지**: 임의의 신규 hex 도입, 그라디언트 배경, 다크 표면을 배경으로 사용, 컬러 텍스트를 본문에 사용,
한쪽 변만 강조하는 인셋 바·굵은 `border-left` (2-2 참고).

> 브랜드 레드는 **accent 전용**이다. 화면 면적의 5% 이상을 차지하면 과다 사용이다. 큰 면적은 흰색 표면 + slate 중립색으로 채운다.

### 2-2. 상태 톤 (배지·칩·지표는 이 5종에서만 고른다)

| 톤 | fg | bg | border | 의미 |
| --- | --- | --- | --- | --- |
| `tone.success` | `#047857` | `#ecfdf5` | `#a7f3d0` | 검수완료, 정상, 연결됨 |
| `tone.warning` | `#b45309` | `#fffbeb` | `#fde68a` | 대기, 미확정, 확인 필요 |
| `tone.info` | `#2563eb` | `#eef4ff` | `#b9ccff` | 진행 중, 태블릿 처리, 참고 정보 |
| `tone.danger` | `#b91c1c` | `#fee2e2` | `#fecaca` | 불량, 실패, 오류 |
| `tone.neutral` | `#64748b` | `#f1f5f9` | `#e2e8f0` | 값 없음, 해당 없음 |

주의를 끌어야 하는 행이나 선택된 항목은 **옅은 톤 배경 + 사방 1px 테두리**로 표시하고, 필요하면 상태 배지를 함께 넣는다.

> **한쪽 변만 강조하는 패턴은 금지한다.** 좌측(또는 임의의 한쪽) 인셋 바 `box-shadow: inset 3px 0 <색>`,
> 한쪽만 두꺼운 `border-left`, 한쪽 변만 다른 색을 쓰는 방식 모두 사용하지 않는다.
> 강조는 항상 요소 전체(배경 + 사방 테두리)에 균일하게 적용한다.

### 2-3. 타이포그래피

- 폰트: **Pretendard** 고정(`font.family`). 숫자 강조 전용 보조 폰트만 Rajdhani(`font.numeric`).
- 웨이트: **400 / 500 / 600 만 사용**. 신규 화면에서 `700` 이상은 쓰지 않는다. (레거시 `styles/styles.ts` 의 `800` 은 사용 시 `600` 으로 덮어쓴다.)
- 사이즈: rem 스케일.

| 역할 | 토큰 | 값 | 웨이트 |
| --- | --- | --- | --- |
| 페이지/패널 제목 | `fontSize.pageTitle` | `1.15rem` | 600 |
| 카드 제목 | `fontSize.cardTitle` | `1.05rem` | 600 |
| 섹션 제목 | `fontSize.sectionTitle` | `1rem` | 600 |
| 본문 | `fontSize.body` | `0.88rem` | 500~600 |
| 보조 본문 | `fontSize.bodySm` | `0.85rem` | 500 |
| 라벨·메타 | `fontSize.meta` | `0.78rem` | 600 |
| 칩·헤더 셀 | `fontSize.micro` | `0.76rem` | 600 |
| 배지·캡션 | `fontSize.caption` | `0.72rem` | 600 |
| 지표 대표 수치 | `fontSize.metric` | `3rem` | 600 |

- 제목에는 `letter-spacing: -.02em`, `line-height: 1.1~1.2` 를 준다.
- **eyebrow**(제목 위 소형 영문 레이블): `0.76rem` / 600 / `text-transform: uppercase` / `color.brand` 또는 `color.ink3`.
- 한 줄 유지가 필요한 텍스트는 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` 3종 세트를 함께 쓴다.
- 코드·전표번호·품번은 `font.mono` 로 표기한다.

### 2-4. 여백 · 반경 · 그림자

- 여백: `4 / 6 / 8 / 10 / 12 / 14 / 16 / 20`. **페이지 패딩과 그리드 gap 은 12** 가 기본, 단일 패널 화면은 14~18 까지 허용.
- 반경: 카드·패널·모달·테이블 컨테이너 **12**, 버튼·배지·칩·입력 **10**, 리스트 행 **8**, 프로그레스 바 **6**.
- 그림자: 목적별 5종만 사용.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `shadow.card` | `0 4px 6px -1px rgba(0,0,0,.05)` | 좌측 정보 카드 |
| `shadow.raised` | `0 6px 18px rgba(15,23,42,.05)` | 리스트·로그 패널 |
| `shadow.panel` | `0 8px 24px rgba(15,23,42,.06)` | 메인 영역 대형 패널 |
| `shadow.popover` | `0 10px 24px rgba(15,23,42,.12)` | 팝오버, 오버레이 위 칩 |
| `shadow.modal` | `0 25px 50px -12px rgba(0,0,0,.25)` | 모달 |

### 2-5. 컨트롤 높이 · 모션 · 레이어

- 높이: 카드 헤더 내부 버튼 **32**, 아이콘 단독 버튼 **34**, 페이지 헤더 주요 컨트롤 **44**.
- 모션: hover `160ms ease`, 활성 상태 전환 `150ms ease`, 값 변화 `220ms ease`, 페이지 진입 `0.8s cubic-bezier(.4,0,.2,1)`.
  - hover 이동은 `translateY(-1px)` 또는 `translateX(2px)` 까지만. 확대·회전 hover 금지.
  - 애니메이션 라이브러리는 **framer-motion** 으로 통일한다. 오버레이는 `AnimatePresence` 로 감싼다.
- z-index: `stickyHead(1)` → `popover(100)` → `modalBackdrop(2000)` → `modal(2001)` → `fullscreen(5000)`. **숫자를 직접 쓰지 말고 토큰에 등록한다.**
- 데이터 그리드 내부의 스티키 셀은 전역 z-index 와 분리된 `gridLayer` 를 쓴다:
  `cell(1)` → `stickyColumn(2)` → `stickyRow(3)` → `corner(4)`. 행·열이 동시에 고정되는 모서리 셀이 가장 위다.

---

## 3. 레이아웃 패턴

### 3-1. 관제 대시보드 (다중 컬럼) — 기준 화면 루트

`100vh` 고정, 페이지 스크롤 없음. 스크롤은 항상 카드 **내부**에서만 발생한다.

```
┌──────────────────────────────────────────────────────────────┐
│ padding 12 · background #f8fafc · gap 12                     │
│ ┌──────────┐ ┌────────────┐ ┌──────────────────────────────┐ │
│ │ 요약 카드 │ │ 목록 패널   │ │ 메인 작업 영역               │ │
│ │ (고정폭) │ │ (고정폭)    │ │ (minmax(0, 1fr))             │ │
│ │ ──────── │ │            │ │  헤더 + 본문                  │ │
│ │ 리스트    │ │            │ │                              │ │
│ └──────────┘ └────────────┘ └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

```tsx
const Shell = styled.div`
  width: 100%;
  height: 100vh;
  padding: 12px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns:
    clamp(280px, 17vw, 320px)
    clamp(320px, 20vw, 380px)
    minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
  background: ${color.pageBg};

  @media (max-width: 1200px) {
    grid-template-columns: 260px 290px minmax(0, 1fr);
  }
`;
```

**필수 규칙**

- 고정 컬럼은 `clamp()` 로, 가변 컬럼은 반드시 `minmax(0, 1fr)` 로 잡는다. `1fr` 단독은 자식 오버플로를 유발한다.
- 스크롤을 가진 flex 자식에는 예외 없이 `min-height: 0`(가로는 `min-width: 0`)을 준다.
- 컬럼 컨테이너는 `display:flex; flex-direction:column; gap:12px; height:100%; min-height:0; overflow:hidden`.

### 3-2. 지표 + 필터 + 데이터 그리드 (단일 컬럼) — 기준 화면의 `/status`

```
grid-template-rows: auto auto minmax(0, 1fr);
gap: 14px;

[1] Header      : 타이틀 아이콘 + eyebrow/제목/기간 + 우측 컨트롤군
[2] StatsGrid   : repeat(4, minmax(0,1fr)) 지표 카드
[3] Workspace   : grid-template-columns: 340px minmax(0,1fr)
                  ├ InsightPanel (진행률/요약)
                  └ DetailPanel  (검색 + 데이터 그리드)
```

### 3-3. 반응형

- 기본 타깃은 **관제실 대형 모니터(1920px 이상)**. 모바일 대응은 요구사항에 없으면 하지 않는다.
- 브레이크포인트는 `1500px`, `1200px`, `760px` 만 사용한다.
- `1500px` 이하: 좌우 배치를 단일 컬럼으로 접고 보조 패널에 `max-height` 를 준다.
- `1200px` 이하: 고정 컬럼 폭을 축소한다.

---

## 4. 데이터 상태 3종 (필수)

모든 데이터 영역은 **로딩 / 오류 / 비어있음** 세 상태를 반드시 구현한다. 하나라도 빠지면 미완성으로 본다.

| 상태 | 표현 | 아이콘 |
| --- | --- | --- |
| 로딩 | 카드 내부 중앙 정렬 스피너 + `데이터 조회 중...` | `Loader2` + 회전 애니메이션 |
| 오류 | 아이콘 + 한 줄 안내 + **재시도 버튼** | `FileWarning` / `AlertCircle` / `TriangleAlert` |
| 비어있음 | 점선 테두리 박스 + 아이콘 원 + 제목 + 안내 한 줄 | `Search` / `PackageCheck` 등 도메인 아이콘 |

```tsx
{isLoading ? (
  <StateBox><Loader2 className="spin" size={28} /><span>데이터 조회 중...</span></StateBox>
) : error ? (
  <StateBox $tone="danger">
    <FileWarning size={28} />
    <span>데이터를 불러오지 못했습니다.</span>
    <RetryButton onClick={onRetry}>재시도</RetryButton>
  </StateBox>
) : items.length ? (
  items.map(renderItem)
) : (
  <StateBox $muted>항목이 없습니다.</StateBox>
)}
```

- Empty 박스: `background #f8fafc`, `border: 1px dashed #cbd5e1`, `border-radius: 12px`, `min-height: 160~200px`.
- 오류 텍스트는 API 원문을 그대로 노출하지 않고 사용자용 한국어 문장으로 바꾼다. 원문은 `console.error` 로만 남긴다.
- API 실패 시 화면이 비지 않게 `data/dummy-*.ts` 폴백을 쓰는 화면은, 더미 사용 중임이 로그로 남게 한다.

---

## 5. 공통 컴포넌트 레시피

### 5-1. 카드

```tsx
const Card = styled.section`
  padding: 14px;
  background: ${color.surface};
  border: 1px solid ${color.borderSoft};
  border-radius: 12px;
  box-shadow: ${shadow.card};
  display: flex;
  flex-direction: column;
  min-height: 0;
`;
```

카드 헤더는 `제목 + 카운트 칩` 을 좌측에, 액션을 우측에 둔다.

```tsx
<CardHead>
  <div className="title-group">
    <h2>입고 대기 리스트</h2>
    <span className="count">총 {list.length}건</span>
  </div>
  <TextButton onClick={onOpenList}>전체보기 &gt;</TextButton>
</CardHead>
```

- 카운트 칩: `padding: 3px 9px; border-radius: 10px; background: brandSoft; color: brand; font-size: .78rem; font-weight: 600;`

### 5-2. 페이지 헤더 (지표형 화면)

```tsx
<Header>
  <TitleGroup>
    <TitleIcon><ClipboardList size={24} /></TitleIcon>   {/* 48x48, radius 12, brand 배경, 흰 아이콘 */}
    <div>
      <span>Material Inspection</span>                    {/* eyebrow — 영문 대문자 */}
      <h1>입고 검수 현황 대시보드</h1>
      <p>{rangeLabel}</p>                                 {/* 현재 조회 조건 요약 */}
    </div>
  </TitleGroup>
  <HeaderActions>{/* 세그먼트 → 날짜 → 새로고침 순서 */}</HeaderActions>
</Header>
```

헤더는 `min-height: 82px`, `padding: 17px 20px`, `border-radius: 12px`, 흰 표면 + `shadow.panel`.

### 5-3. 버튼

| 종류 | 스펙 |
| --- | --- |
| Primary (브랜드) | `background: brand; color:#fff; height:44px; padding:0 15px; radius:10~12; font-weight:600` / hover `brandStrong` |
| Dark (중립 강조) | `background:#0f172a; color:#fff` / hover `brand` |
| Soft (기본) | `background: surface; border:1px solid border; color: ink2; height:32px; padding:0 12px; radius:10` / hover `border: borderStrong; background: surfaceSubtle` |
| Icon | `32~34px` 정사각, `border:1px solid #e2e8f0`, radius 10, 아이콘 `#64748b` → hover `#0f172a` |
| Text | 테두리·배경 없음, `color:#64748b`, `font-size:.84rem`, 라벨 끝에 `>` |

공통: `cursor: pointer`, `transition: 160ms ease`, `:disabled { opacity:.58; cursor: wait }`, 아이콘 크기 `14~17px`(lucide-react), 아이콘–텍스트 간격 `6~8px`.

### 5-4. 배지 / 상태 칩

```tsx
const StatusBadge = styled.span<{ $tone: ToneName }>`
  min-width: 76px;
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: .72rem;
  font-weight: 600;
  background: ${({ $tone }) => tone[$tone].bg};
  color: ${({ $tone }) => tone[$tone].fg};
  border: 1px solid ${({ $tone }) => tone[$tone].border};
`;
```

상태값 한글 표기는 **검수완료 / 태블릿검수 / 대기 / 미검수 / 해당없음** 으로 통일한다.

### 5-5. 세그먼트 컨트롤 (기간·필터 전환)

트랙 `background:#f9fafb; border:1px solid #e5e7eb; radius:12; padding:4px; height:44px`, 버튼 `height:34px; radius:10`.
활성 = `background: brand; color:#fff`, 비활성 hover = `background: brandSoft; color: brand`.

### 5-6. 검색 입력

```
height: 42px; width: 310px; padding: 0 12px; radius: 12;
border: 1px solid #cfd6e2; background: #f9fafb;
아이콘(Search 16~17px, #94a3b8) → input(테두리 없음, 투명 배경, .88rem)
placeholder: #94a3b8
```

### 5-6-1. 셀렉트 (네이티브 `<select>` 사용 금지)

네이티브 `<select>` 는 OS·브라우저마다 목록 모양이 달라 가이드를 지킬 수 없다.
**모든 선택 입력은 공용 커스텀 셀렉트**([components/common/select/SelectField.tsx](../../components/common/select/SelectField.tsx))를 사용한다.

```
트리거: height 42; padding 0 10px 0 12px; radius 10; border 1px border;
        background surfaceSubtle → hover surface + borderStrong
        열림 상태: border brand, chevron 180도 회전 + brand 색
목록  : radius 12; padding 6; max-height 292px; overflow-y auto; shadow.popover
        min-width 100% (트리거 폭 이상), 화면 아래 공간이 부족하면 위로 펼친다
항목  : min-height 34; radius 8; 선택된 항목은 배경 brandSoft + 글자 brand +
        사방 1px brand 테두리 + 체크 아이콘 / 키보드 활성 항목은 배경 fill
```

**필수 동작**

- 마우스: 트리거 클릭으로 열고 닫기, 항목 클릭으로 선택, 바깥 클릭으로 닫기.
- 키보드: `Enter`·`Space`·`↑`·`↓` 로 열기, `↑`·`↓` 이동, `Home`·`End` 양 끝 이동,
  `Enter`·`Space` 선택, `Esc` 닫기(전파를 막아 상위 오버레이는 닫지 않는다), `Tab` 이탈 시 닫기.
- 접근성: 트리거에 `aria-haspopup="listbox"` + `aria-expanded`, 목록에 `role="listbox"`,
  항목에 `role="option"` + `aria-selected`.
- 옵션은 문자열 배열과 `{ value, label }` 배열을 모두 받는다.

### 5-7. 데이터 그리드 (CSS Grid 기반 — `<table>` 보다 우선)

```tsx
const gridColumns = '1.15fr 1.05fr 1.25fr 0.8fr 0.72fr 0.82fr 1fr';

const GridWrap = styled.div`
  flex: 1; min-height: 0; overflow: hidden;
  border: 1px solid ${color.border};
  border-radius: 12px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
`;
const GridHead = styled.div`
  min-height: 52px; padding: 0 16px; gap: 12px;
  display: grid; grid-template-columns: ${gridColumns}; align-items: center;
  background: ${color.surfaceSubtle};
  border-bottom: 1px solid ${color.border};
  span { color: ${color.ink3}; font-size: .76rem; font-weight: 600; }
`;
const GridRow = styled.div`
  min-height: 64px; padding: 0 16px; gap: 12px;
  display: grid; grid-template-columns: ${gridColumns}; align-items: center;
  border-bottom: 1px solid ${color.divider};
  &:nth-child(even) { background: ${color.surfaceZebra}; }
  &:hover { background: ${color.brandSoft}; }
  > * { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;
```

- 헤더 컬럼 정의와 행 컬럼 정의는 **같은 상수**를 공유한다. 값을 두 번 쓰지 않는다.
- 헤더는 `position: sticky; top: 0`, 좌측 식별 컬럼은 `position: sticky; left: <누적 오프셋>` 으로 고정한다. 레이어는 `gridLayer` 토큰을 쓴다.
- 헤더가 여러 행(월 그룹 / 일자 / 요일)일 때는 각 행의 `top` 을 위 행들의 높이 합으로 지정하고, 그룹 병합은 `grid-column: span N` 으로 처리한다.
- 구현 참고: [components/production-plan/PlanPreviewGrid.tsx](../../components/production-plan/PlanPreviewGrid.tsx)
- 스크롤은 body 영역만. 컬럼이 많아 폭이 부족하면 `min-width` 를 주고 가로 스크롤을 허용한다.
- 행이 적어도 그리드 영역이 세로로 비지 않게 한다. 스크롤 래퍼에 `height: 100%` 를 주고(`min-height` 는
  컨테이너가 내용 높이까지 늘어나 효과가 없다), 본문 행 트랙을 `minmax(<최소>, <최대>)` 로 두면
  남는 높이만큼 행이 늘어난다. 최대값은 행이 적을 때 과도하게 벌어지지 않게 상한으로 쓴다.
  (기준값: 최소 34px / 최대 72px — 15행이 1440p 높이까지 여백 없이 채워진다.)
- 숫자 컬럼은 우측 정렬 + `toLocaleString('ko-KR')`.

### 5-8. 지표 카드 (Metric)

```
min-height: 150px; padding: 20px; radius: 12; background:#fff;
border: 1px solid <tone.border>;  box-shadow: 0 12px 30px rgba(15,23,42,.075);
상단: 아이콘(brand, 22px) + 라벨(.95rem / 600)
중앙: 대표 수치 (3rem / 600 / <tone.fg> / line-height 1)
하단: 보조 설명 (.88rem / 500 / ink2)
```

4개 그리드(`repeat(4, minmax(0,1fr))`, gap 14)가 기본. 톤 순서는 **danger/brand(전체) → success(완료) → info(진행) → warning(대기)**.

### 5-9. 프로그레스

트랙 `height: 8~18px; background:#f1f5f9; border-radius: 6~9px; overflow: hidden`,
채움 `background: <tone.fg>`(기본 `brand`), `transition: width 220ms ease` 또는 framer-motion `animate={{ width: '<n>%' }}`.
퍼센트 수치는 트랙 위 우측에 `1.1rem / 600 / brand`, 괄호로 `(완료/전체)` 를 `.85rem / ink2` 로 덧붙인다.

### 5-10. 모달 / 오버레이

```tsx
<Backdrop initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
{/* rgba(0,0,0,.4) + blur(4px), z 2000 */}
<Container>
  {/* 흰 표면, radius 12, shadow.modal, z 2001 */}
  <ModalHeader><h2>제목</h2><CloseButton aria-label="닫기"><X size={18} /></CloseButton></ModalHeader>
  <ControlBar>{/* 검색 + 필터 */}</ControlBar>
  <Body>{/* 그리드 */}</Body>
</Container>
```

- 크기: `width: 95%; max-width: 1400px; height: 80vh; padding: 20px`.
- 닫기 버튼: `34px` 정사각, `background:#f1f5f9; color:#64748b; radius:10`.
- 열려 있는 동안 `document.body.style.overflow = 'hidden'` 으로 배경 스크롤을 잠그고, 언마운트 시 이전 값으로 복원한다.
- `AnimatePresence` 로 감싸 exit 애니메이션을 보장한다.

### 5-11. 스크롤 영역

```
overflow-y: auto;
&::-webkit-scrollbar { width: 6px; }
&::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
```

`scrollbar` 토큰을 그대로 삽입해도 된다. 스크롤 컨테이너 배경은 `#f8fafc` + `border 1px solid #e2e8f0` + `radius 12` + `padding 8~10`.

---

## 6. 아이콘 · 이미지 · 차트

- 아이콘은 **lucide-react 만** 사용한다. `react-icons` 는 신규 코드에서 쓰지 않는다.
- 크기: 인라인 `14~17px`, 카드 헤더 `20~24px`, empty 상태 `28~30px`.
- 색: 기본 `color.ink3`, 강조 `color.brand`, 상태 표시는 해당 `tone.fg`.
- 이미지 자리표시자는 `radius 12; overflow: hidden; object-fit: cover` 를 쓰고, `onError` 로 숨김 처리한다.
- 차트는 **recharts** 를 기본으로 한다(기존 화면과의 일관성이 필요하면 chart.js 유지). 색상은 상태 톤의 `fg` 값을 순서대로 사용하고, 격자선은 `#f1f5f9`, 축 텍스트는 `#64748b / .76rem` 으로 맞춘다.

---

## 7. 상호작용 규칙

| 입력 | 동작 |
| --- | --- |
| `Esc` | 가장 위 오버레이 1개만 닫는다 (전체화면 → 모달 → 보드 순서) |
| `Enter` | 현재 화면 데이터 새로고침 |
| 카드 hover | `translateY(-1px)` 또는 테두리 색 변화까지만 |
| 행 hover | `background: #fff1f5`(또는 `#fafbfc`) |
| 폴링 | 필요한 데이터만 `setInterval`, 기본 `30_000ms`. `useEffect` cleanup 에서 반드시 해제 |
| 새로고침 | 개별 fetch 를 `refreshData` 하나로 묶어 호출 |

접근성

- 아이콘 단독 버튼에는 `aria-label` 필수.
- 팝오버 트리거에는 `aria-haspopup="dialog"` + `aria-expanded`.
- 포커스 링: `outline: 3px solid rgba(211,17,69,.22); outline-offset: 3px`(`focusRing` 토큰). `outline: none` 만 주고 끝내지 않는다.
- 상태를 색만으로 표현하지 않는다. 배지에는 항상 텍스트를 함께 넣는다.

---

## 8. 한국어 문안 규칙

- UI 라벨·상태·버튼은 한국어. eyebrow 만 영문 대문자를 허용한다.
- 숫자: `toLocaleString('ko-KR')`. 단위는 건수 `건`, 수량 `개`(도메인 단위가 있으면 그것), 비율 `%`.
- 날짜 `YYYY-MM-DD`, 시간 `HH:mm:ss`, 기간 `YYYY-MM-DD ~ YYYY-MM-DD`.
- 값 없음은 `-` 로 표기한다(빈 문자열 금지).
- 버튼은 동사형(`새로고침`, `재시도`, `전체보기 >`), 제목은 명사형(`입고 검수 현황 대시보드`).
- 코드 주석은 한국어 한 줄로, **왜** 그렇게 했는지를 남긴다.

---

## 9. 작업 완료 체크리스트

새 페이지·컴포넌트를 만들거나 수정한 뒤 아래를 전부 확인한다.

**구조**

- [ ] `app/**/page.tsx` 는 클라이언트 컴포넌트를 감싸는 래퍼뿐인가
- [ ] 스타일이 `components/<feature>/styles.ts` 또는 파일 하단 `styled` 블록에 모여 있는가
- [ ] 데이터 조회가 `hooks/use-*.ts` 로 분리되어 있고 `isLoading` / `error` / `retry` 를 노출하는가
- [ ] 타입·유틸·상수가 폴더 규칙에 맞게 분리되어 있는가

**토큰**

- [ ] 새로 도입한 hex 색상이 0개인가 (`design-tokens.ts` 밖의 값 금지)
- [ ] 반경이 12 / 10 / 8 / 6 중 하나인가
- [ ] 그림자가 정의된 5종 중 하나인가
- [ ] 폰트 웨이트가 400 / 500 / 600 뿐인가
- [ ] z-index 를 직접 숫자로 쓰지 않고 토큰에 등록했는가

**레이아웃**

- [ ] 페이지가 `100vh` 안에서 끝나고 body 스크롤이 없는가
- [ ] 가변 그리드 컬럼이 `minmax(0, 1fr)` 인가
- [ ] 스크롤을 가진 flex 자식에 `min-height: 0` 이 있는가
- [ ] 1920px / 1500px / 1200px 에서 깨지지 않는가

**상태·상호작용**

- [ ] 로딩 / 오류 / 비어있음 3종이 모두 구현되어 있는가
- [ ] 오류 상태에 재시도 경로가 있는가
- [ ] `setInterval` / 이벤트 리스너가 cleanup 에서 해제되는가
- [ ] 오버레이가 `Esc` 로 닫히고 배경 스크롤이 잠기는가
- [ ] 아이콘 버튼에 `aria-label` 이 있는가

**문안**

- [ ] 한국어 라벨, `ko-KR` 숫자 포맷, `-` 빈값 표기를 지켰는가

**검증**

- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run lint` 통과
- [ ] [logs/README.md](../../logs/README.md) 규칙에 따라 작업 로그를 남겼는가

---

## 10. 알려진 예외와 이관 대상

이 가이드는 **신규 코드에 즉시 적용**된다. 아래는 기존 코드의 알려진 편차이며, 해당 파일을 손댈 때 함께 정리한다. 다른 파일까지 일괄 리팩터링하지는 않는다.

| 위치 | 편차 | 처리 |
| --- | --- | --- |
| `styles/styles.ts` | `Card` radius 8, 이중 그림자, `CardTitle` weight 800 | 신규 화면은 이 primitive 대신 5-1 레시피 사용. 부득이 쓰면 radius/shadow/weight 를 덮어쓴다 |
| `styles/*.styles.ts` (검사 화면 5종) | 화면별 자체 테마 파일 | 유지. 신규 화면에서는 참조하지 않는다 |
| `components/material-monitoring/MaterialMonitoringClient.tsx` | 폰트 스코프에 `!important` 사용 | 신규 화면은 `inherit` 만 사용 |
| 일부 화면 | `react-icons` 사용 | 신규 화면은 lucide-react 만 사용 |
| `components/material-monitoring/VehicleEntryExitCard.tsx:127` | 좌측 인셋 바(`inset 3px 0`)로 미지정 업체 행 강조 — 2-2 에서 금지한 패턴 | 해당 파일 수정 시 옅은 톤 배경 + 사방 테두리로 교체 |

---

## 11. 변경 이력

| 날짜 (KST) | 버전 | 내용 |
| --- | --- | --- |
| 2026-08-19 | v1 | `/material/inbound-inspection` 기준으로 최초 제정. 화면별 임의 스타일 규칙 폐기, `styles/design-tokens.ts` 신설 |
| 2026-08-19 | v1.1 | 생산계획 화면 구현 중 확정: `color.surfaceZebra`·`gridLayer` 토큰 추가, 피벗 그리드(월 그룹 헤더 + 좌측 고정 컬럼) 규칙 명시, Soft 버튼 색을 토큰 참조로 교체, `utils/<feature>-api.ts` 폴더 규칙 추가 |
| 2026-08-20 | v1.2 | 데이터 그리드 세로 채움 규칙 추가. **한쪽 변만 강조하는 패턴(좌측 인셋 바 등)을 금지**하고, 기존 v1 의 인셋 바 권장 문구를 철회. 강조는 옅은 톤 배경 + 사방 테두리로 통일 |
| 2026-08-20 | v1.3 | 실험실(개발 진행 중) 화면 규칙 추가(1-3-1). 공용 컴포넌트 위치 `components/common/<component>/` 와 공용 날짜 유틸 `utils/date.ts` 규칙 추가. 일자 선택 팝오버를 생산계획 전용에서 공용으로 승격 |
| 2026-08-20 | v1.4 | 셀렉트 레시피 추가(5-6-1). **네이티브 `<select>` 사용을 금지**하고 공용 커스텀 셀렉트로 통일 |
| 2026-09-09 | v1.5 | 입고 검수 현황의 토큰·rem·weight 600 이관을 완료해 해당 알려진 편차를 제거. 스타일은 `components/material-inbound-status/styles.ts`로 분리 |
