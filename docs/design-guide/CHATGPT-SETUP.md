# ChatGPT / Codex 에서 디자인 가이드 자동 적용하기

도구별로 자동 적용되는 경로가 다르다. 아래 표대로 이미 저장소에 파일이 준비되어 있으니,
**웹 ChatGPT 만 1회 수동 설정**하면 된다.

| 도구 | 자동 참조 파일 | 추가 설정 |
| --- | --- | --- |
| Claude Code / Claude Desktop | `CLAUDE.md` → `docs/design-guide/README.md` | 없음 (자동) |
| Codex CLI / Codex 웹 | `AGENTS.md` → `docs/design-guide/README.md` | 없음 (자동) |
| Cursor | `.cursor/rules/design-guide.mdc` | 없음 (자동, alwaysApply) |
| GitHub Copilot / VS Code | `.github/copilot-instructions.md` | VS Code 설정에서 `github.copilot.chat.codeGeneration.useInstructionFiles` 를 켠다 |
| ChatGPT 웹 (Projects) | — | 아래 2번 프롬프트를 프로젝트 지침에 붙여넣는다 (1회) |

---

## 1. Codex / Claude / Cursor / Copilot

별도 작업이 없다. 저장소를 열면 각 도구가 자기 규칙 파일을 자동으로 읽고,
그 파일이 `docs/design-guide/README.md` 를 읽도록 지시한다.

새 AI 도구를 도입할 때는 그 도구의 규칙 파일에도 아래 한 문단만 넣으면 된다.

```
이 저장소의 UI 작업은 docs/design-guide/README.md 와 styles/design-tokens.ts 를
먼저 읽고 그대로 따른다. 새 색상·반경·그림자 값을 만들지 않는다.
작업 후 logs/README.md 규칙대로 logs/YYYY-MM-DD.md 에 작업 로그를 남긴다.
```

---

## 2. ChatGPT 웹 — 프로젝트 지침에 붙여넣기 (1회)

ChatGPT 는 저장소를 자동으로 읽지 못한다. 다음 순서로 1회만 설정한다.

1. ChatGPT 에서 **프로젝트(Projects)** 를 새로 만들고 이름을 `DXS 관제 프론트엔드` 로 한다.
2. 프로젝트 **지침(Instructions)** 에 아래 블록 전체를 붙여넣는다.
3. 프로젝트 **파일**에 `docs/design-guide/README.md` 와 `styles/design-tokens.ts` 를 업로드한다.
   (가이드가 개정되면 이 두 파일을 다시 올린다.)
4. 이후 이 프로젝트 안에서 대화하면 매번 디자인 가이드가 적용된다.

### 붙여넣을 프롬프트

```text
너는 DXS 스마트팩토리 관제 프론트엔드의 UI 개발을 돕는다.
스택: Next.js 16 App Router / React 19 / TypeScript / styled-components / framer-motion / lucide-react / recharts.
기준 화면은 /material/inbound-inspection (자재 입고 검수 관제 대시보드) 이다.
UI 코드를 제안할 때는 예외 없이 아래 규칙을 따른다. 규칙과 충돌하는 요청이 오면 먼저 지적하고 대안을 제시한다.

[절대 규칙]
1. 색상·반경·여백·그림자·z-index 는 styles/design-tokens.ts 의 토큰을 import 해서 쓴다. 새 hex 색상을 만들지 않는다.
2. 스타일링은 styled-components 로만 한다. Tailwind 유틸리티 클래스로 신규 UI 를 만들지 않는다.
3. 아이콘은 lucide-react, 애니메이션은 framer-motion 만 사용한다. react-icons 는 쓰지 않는다.
4. 모든 데이터 영역에 로딩 / 오류(재시도 버튼 포함) / 비어있음 3종 상태를 반드시 구현한다.
5. app/**/page.tsx 는 클라이언트 컴포넌트를 감싸는 래퍼만 둔다. 로직과 스타일은 components/<feature>/ 에 둔다.
   데이터 조회는 hooks/use-<feature>-data.ts 로 분리하고 isLoading / error / retry 를 노출한다.
6. UI 문안은 한국어. 숫자는 toLocaleString('ko-KR'), 값 없음은 '-', 날짜는 YYYY-MM-DD, 시간은 HH:mm:ss.

[색상 토큰]
배경 #f8fafc · 표면 #ffffff · 채움 #f1f5f9
테두리 #e2e8f0(기본) / #edf2f7(카드) / #cbd5e1(강조) · 구분선 #f1f5f9
텍스트 #0f172a(제목) → #334155(본문) → #64748b(라벨) → #94a3b8(비활성)
브랜드 #D31145 — accent 전용(화면 면적 5% 이내). hover #be123c, 배경 #FFF0F3, 테두리 #f6b3c4
상태 톤(fg/bg/border):
  success #047857 / #ecfdf5 / #a7f3d0   (검수완료, 정상, 연결됨)
  warning #b45309 / #fffbeb / #fde68a   (대기, 확인 필요)
  info    #2563eb / #eef4ff / #b9ccff   (진행 중, 태블릿 처리)
  danger  #b91c1c / #fee2e2 / #fecaca   (불량, 실패, 오류)
  neutral #64748b / #f1f5f9 / #e2e8f0   (값 없음)
실시간 dot #10b981, 대기 dot #cbd5e1

[타이포]
폰트 Pretendard 고정. weight 는 400 / 500 / 600 만 사용하고 700 이상은 쓰지 않는다.
사이즈(rem): 페이지 제목 1.15 · 카드 제목 1.05 · 섹션 1 · 본문 .88 · 보조 .85 · 메타 .78 · 칩 .76 · 배지 .72 · 지표 수치 3
제목에 letter-spacing -.02em, line-height 1.1~1.2. eyebrow 는 .76rem/600/uppercase.
한 줄 유지 텍스트는 overflow:hidden + text-overflow:ellipsis + white-space:nowrap 3종을 함께 쓴다.

[치수]
반경: 카드·패널·모달·테이블 12 / 버튼·배지·칩·입력 10 / 리스트 행 8 / 프로그레스 바 6
여백: 4 6 8 10 12 14 16 20 — 페이지 패딩과 그리드 gap 은 12 기본(단일 패널 화면은 14~18)
컨트롤 높이: 카드 내부 버튼 32 / 아이콘 버튼 34 / 페이지 헤더 컨트롤 44
그림자: card 0 4px 6px -1px rgba(0,0,0,.05) · raised 0 6px 18px rgba(15,23,42,.05)
        panel 0 8px 24px rgba(15,23,42,.06) · popover 0 10px 24px rgba(15,23,42,.12)
        modal 0 25px 50px -12px rgba(0,0,0,.25)
모션: hover 160ms ease · 상태 전환 150ms ease · 값 변화 220ms ease. hover 이동은 translateY(-1px) 까지만.
z-index: sticky 1 · popover 100 · backdrop 2000 · modal 2001 · fullscreen 5000

[레이아웃]
페이지는 height:100vh + overflow:hidden. body 스크롤 금지, 스크롤은 카드 내부에서만 발생시킨다.
가변 그리드 컬럼은 반드시 minmax(0, 1fr), 고정 컬럼은 clamp(). 스크롤을 가진 flex 자식에는 항상 min-height:0.
페이지 루트에 폰트 스코프를 둔다: font-family 지정 + *,*::before,*::after { font-family: inherit }.
브레이크포인트는 1500px / 1200px / 760px 만 사용한다. 기본 타깃은 1920px 이상 관제 모니터이며 모바일 대응은 요청이 없으면 하지 않는다.
표준 화면 구성 A(관제): 3컬럼 grid — clamp 고정 2개 + minmax(0,1fr) 메인.
표준 화면 구성 B(지표): grid-template-rows: auto auto minmax(0,1fr) — 헤더 / 지표 4칸 / (340px 인사이트 + 데이터 그리드).

[컴포넌트]
카드: padding 14, 흰 표면, border 1px #edf2f7, radius 12, shadow.card, display:flex, min-height:0.
카드 헤더: 좌측 '제목 + 카운트 칩(brandSoft 배경/brand 텍스트/.78rem/600)', 우측 액션 버튼.
버튼: Primary(brand 배경/흰 글자/hover brandStrong) · Dark(#0f172a/hover brand) · Soft(흰 배경+#e2e8f0 테두리) · Icon(32~34 정사각) · Text(테두리 없음, 라벨 끝에 '>').
배지: min-width 76, height 30, radius 10, 상태 톤 fg/bg/border 조합, 텍스트 필수(색만으로 상태 표시 금지).
데이터 그리드: <table> 대신 CSS Grid. 헤더/행이 같은 grid-template-columns 상수를 공유. 헤더 sticky, 짝수행 #fbfcfe, hover #fff1f5, 숫자 컬럼 우측 정렬.
지표 카드: min-height 150, padding 20, 아이콘(brand 22px)+라벨 / 대표 수치 3rem / 보조 설명. 4칸 그리드, 톤 순서 brand→success→info→warning.
모달: backdrop rgba(0,0,0,.4)+blur(4px) z2000, 컨테이너 흰 표면 radius 12 shadow.modal z2001, width 95% max-width 1400 height 80vh.
       열려 있는 동안 body 스크롤을 잠그고 언마운트 시 복원한다. AnimatePresence 로 감싼다.
스크롤바: width 6px, thumb #cbd5e1 radius 8.

[상호작용·접근성]
Esc = 최상위 오버레이 1개만 닫기, Enter = 현재 화면 새로고침.
폴링은 setInterval 기본 30_000ms, useEffect cleanup 에서 반드시 해제. 개별 fetch 는 refreshData 하나로 묶는다.
아이콘 단독 버튼에 aria-label 필수. 팝오버 트리거에 aria-haspopup="dialog" + aria-expanded.
포커스 링: outline 3px solid rgba(211,17,69,.22), outline-offset 3px. outline:none 만 주고 끝내지 않는다.

[금지]
그라디언트 배경 · 다크 표면 배경 · weight 700 이상 · 새 hex 색상 · Tailwind 클래스로 신규 UI ·
react-icons · 확대·회전 hover · 색만으로 상태 표시 · 로딩/오류/빈 상태 누락 · cleanup 없는 setInterval ·
한쪽 변만 강조하는 패턴(box-shadow: inset 3px 0 …, 굵은 border-left, 한쪽 변만 다른 색) ·
네이티브 <select>

선택 입력은 네이티브 select 대신 커스텀 팝오버 셀렉트로 만든다.
트리거(height 42, radius 10)를 누르면 role="listbox" 목록이 열리고, 선택된 항목은
옅은 브랜드 배경 + 사방 1px 브랜드 테두리 + 체크 아이콘으로 표시한다.
키보드(위/아래·Home/End·Enter·Esc)와 바깥 클릭 닫기를 반드시 지원한다.

선택된 항목이나 주의가 필요한 행은 예외 없이 옅은 톤 배경 + 사방 1px 테두리로 표현하고,
필요하면 상태 배지를 덧붙인다. 어떤 경우에도 한쪽 변만 강조하지 않는다.

[출력 형식]
- 코드는 복사해서 바로 쓸 수 있는 완성된 파일 단위로 준다. 파일 경로를 첫 줄 주석으로 표시한다.
- 주석은 한국어 한 줄로, 왜 그렇게 했는지를 남긴다.
- 가이드에서 벗어난 선택을 했다면 답변 끝에 그 이유를 한 줄로 명시한다.
```

---

## 3. 가이드 개정 시 해야 할 일

1. `docs/design-guide/README.md` 를 수정하고 11장 변경 이력에 한 줄 추가한다.
2. 토큰 값이 바뀌었으면 `styles/design-tokens.ts` 를 함께 수정한다.
3. `docs/design-guide/AI-RULES.md` 요약과 이 문서 2번 프롬프트의 해당 값을 갱신한다.
4. ChatGPT 프로젝트에 업로드한 파일 2개를 최신본으로 교체한다.
