# 전시회 다국어 화면

- 지원 언어: 일본어(`ja`, 기본값), 한국어(`ko`, 기존 문안), 영어(`en`).
- 선택한 언어는 브라우저의 `dxs.exhibition.locale`에 저장됩니다. 저장소 사용이 제한되면 현재 세션에서만 적용됩니다.
- 왼쪽 사이드바의 실험실 하위메뉴에서 언어를 변경합니다. 사이드바가 없는 전체 화면에는 오른쪽 위 실험실 설정 버튼을 제공합니다.
- 언어 변경 시 현재 URL은 유지하고 화면을 다시 구성합니다. 진행 중인 필터와 열려 있는 팝업은 초기화되며, 별도 저장한 로컬 전시 데이터는 유지됩니다.

## 구현

`scripts/exhibition-i18n-loader.cjs`가 Next.js의 개발·빌드 과정에서 화면의 JSX 텍스트, 텍스트 자식 값, `title`·`alt`·`aria-label`·`placeholder`를 번역 함수에 연결합니다. 실제 브라우저 DOM을 직접 변경하지 않으며, 번역 API를 호출하지 않습니다. 원본 데이터의 상태 코드, 필터 값, `key`, `ref` 및 컴포넌트 구조는 유지합니다. CSS·스크립트와 서버 라우트 래퍼는 변환하지 않습니다.

정확한 문장은 `lib/i18n/catalog*.ts`, 값이 들어가는 문장은 `catalog-templates.ts`, 공통 용어는 `catalog.ts`의 `glossary`에 관리합니다. 표시 시점에만 번역하므로 한국어 값으로 동작하는 기존 필터·선택 로직을 유지할 수 있습니다. 날짜·시각·숫자 단위는 `translate.ts`에서 별도로 처리합니다.

일반 React 코드에서는 `useLocale()`의 `t`, 캔버스·지도·차트처럼 JSX 밖에서 그리는 텍스트에는 `translateText()`를 사용합니다.

```tsx
import { useLocale } from '@/components/i18n/LocaleProvider';
import { translateText } from '@/lib/i18n/translate';

// React 화면
const { locale, setLocale, t } = useLocale();
// 캔버스 등 외부 렌더러
context.fillText(translateText('현재 위치'), x, y);
```

## 문안 추가와 검증

1. 한국어 원문을 기준으로 `catalog*.ts`에 정확한 일본어·영어 문장을 함께 추가합니다.
2. 템플릿으로 생성하는 문장은 `{0}` 형태의 자리표시자를 가진 완성 문장으로 등록하고 실제 표시 결과도 확인합니다. 숫자와 단위가 인접한 JSX 자식으로 분리되어 있으면 하나의 템플릿 문자열로 합쳐 어순과 띄어쓰기를 유지합니다. 단일 글자를 무조건 치환하면 단어나 날짜를 훼손하므로 숫자 단위는 전용 처리기에 추가합니다.
3. `node scripts/extract-exhibition-copy.mjs <임시파일.json>`으로 한국어 문안을 추출할 수 있습니다. 추출 결과에는 개발용 오류 메시지도 포함되므로 사용자에게 표시하는 내용 위주로 검토합니다.
4. `npx tsx --test tests/exhibition-i18n.test.ts`, `npx tsc --noEmit`, `npm run lint`를 실행하고 세 언어에서 화면·필터·선택·재조회·언어 유지 여부를 확인합니다.
