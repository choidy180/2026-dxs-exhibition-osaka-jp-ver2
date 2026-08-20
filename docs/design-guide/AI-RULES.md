# AI 요약 규칙 (Design Guide 압축본)

이 파일은 AI 도구가 짧은 컨텍스트에서 바로 지킬 수 있도록 [README.md](./README.md) 를 압축한 것이다.
**세부 스펙이 필요하거나 이 요약과 충돌하면 [README.md](./README.md) 와 [styles/design-tokens.ts](../../styles/design-tokens.ts) 가 기준이다.**

## 절대 규칙 (Non-negotiable)

1. UI 를 만들거나 수정하기 전에 `docs/design-guide/README.md` 를 읽는다.
2. 색상·반경·여백·그림자·z-index 는 `styles/design-tokens.ts` 에서 import 한다. **새 hex 를 만들지 않는다.**
3. 스타일링은 **styled-components** 로만 한다. Tailwind 유틸리티 클래스로 새 UI 를 만들지 않는다.
4. 아이콘은 **lucide-react** 만 쓴다. 애니메이션은 **framer-motion** 만 쓴다.
5. 모든 데이터 영역에 **로딩 / 오류(재시도 버튼 포함) / 비어있음** 3종 상태를 구현한다.
6. `app/**/page.tsx` 는 클라이언트 컴포넌트를 감싸는 래퍼만 둔다. 로직·스타일은 `components/<feature>/` 에 둔다.
7. UI 문안은 한국어, 숫자는 `toLocaleString('ko-KR')`, 값 없음은 `-`.
8. 작업 후 `logs/README.md` 규칙대로 작업 로그를 남긴다.

## 토큰 치트시트

```
배경 #f8fafc · 표면 #ffffff · 채움 #f1f5f9 · 그리드 짝수행 #fbfcfe
테두리 #e2e8f0 (기본) / #edf2f7 (카드) / #cbd5e1 (강조)
텍스트 #0f172a → #334155 → #64748b → #94a3b8
브랜드 #D31145 (accent 전용, hover #be123c, 배경 #FFF0F3)
상태  success #047857/#ecfdf5/#a7f3d0 · warning #b45309/#fffbeb/#fde68a
      info #2563eb/#eef4ff/#b9ccff · danger #b91c1c/#fee2e2/#fecaca
      neutral #64748b/#f1f5f9/#e2e8f0
폰트  Pretendard · weight 400/500/600 만 · 1.15 / 1.05 / 1 / .88 / .85 / .78 / .76 / .72 rem
반경  카드 12 · 컨트롤 10 · 행 8 · 바 6
여백  4 6 8 10 12 14 16 20 (페이지 패딩·gap 기본 12)
높이  버튼 32 · 아이콘 34 · 헤더 컨트롤 44
그림자 card 0 4px 6px -1px rgba(0,0,0,.05) · raised 0 6px 18px rgba(15,23,42,.05)
      panel 0 8px 24px rgba(15,23,42,.06) · popover 0 10px 24px rgba(15,23,42,.12)
      modal 0 25px 50px -12px rgba(0,0,0,.25)
모션  hover 160ms · 상태 150ms · 값 220ms ease
z     sticky 1 · popover 100 · backdrop 2000 · modal 2001 · fullscreen 5000
그리드 z  gridLayer: cell 1 · stickyColumn 2 · stickyRow 3 · corner 4
```

## 레이아웃 규칙

- 페이지는 `height: 100vh` + `overflow: hidden`. body 스크롤 금지, 스크롤은 카드 내부에서만.
- 가변 그리드 컬럼은 반드시 `minmax(0, 1fr)`. 고정 컬럼은 `clamp()`.
- 스크롤을 가진 flex 자식에는 항상 `min-height: 0`.
- 브레이크포인트는 1500 / 1200 / 760px 만. 기본 타깃은 1920px 이상 관제 모니터.
- 페이지 루트에 폰트 스코프(`font-family` + `*{font-family: inherit}`)를 둔다.

## 금지 목록

그라디언트 배경 · 다크 표면 배경 · weight 700 이상 · 새 hex 색상 · Tailwind 클래스로 신규 UI ·
react-icons · 확대/회전 hover · 색만으로 상태 표시 · `outline: none` 만 주고 포커스 링 미제공 ·
로딩/오류/빈 상태 누락 · cleanup 없는 `setInterval` ·
**한쪽 변만 강조하는 패턴** (`box-shadow: inset 3px 0 …`, 굵은 `border-left`, 한쪽 변만 다른 색) ·
**네이티브 `<select>`** (공용 커스텀 셀렉트 `components/common/select/SelectField.tsx` 사용)

선택·강조는 예외 없이 **옅은 톤 배경 + 사방 1px 테두리**로만 표현한다. 필요하면 상태 배지를 덧붙인다.

## 참고 구현체

- 다중 컬럼 관제 대시보드: `components/material-monitoring/MaterialMonitoringClient.tsx`
- 지표 + 필터 + 데이터 그리드: `components/material-inbound-status/InboundInspectionStatusClient.tsx`
- 지표 + 사이드 카드 + 피벗 그리드, 목업/API 전환 구조: `components/production-plan/`
  (엑셀 업로드·파싱, 리비전 확정, sticky 피벗 그리드의 기준 구현)
- 필터 바 + 대용량 목록/피벗 그리드, 개발 진행 중(실험실) 화면: `components/lab/`
- 공용 컴포넌트는 `components/common/<component>/`, 공용 날짜 유틸은 `utils/date.ts`
- 데이터가 연결되지 않은 신규 화면은 `app/lab/**` 아래에 두고 상단에 개발 진행 중 안내 배너를 넣는다
