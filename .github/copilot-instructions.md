# GitHub Copilot / VS Code AI 지침

이 저장소는 Next.js 16 + React 19 + TypeScript + styled-components 기반의 스마트팩토리 관제 대시보드다.

## 1. 디자인 가이드 준수 (필수)

UI 코드를 제안하거나 수정하기 전에 다음 파일을 읽고 그대로 따른다.

- 전체 가이드: [docs/design-guide/README.md](../docs/design-guide/README.md)
- 압축 규칙: [docs/design-guide/AI-RULES.md](../docs/design-guide/AI-RULES.md)
- 코드 토큰: [styles/design-tokens.ts](../styles/design-tokens.ts)
- 기준 화면: `/material/inbound-inspection`

핵심 규칙:

1. 색상·반경·여백·그림자·z-index 는 `styles/design-tokens.ts` 에서 import 한다. 새 hex 색상을 만들지 않는다.
2. 스타일링은 styled-components 로만 한다. Tailwind 유틸리티 클래스로 신규 UI 를 만들지 않는다.
3. 아이콘은 lucide-react, 애니메이션은 framer-motion 만 사용한다.
4. 모든 데이터 영역에 로딩 / 오류(재시도 버튼 포함) / 비어있음 3종 상태를 구현한다.
5. `app/**/page.tsx` 는 클라이언트 컴포넌트를 감싸는 래퍼만 둔다. 로직·스타일은 `components/<feature>/` 에 둔다.
6. 페이지는 `height: 100vh` + `overflow: hidden`. 가변 그리드 컬럼은 `minmax(0, 1fr)`, 스크롤 flex 자식에는 `min-height: 0`.
7. 폰트는 Pretendard, weight 는 400/500/600 만. 반경은 카드 12 / 컨트롤 10 / 행 8 / 바 6. 페이지 패딩과 gap 은 12.
8. 브랜드 `#D31145` 는 accent 전용. 중립색은 slate 계열(`#f8fafc`, `#0f172a`, `#64748b`, `#e2e8f0`).
   선택·강조는 옅은 톤 배경 + 사방 1px 테두리로만 표현한다.
   **한쪽 변만 강조하는 패턴(`box-shadow: inset 3px 0 …`, 굵은 `border-left`, 한쪽 변만 다른 색)은 절대 사용하지 않는다.**
9. UI 문안은 한국어. 숫자는 `toLocaleString('ko-KR')`, 값 없음은 `-`.

## 2. 작업 로그 (필수)

작업을 끝내기 전에 [logs/README.md](../logs/README.md) 규칙에 따라 `logs/YYYY-MM-DD.md`(Asia/Seoul 기준)에
통합 항목 하나를 추가한다. 코드 변경이 없어도 기록한다.

## 3. 검증

변경 후 `npx tsc --noEmit` 과 `npm run lint` 를 통과시킨다.
