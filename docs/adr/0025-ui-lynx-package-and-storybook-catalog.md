# ADR-0025 — UI Lynx 패키지와 Storybook Lynx 카탈로그

- 상태: 채택
- 날짜: 2026-09-10
- 다루는 축: 공유 ReactLynx 컴포넌트 패키지, 브라우저 카탈로그 경계
- 부분 대체: ADR-0004 D2의 첫 패키지 유예, ADR-0015 D3의 `packages/ui-lynx` 승격 유예

## 맥락

`@libitums/ui-lynx`를 design-system 기반의 재사용 가능한 ReactLynx 패키지로 제공하고,
브라우저에서 컴포넌트 상태를 빠르게 확인할 수 있어야 한다. 기존 결정은 두 번째 앱이
나오기 전에는 `packages/`를 만들지 않는다고 했다. 이번에는 패키지 자체가 납품물이고,
그 공개 산출물을 소비하는 검증 표면도 함께 필요하므로 그 유예 조건이 실제로 발동했다.

ReactLynx는 DOM React가 아니다. 일반 Storybook 컴포넌트로 다시 그리면 Lynx 번들,
Rspeedy 변환, Lynx 요소와 이벤트 경계를 검증하지 못한다. 반대로 별도의 자체 UI Catalog
앱을 만들면 Storybook의 story·Controls·Actions 기능을 중복 구현하고 검증 표면이 둘로
갈린다.

## 결정

### D0. libitums/design-system의 컴포넌트 문서를 시각 계약의 원본으로 삼는다

`libitums/design-system`의 `components/button.md`, `components/header/back-header.md`,
`components/header/progress-header.md`, `components/indicator/status-indicator.md`와 이들이
참조하는 foundation을 구현 전에 읽고
상태·크기·간격·token·접근성 계약에 사용한다. 최초 보정 기준 revision은
`87c1b0d2b745429be9b586cef772deb6c8707ab6`이다. Storybook story는 이 계약의 대표 상태를
보여주며, 값이 다르면 FE 구현을 임의 기준으로 유지하지 않는다.

단, 원본 Back Header 문서의 64px 프레임(12 + 40 + 12)과 48px focusable hit area는 같은
세로 box model에서 동시에 성립하지 않는다. ReactLynx 매핑은 보이는 24px 아이콘의 중심을
그대로 유지하면서 세로 inset을 8px로 두어 `8 + 48 + 8 = 64`로 해석한다. 또한 Lynx의
`:focus-visible` 지원은 문서화되지 않았다. 현재 CSS는 `:focus` ring을 best-effort fallback으로
두지만 정적 CSS test나 Storybook은 실제 native focus 표시를 증명하지 않는다. 제품 route가
이 package를 채택할 때 접근성 focus event/API를 state/class에 연결하고 native 실기 검증으로
focused 계약을 닫는다.

Brand Button은 design-system의 `brand.primary` #F46B18 surface와 `white` #FFFFFF
label·icon·loading spinner를 사용한다. 이 3.016:1 조합은 design-system Accessibility
문서에서 Default·Pressed·Loading에만 승인한 제품 예외이며, 최종 검증에서도 WCAG AA
통과가 아닌 `approved-exception`으로 기록한다. 다른 저대비 조합으로 예외를 확장하지 않는다.
Neutral Button의 surface는 원본 `gray.800` 대신 `gray.900`을 사용하는 FE override로 둔다.
또한 `loading`과 `disabled`가 함께 주어질 수 있는 소비 API 현실을 반영해 두 상태 class를
동시에 유지한다. 모든 loading spinner는 같은 variant의 label token을 사용한다. disabled
조합에서는 label과 spinner 모두 disabled 표면의 `gray.50`과 겹치지 않는 `border.default`를
쓴다. 이는 사용자 확인을 거친 명시적 FE override이며 design-system 원본이 같은 계약으로
갱신되면 예외 표기를 제거한다.

Progress Header의 track은 원본이 지정한 `gray.300`을 `background.secondary` 위에 그대로
쓴다. 현재 토큰 값의 대비는 1.078:1로 시각적 진행 표시의 3:1에 못 미친다. 이는 임의 token
또는 hex로 우회하지 않는 알려진 design-system gap이며, 원본 token 계약이 바뀌기 전에는
미해결 minor로 기록한다.

### D1. 공유 구현은 `packages/ui-lynx`, 검증 표면은 `apps/storybook-lynx`에 둔다

`packages/ui-lynx`는 앱을 import하지 않고 design token·icon과 ReactLynx peer만 소비한다.
`apps/storybook-lynx`는 공개 package export만 사용한다. 기존 `apps/mobile` 화면은 이번
변경을 이유로 강제 이관하지 않는다.

design-system 저장소는 원칙적으로 플랫폼 구현과 검증도 직접 소유한다. 이번에는 이미
진행 중인 FE 병렬 작업을 막지 않고 소비 API를 검증하기 위해 `packages/ui-lynx`를 임시
예외로 둔다. design-system이 공식 ReactLynx package를 제공하면 FE package를 확장하지
않고 공식 package로 교체하며, 중복 구현은 제거한다.

`apps/storybook-lynx`는 제품 앱이 아니라 개발·검증 앱이다. 따라서 서비스 라우팅이나
상태를 소유하지 않고, 공개 컴포넌트의 states와 variants만 story로 드러낸다.

### D2. 자체 UI Catalog를 만들지 않고 Storybook Lynx 하나만 둔다

기반은 `lynx-community/storybook-lynx`의 `storybook-lynx-rsbuild`다. Storybook manager와
Controls/Actions는 브라우저에서 동작하고, Canvas는 Rspeedy가 만든 `.web.bundle`을
`<lynx-view>`에서 실행한다. 일반 DOM mock story는 같은 컴포넌트의 검증으로 세지 않는다.

Controls 값은 직렬화 가능한 data로 Lynx view에 전달한다. Lynx 쪽 callback은 bridge를
거쳐 Storybook Action으로 돌려보낸다. 이 경계를 story마다 새로 만들지 않고 공통 framework
계약을 따른다.

### D3. 패키지는 type-erased ESM과 선언을 내고 JSX를 보존한다

소비자의 ReactLynx toolchain이 JSX 변환을 소유한다. `.tsx` 입력은 `.jsx`로 내고 authored
JSX를 유지하며, `exports`의 runtime과 `types` 경로는 실제 산출물에 맞춘다. ReactLynx는
`peerDependencies`에 호환 범위로 두고, 패키지 자체 검증 버전은 정확 버전으로 고정한다.

`pack:check`는 tarball에 필요한 파일만 들어가는지, runtime 파일에 ReactLynx JSX가 실제로
남는지, `React.createElement`나 automatic JSX helper로 낮아지지 않았는지 확인한다.
Storybook도 workspace source가 아니라 공개 export를 소비한다.

단, 코드 생성을 하지 않는 루트 `typecheck`가 깨끗한 checkout에서도 먼저 실행될 수 있도록
`tsconfig.typecheck.json`만 workspace source를 타입 해석 대상으로 매핑한다. Rspeedy가 읽는
기본 `tsconfig.json`에는 이 mapping을 두지 않는다. Storybook의 dev/build 명령은 package를
먼저 build하고 공개 `dist` export를 해석한다.

### D4. 공개 표면은 Button, Back Header, Status Indicator, Progress Header다

네 컴포넌트는 design-system token과 icon을 사용하고 상태·variant를 명시적 union으로
닫는다. 필요한 token이 없으면 임의 semantic token을 만들지 않는다. 공개 컴포넌트를
늘리는 것은 실제 제품 소비 또는 명시적 납품 요구가 생길 때 별도 결정한다.

Back Header는 design-system의 아이콘·제목 묶음 전체 tap 동작을 유지한다. 다만 ReactLynx의
iOS 접근성 트리에서 accessible button 안에 title header를 중첩하지 않도록, 48px 아이콘
영역을 이름 있는 뒤로가기 button으로 노출하고 제목은 sibling header leaf로 둔다. 이는
ADR-0016의 leaf semantics를 지키는 플랫폼 접근성 예외이며, pointer/tap hit 영역과 접근성
focus node의 경계가 의도적으로 다르다.

### D4.1. 공개 컴포넌트는 컴포넌트 디렉터리 단위로 분리한다

각 공개 컴포넌트는 `packages/ui-lynx/src/<component>/` 아래에 구현 `.tsx`, 공개 타입을
정의하는 contract, 필요한 경우의 순수 logic, 전용 CSS, component barrel과 해당 단위의
unit·UI test를 함께 둔다. 현재 이 구조를 적용하는 디렉터리는 `button/`, `back-header/`,
`status-indicator/`, `round-button/`, `progress-header/`, `page-indicator/`,
`bottom-navigator/`, `step-indicator/`다. 컴포넌트 구현·스타일·테스트를 다시 root 파일에
합치지 않는다.

기존 소비 호환성을 위해 `src/index.ts`는 여덟 component barrel의 공개 값과 타입을 재수출하는
root barrel로 유지한다. CSS도 기존 단일 진입점인 `@libitums/ui-lynx/styles.css`를 유지한다.
이 aggregate root CSS는 design token CSS와 각 component CSS를 import하며, 소비자가
컴포넌트별 소스 경로를 알아야 하게 만들지 않는다.

동시에 각 component barrel은 독립적으로 build되어 `dist/<component>/index.js`와 선언 파일을
만들고, `package.json`의 `@libitums/ui-lynx/<component>` subpath export가 그 산출물을 직접
가리킨다. JSX를 가진 구현은 D3에 따라 같은 디렉터리의 `.jsx` 산출물로 보존된다. 따라서
Storybook을 포함한 선택적 소비자는 root barrel을 경유하지 않고 필요한 공개 subpath만
사용할 수 있으며, root import를 쓰던 소비자는 변경 없이 유지된다.

이후 공개 컴포넌트를 추가하거나 병렬 브랜치의 컴포넌트를 합칠 때는 먼저 구현·contract·logic·
CSS·테스트를 새 component directory에 이관한다. 그 다음 root barrel, aggregate root CSS,
package subpath export와 pack 검사를 공통 통합 지점으로 한 번만 갱신한다. 병렬 작업이 root
파일 전체를 복사하거나 monolithic entry를 되살리는 방식으로 충돌을 해결하지 않는다.

> **2026-09-14 정정 — canonical contract-only 구조:** 위의 `contract`와 필요한
> `logic`을 별도 파일로 두던 구조는 현재 규칙이 아니다. 공개 컴포넌트 여덟 개는
> 모두 `src/<component>/<component>.contract.ts` 하나에 공개 타입과 순수 계약 함수를
> 함께 두며 generic `contract.ts`와 별도 `logic.ts`를 허용하지 않는다. component-local
> unit/UI test는 `<Component>.unit.test.ts`/`<Component>.ui.test.tsx`를 쓴다. 순수 runtime
> export가 없는 `BackHeader`만 unit test를 두지 않는다. 소스 트리의 여덟 디렉터리
> 멤버십과 구현·contract·CSS·barrel·test 명명은
> `component-file-conventions.unit.test.mjs`가, 배포 산출물의 canonical contract와
> generic contract/logic 부재는 `check-pack.mjs`가 검증한다. package integration test도
> 여덟 subpath의 산출물 계약을 확인한다. D4.1의 처음 소유 방식과 아래 BottomNavigator 확장의
> `구현·contract·logic` 표현은 도입 시점의 기록으로 유지하되, 신규·현재 구조에는
> 이 정정을 적용한다.

Progress Header는 `title`, `activity`, `progress`, `exitAccessibilityLabel`, `onExit`와
`motion?: "standard" | "reduced"`를 받는다. 하나의 정규화 결과가 root data, percentage
label, fill width를 모두 구동하며 `NaN`과 0 이하는 0, 100 이상은 100으로 clamp한다. fill의
소수 정밀도는 유지하고 표시 label만 소수 첫째 자리로 제한한다. 0은
fill node가 없고, 양수 fill은 8px 최소 시각 폭을 가지며, 100은 track 전체를 채운다. 48px
exit는 항상 활성인 이름 있는 button이고 tap 하나가 단 하나의 handler를 거쳐 `onExit`를
한 번 호출한다. title row는 48px `min-height`와 중앙 정렬로 배율을 수용하고, exit를
row의 `top: 0`에 absolute로 놓으며 48px 대칭 gutter로 제목과 exit의 세로 중심선,
제목 중심, hit area를 함께 보존한다. fill은 `brand.primary`를 사용한다. title은 sibling `header`,
activity와 정규화 percentage는 하나의 접근성 label인 caption leaf로 매핑한다.

standard progress 전환과 exit icon crossfade는 design-system motion duration/easing token을
쓴다. reduced는 명시적 union 값으로만 선택하며 progress 전환은 없애고 icon crossfade는
`d2`/`linear` token으로 줄인다. ReactLynx가 host OS reduced-motion 설정을 이 prop에 자동
매핑하는 경로는 없으므로 소비 host가 값을 연결해야 한다. `:focus` ring은 ReactLynx에서
best-effort fallback일 뿐 native focus 표시를 증명하지 않으며, `accessibility-value`도
현재 iOS 채널에 도달하지 않아 진행 값은 caption의 합성 label로 전달한다.

### D5. Storybook 웹 확인과 native 확인을 구분한다

Storybook은 공개 package subpath를 import해 Rspeedy가 만든 Button, Back Header, Status
Indicator, Round Button, Progress Header, Page Indicator, Bottom Navigator, Step Indicator의
실제 여덟 `.web.bundle`을 `<lynx-view>`에서 실행한다. props, 상태, layout, token 적용,
bridge 상호작용을 빠르게 확인하지만 다음은 증명하지 않는다.

- 브라우저 DOM 접근성 트리와 키보드 조작 (`<lynx-view>` Canvas는 시각·tap 확인 표면이다)
- VoiceOver/TalkBack의 실제 낭독 순서와 traits
- iOS/Android 시스템 글꼴과 Dynamic Type
- native gesture timing, safe area, host module 통합

따라서 Storybook 수동 흐름은 `docs/e2e/ui-lynx-storybook.md`가 지고, native 항목은 제품
호스트의 수동 검증에 남긴다. 현재 제품 앱은 아직 이 package를 소비하지 않으므로 native
접근성 실기 검증은 이번 package/catalog 납품의 비차단 후속 조건이다. 이 작업의 접근성
게이트는 정적 구조·token·배율 안전 CSS와 ReactLynx UI test로 닫고, package를 실제 제품에
채택하는 릴리스에서 소비 route와 실기 검증을 필수로 승격한다. 최종 리뷰 뒤에는 Storybook dev server를 실제 실행하고
Codex 앱의 브라우저 패널에 localhost URL을 열어야 완료로 센다.

### D6. 검증 명령은 기존 루트 게이트에 포함한다

- `pnpm storybook:lynx`: Lynx Web bundle watch와 Storybook dev server
- `pnpm storybook:lynx:build`: Lynx Web bundle과 정적 Storybook 생성
- `pnpm verify`: package와 Storybook의 format, type, lint, test, build를 기존 순서에 포함
- `pnpm cycle:check`: `packages/ui-lynx`와 `apps/storybook-lynx`의 순환 의존 검사

Storybook integration test는 이전 실행의 ignored `dist`에 의존하지 않도록 먼저
`@libitums/ui-lynx`와 자신의 정적 build를 만들고 그 산출물을 검사한다. 깨끗한 checkout과
이미 dev server를 돌린 checkout의 결과가 같아야 한다.

2026-09-14부터 루트 `test:unit`과 `test:ui`는 `@libitums/ui-lynx`와
`@libitums/mobile`을 각각 명시적으로 포함한다. `test:integration`은 두 패키지의
integration 계층 다음 `@libitums/storybook-lynx test`를 불러 package 산출물과 Storybook
catalog 경계까지 검증한다. `.agent-harness/profile.yaml`은 패키지 멤버십을 다시
나열하지 않고 이 루트 계층 스크립트를 간접 호출한다. 루트 `test`는
세 계층 후 `test:report-policy`를 실행하며 `verify`는 이 전체 멤버십을 사용한다.

루트 Node 22와 pnpm 10 정책은 유지한다. Storybook 관련 의존은 이 저장소에서 확인한 정확
버전으로 고정한다.

### 2026-09-10 확장 — RoundButton 공개 표면

이 절은 D0·D4·D5·D6의 방향을 바꾸지 않고, 같은 package/catalog 경계에 네 번째 공개
컴포넌트를 추가한 delta를 기록한다. D4의 Button, Back Header, Status Indicator 열거는 최초
공개 표면의 역사로 유지한다.

- D0의 시각 원본 목록에 `components/round-button.md`를 추가한다. M icon 18px과 Spinner
  12px에는 대응 size token이 없지만 원본이 정확한 component 값을 고정했으므로 비차단 gap으로
  기록한다. 새 FE token이나 다른 token의 재해석은 허용하지 않는다.
- D4의 현재 공개 표면은 `RoundButton`을 포함한 네 컴포넌트다. 구현, 계약, CSS, 테스트,
  barrel은 `src/round-button/`에 함께 두고 root entry에서 재수출한다.
  `@libitums/ui-lynx/round-button` subpath는 전용 compiled runtime과 declaration으로 해석된다.
- D5의 Storybook 확인 대상에 Default, Brand, Loading, Disabled 네 story, serializable
  Controls, 활성 `onTap` Action 1회와 Loading·Disabled Action 0회를 추가한다. 48/56px hit area와
  native focus·VoiceOver·TalkBack은 계속 구분하며 후자는 제품 route 채택 전까지 비차단이다.
- D6의 build·integration 검사는 `round-button.web.bundle`을 더한 네 bundle, catalog의 네
  Round Button story ID, 공개 subpath 소비와 Action bridge 경계를 검증한다.

### 2026-09-11 확장 — BottomNavigator 공개 표면

이 절은 기존 package/catalog 경계를 유지하면서 다섯 번째 공개 컴포넌트를 추가한 delta다.

- 시각·상태 원본은 `libitums/design-system/components/bottom-navigator.md`다. 구현은 icon-only
  3~5 item, enabled/disabled, active/inactive/pressed, dot/count badge 계약을 닫힌 union으로
  제공한다. 기존 `apps/mobile/src/components/BottomNavigator.tsx`는 제품 화면 소유 구현이므로
  교체하거나 삭제하지 않는다. 확인한 정본은 2026-09-11의 `main` revision
  `2144145cd7ffb5777cf2b74e2fec5474eb0adc14`다.
- bar 배경은 제품 요청에 따라 정본의 `background.elevated` 대신 `white` token을 사용하는 명시적
  FE override다. 나머지 radius, shadow, spacing과 상태 token 계약은 정본을 유지한다.
- 구현·contract·logic·CSS·unit/UI test는 `src/bottom-navigator/`가 함께 소유한다. root barrel과
  aggregate CSS는 호환성을 위해 재수출하며, 선택 소비자는
  `@libitums/ui-lynx/bottom-navigator`와 `@libitums/ui-lynx/bottom-navigator/styles.css`를 쓴다.
  pack gate는 독립 runtime, declaration, CSS와 authored JSX 보존을 확인한다.
- 원본의 40px visual cell과 최소 48px focus/tap 영역은 바깥 item 48px 안에 40px surface를
  두는 방식으로 함께 충족한다. 선택 surface는 60 × 40px pill이고 해당 item focus 영역도
  60px까지 넓어진다. bar의 보이는 세로 inset은 위·아래 각 20px로 해석해 safe area 전 높이는
  `20 + 48 + 20 = 88px`다.
- 5개 item은 각 최소 48px와 좌우 24px padding을 합친 288px에 여유를 둔 300px viewport를
  최소 지원 폭으로 정한다. label은 시각적으로 렌더링하지 않아 긴 접근성 이름이 layout을
  바꾸지 않는다. 300px 미만, native safe-area 조합은 현재 지원 범위 밖이다.
- 접근성 focus node는 각 item 하나이며 icon과 badge는 장식 자손이다. 선택 상태와 badge 의미는
  item의 접근성 이름에 합친다. disabled item은 discriminated union의 비어 있지 않은
  `disabledReason`을 요구하고 같은 접근성 이름에 이유를 합친다. disabled item은 SDK가 지원하는
  `disabled` trait를 사용하고 tap handler와 focus 순서에서 제외한다. enabled item은
  PC focusable이며 disabled를 건너뛰는 좌우 연결과 첫·마지막 self-boundary,
  `:focus-visible` double ring을 갖는다. 정적/UI test는 이 속성 계약을
  닫지만 실제 native D-pad 이동과 VoiceOver/TalkBack 낭독은 제품 route 채택 릴리스의 실기기
  게이트로 남긴다.
- Storybook은 Default, Long Accessibility Label, All Items(5개·320px), Disabled를 제공하고
  public subpath만 소비한다. enabled tap의 `onSelect(id)` bridge와 disabled 무반응을 integration
  test로 검증한다.

### 2026-09-11 확장 — StepIndicator 공개 표면

이 절은 같은 package/catalog 경계에 여덟 번째 공개 컴포넌트를 추가한 delta다. 시각 정본은
`libitums/design-system/components/indicator/step-indicator.md` revision
`3f7ed6d17df769e37215adb40f7abfc2e1174fd1`이다.

- `StepIndicator`는 1-based `currentStep`과 2–5 정수 `totalSteps`를 받는다. 이전/현재/이후
  상태는 각각 Completed/Current/Upcoming으로 순수 파생하며 잘못된 계약은 즉시 거부한다.
- `step-indicator/`에서 `step-indicator.contract.ts`가 공개 타입과
  `getStepIndicatorContract` 순수 로직을 함께 소유하고, 단위 테스트는
  `StepIndicator.unit.test.ts`에 둔다. 구현·스타일·UI 테스트·barrel도 같은 디렉터리가 소유한다.
- 32px 원과 2px 연결선을 사용하고, 연결선은 왼쪽 단계 상태의 색을 따른다. 원은 이동
  control이 아니며 tap API를 제공하지 않는다.
- 전체 줄 하나만 `N단계 중 M단계` 접근성 이름으로 노출하고 숫자 원·연결선 자손은 숨긴다.
  Storybook 정적 구조 검증은 native 실청을 대신하지 않으며 제품 route 채택 전까지 비차단인
  D5 경계를 그대로 따른다.
- `@libitums/ui-lynx/step-indicator`는 독립 ESM·declaration을 제공하고,
  `@libitums/ui-lynx/step-indicator/styles.css`는 전용 CSS를 공개한다. root barrel과 aggregate
  `@libitums/ui-lynx/styles.css` 호환성을 유지하며 전용 CSS는 side effect로 보존한다. pack 검사는
  `StepIndicator.jsx`의 authored JSX 보존도 확인한다.
- Storybook은 First/Middle/Last story와 `step-indicator.web.bundle`을 제공하며, runtime은 공개
  subpath만 소비한다. Controls는 JSON 직렬화 가능한 `currentStep`, `totalSteps`만 전달한다.
  runtime normalizer는 유효하지 않은 `totalSteps`를 4로, 유효하지 않은 `currentStep`을
  `Math.min(2, totalSteps)`로 대체한다.

### 2026-09-15 확장 — ChatBubble 공개 표면

이 절은 같은 package/catalog 경계에 아홉 번째 공개 컴포넌트를 추가한 delta다. 시각·상태
정본은 `libitums/design-system/components/chat-bubble.md` revision
`979e57fec7b38533129da65166109984d2f16686`이다.

- `ChatBubble`은 Bubble 안에 Message text만 렌더한다. Speaker, Avatar, Timestamp, Delivery
  status와 Action은 상위 Message item의 composition 책임으로 남긴다. 기존 제품 화면의
  `MessageBubble`은 D1 원칙대로 강제 이관하지 않는다.
- direction, S/M/L size, Outgoing delivery와 UI/learning content language를 닫힌 union으로
  제공한다. Incoming delivery는 항상 Default이고, learning content는 비어 있지 않은
  `languageTag`를 요구한다.
- 최대 너비 280px, `radius.md`, 논리 방향의 0px 아래 모서리, direction surface/foreground,
  size별 body typography와 padding은 정본 token을 그대로 쓴다. 긴 연속 문자열은 Lynx가
  지원하는 `word-break: break-all`로 Bubble 안에 유지한다.
- 실제 speaker와 message는 하나의 접근성 text node 이름으로 합친다. Outgoing non-default
  delivery는 `accessibility-value`에 상태 문구로 연결한다. ReactLynx 0.125 공식 props에
  native language 매핑이 없어 language metadata까지만 보존하며 실제 학습 언어 발음은 제품
  route 채택 시 native gate로 남긴다.
- `@libitums/ui-lynx/chat-bubble`과 전용 styles subpath, root barrel, aggregate CSS, pack 검사를
  함께 확장한다. Storybook은 7개 대표 story와 `chat-bubble.web.bundle`을 제공하고 runtime은
  public subpath만 소비한다.

### 2026-09-15 확장 — TextField 공개 표면

이 절은 같은 package/catalog 경계에 열 번째 공개 컴포넌트를 추가한 delta다. 시각·상태
정본은 `libitums/design-system/components/text-field.md` revision
`1ba6b55103663c407f073f9ede3a2e700bf9b722`이다.

- `TextField`는 native `<input>`을 사용하고 Label/Qualifier, Leading, Trailing,
  Helper/Error, Counter를 독립 옵션으로 조합한다. Empty/Filled, Unfocused/Focused,
  None/Error, Enabled/ReadOnly/Disabled 축에서 시각 우선순위를 한 상태로 정규화한다.
- Input purpose는 Lynx가 지원하는 native type과 confirm type에 연결한다. native element가
  uncontrolled initial value를 제공하므로 공개 값 계약은 `defaultValue + bindinput`이다.
- Label 또는 별도 접근성 이름을 필수로 하고 오류 해결 문구와 counter 의미는 input 이름에
  합친다. ReactLynx 0.125에 HTML과 동일한 required/invalid/description 관계가 없어 실제
  VoiceOver/TalkBack과 host semantics는 제품 route 채택 시 native gate로 남긴다.
- Leading/Trailing은 닫힌 union으로 빈 slot과 다중 adornment를 막는다. Trailing Action은 input
  다음 별도 button node와 48px hit area를 가지며 Disabled에서는 handler를 연결하지 않는다.
- `@libitums/ui-lynx/text-field`와 전용 styles subpath, root barrel, aggregate CSS, pack 검사를
  함께 확장한다. Storybook은 8개 대표 story와 `text-field.web.bundle`을 제공하고 runtime은
  public subpath만 소비한다.

## 버린 대안

- **`apps/ui-catalog` 자체 앱을 함께 둔다** — 같은 공개 API를 보여주는 표면이 둘이 되고,
  story·Controls·Actions 기능을 다시 구현해야 한다. 검증 기준이 갈리므로 버린다.
- **일반 DOM Storybook으로 컴포넌트를 다시 그린다** — Lynx 요소와 Rspeedy 산출물을
  검증하지 못한다.
- **제품 앱 화면을 즉시 package 컴포넌트로 모두 이관한다** — 이번 변경의 소비 근거가
  없는 화면까지 범위를 넓히고, 병렬 화면 작업과 충돌한다.
- **TSX source를 package 기본 export로 둔다** — 모든 소비 도구가 dependency 내부의
  TypeScript까지 처리해야 하므로 type-erased dist를 기본으로 둔다.
- **design-system 소유권 규칙을 영구적으로 무시한다** — 임시 FE 검증 구현이 두 번째 원본이
  되므로 버린다. 공식 ReactLynx package가 생기면 이 구현을 교체한다.

## 대가

- Storybook 시작 전에 Lynx Web bundle build가 필요하고 dev server가 둘을 함께 관리한다.
- 브라우저에서 보인다는 사실만으로 native 접근성·host 통합을 통과했다고 말할 수 없다.
- 첫 workspace package와 검증 앱이 생겨 root build/test 시간이 늘고 순환 검사가 필요하다.
- upstream Storybook Lynx가 실험 단계라 framework 업데이트 때 통합 계약을 다시 확인해야 한다.

## 재검토 조건

- `storybook-lynx-rsbuild`가 unified dev server 또는 native preview를 공식 지원할 때 D2·D5
- design-system 저장소가 공식 ReactLynx component package를 배포할 때 D0·D1의 임시 예외
- 두 번째 제품 앱이 `@libitums/ui-lynx`를 소비할 때 package 공개 범위와 peer 범위
- 공개 컴포넌트가 10개를 넘을 때 subpath export와 story 분류
- Storybook과 native host에서 같은 state가 다르게 보이는 사례가 1건 생길 때 수동 검증 경계
