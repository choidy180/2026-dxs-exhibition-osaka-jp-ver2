/**
 * DXS 공통 디자인 토큰 (Single Source of Truth)
 *
 * 기준 화면: /material/inbound-inspection (자재 입고 검수 관제 대시보드)
 * 문서: docs/design-guide/README.md
 *
 * 새로 만드는 페이지·컴포넌트는 색상/반경/여백/그림자를 직접 하드코딩하지 말고
 * 이 파일의 토큰을 import 해서 사용한다.
 */

/** 색상 — Slate 계열 중립색 + 브랜드 레드(#D31145) */
export const color = {
  /** 페이지 배경 */
  pageBg: '#f8fafc',
  /** 카드·패널 표면 */
  surface: '#ffffff',
  /** 카드 안쪽 보조 표면(스테이지, 스크롤 영역, 테이블 헤더) */
  surfaceSubtle: '#f8fafc',
  /** 칩·세그먼트 트랙 등 채움 배경 */
  fill: '#f1f5f9',
  /** 데이터 그리드 짝수 행 (zebra) */
  surfaceZebra: '#fbfcfe',

  /** 카드 외곽선(기본) */
  border: '#e2e8f0',
  /** 카드 외곽선(연함 — 대시보드 카드 기본값) */
  borderSoft: '#edf2f7',
  /** 강조 외곽선·hover 테두리 */
  borderStrong: '#cbd5e1',
  /** 행 구분선 */
  divider: '#f1f5f9',

  /** 본문 최상위 텍스트(제목, 핵심 수치) */
  ink: '#0f172a',
  /** 본문 텍스트 */
  ink2: '#334155',
  /** 라벨·보조 텍스트 */
  ink3: '#64748b',
  /** 비활성·플레이스홀더 */
  ink4: '#94a3b8',

  /** 브랜드 accent */
  brand: '#D31145',
  brandStrong: '#be123c',
  brandSoft: '#FFF0F3',
  brandBorder: '#f6b3c4',

  /** 실시간 표시 dot */
  live: '#10b981',
  idle: '#cbd5e1',
} as const;

/** 상태 톤 — 배지/칩/지표 카드는 반드시 이 4종 + neutral 안에서 고른다 */
export const tone = {
  success: { fg: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  warning: { fg: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  info: { fg: '#2563eb', bg: '#eef4ff', border: '#b9ccff' },
  danger: { fg: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  neutral: { fg: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
} as const;

export type ToneName = keyof typeof tone;

/** 폰트 — Pretendard 고정. 페이지 루트에서 스코프로 강제한다. */
export const font = {
  family: `'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, -apple-system, sans-serif`,
  /** 수치 표기 보조 폰트(가동률·택트타임 등 숫자 강조 전용) */
  numeric: `'Rajdhani', 'Pretendard', sans-serif`,
  mono: `'SFMono-Regular', Consolas, monospace`,
} as const;

/** 타이포 스케일 (rem) */
export const fontSize = {
  pageTitle: '1.15rem',
  cardTitle: '1.05rem',
  sectionTitle: '1rem',
  body: '0.88rem',
  bodySm: '0.85rem',
  meta: '0.78rem',
  micro: '0.76rem',
  caption: '0.72rem',
  /** 지표 카드 대표 수치 */
  metric: '3rem',
} as const;

/** 폰트 웨이트 — 400/500/600만 사용. 700+ 는 신규 화면에서 쓰지 않는다. */
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
} as const;

/** 여백 — 4의 배수 + 6/10/14 허용 */
export const space = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  xxxl: 16,
  huge: 20,
} as const;

/** 모서리 반경 */
export const radius = {
  /** 카드·패널·모달·테이블 컨테이너 */
  card: 12,
  /** 버튼·배지·칩·입력 */
  control: 10,
  /** 리스트 행 등 밀집 요소 */
  row: 8,
  /** 프로그레스 바 */
  bar: 6,
  pill: 999,
} as const;

/** 그림자 */
export const shadow = {
  /** 좌측 정보 카드 */
  card: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  /** 리스트·로그 패널 */
  raised: '0 6px 18px rgba(15, 23, 42, 0.05)',
  /** 메인 영역 대형 패널 */
  panel: '0 8px 24px rgba(15, 23, 42, 0.06)',
  /** 팝오버·오버레이 칩 */
  popover: '0 10px 24px rgba(15, 23, 42, 0.12)',
  /** 모달 */
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

/** 컨트롤 높이 */
export const controlHeight = {
  /** 카드 헤더 안쪽 소형 버튼 */
  sm: 32,
  /** 아이콘 단독 버튼 */
  md: 34,
  /** 페이지 헤더 주요 컨트롤 */
  lg: 44,
} as const;

/** 모션 */
export const motion = {
  /** hover·색상 전환 */
  hover: '160ms ease',
  /** 활성 상태 전환 */
  state: '150ms ease',
  /** 값 변화(프로그레스 등) */
  value: '220ms ease',
  /** 진입 애니메이션 */
  enter: '0.8s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/** z-index — 새 레이어는 반드시 여기에 등록하고 숫자를 직접 쓰지 않는다 */
export const zIndex = {
  stickyHead: 1,
  popover: 100,
  modalBackdrop: 2000,
  modal: 2001,
  fullscreen: 5000,
} as const;

/**
 * 데이터 그리드 내부 스티키 셀 전용 레이어.
 * 스크롤 컨테이너 안에서만 겹치므로 전역 zIndex 와 별도로 관리한다.
 * 일반 셀 → 좌측 고정 셀 → 상/하단 고정 헤더 → 두 방향이 겹치는 모서리 셀 순으로 쌓인다.
 */
export const gridLayer = {
  cell: 1,
  stickyColumn: 2,
  stickyRow: 3,
  corner: 4,
} as const;

/** 포커스 링 — 키보드 접근성 필수 */
export const focusRing = `3px solid rgba(211, 17, 69, 0.22)`;

/** 커스텀 스크롤바 CSS 조각 */
export const scrollbar = `
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
`;

export const tokens = {
  color,
  tone,
  font,
  fontSize,
  fontWeight,
  space,
  radius,
  shadow,
  controlHeight,
  motion,
  zIndex,
  gridLayer,
  focusRing,
  scrollbar,
} as const;

export default tokens;
