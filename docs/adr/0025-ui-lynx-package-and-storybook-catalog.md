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
매핑하는 경로는 없으므로 소비 host가 값을 연결해야 한다 ⟨2026-10-09 주: 쓰인 시점의 기록이다 —
「2026-10-09 확장」부터 그 연결을 패키지의 `MotionProvider`가 받고 이 prop은 override로 남는다⟩.
`:focus` ring은 ReactLynx에서
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

⚠ **위 *"현재 제품 앱은 아직 이 package를 소비하지 않으므로"* 는 2026-09-16부터 시점이 지났다**
— `apps/mobile`의 진입 흐름이 `@libitums/ui-lynx/text-field` 하나를 소비한다. 그 문장은 **쓰인
시점에 참이었으므로 사실 오류가 아니고**, 그래서 `정정 기록`이 아니라 아래
**「2026-09-16 확장 — `apps/mobile`의 첫 소비」** 절이 덮는다(같은 날짜의 「Tooltip 공개 표면」
절이 아니다). **D5가 스스로 예고한 *"package를 실제 제품에 채택하는 릴리스에서 소비 route와
실기 검증을 필수로 승격한다"* 가 그 절에서 발동했다** — 승격된 실기 검증은
`docs/e2e/entry-flow.md`가 지고 **아직 실행 0회**다.

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

### 2026-09-15 확장 — TextField 공개 표면

이 절은 같은 package/catalog 경계에 TextField 공개 컴포넌트를 추가한 delta다. 시각·상태
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

### 2026-09-15 확장 — ChatBubble 공개 표면

이 절은 같은 package/catalog 경계에 ChatBubble 공개 컴포넌트를 추가한 delta다. 시각·상태
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

### 2026-09-16 확장 — VisualNovelDialog 공개 표면

정본은 `libitums/design-system/components/visual-novel-dialog.md` revision
`99d1bfbef981d3cdf225a0bad337f3aa3a7b0d55`이다.

- 컴포넌트는 panel/text만 소유하고 장면, 선택지, timer와 진행 입력은 host에 남긴다.
- Speech/Narration/Thought와 surface/reveal/advance를 닫힌 독립 축으로 제공한다. Avatar는
  32px composition slot이다.
- Typewriter의 시각 부분 문자열과 전체 접근성 문장을 분리한다. Auto는 pause control이
  존재한다는 명시적 계약을 요구한다.
- 공개 subpath, styles, root barrel, aggregate CSS와 pack 검사를 확장하고 Storybook은 9개
  대표 story와 실제 `visual-novel-dialog.web.bundle`을 제공한다.

### 2026-09-16 확장 — Tooltip 공개 표면

이 절은 같은 package/catalog 경계에 Tooltip 공개 컴포넌트를 추가한 delta다. 시각·상태 정본은
`libitums/design-system/components/tooltip.md` revision
`5c7bce3eb2c0d214de78bcec0c52d7b7395e8a19`이다.

- Tooltip은 Message와 배치 표현만 소유하며 trigger와 open/dismiss 상태는 제품 host가 소유한다.
- Placement·Alignment·Arrow·Tone·Visibility를 독립 옵션으로 제공하고 Start/End는 RTL 논리
  방향을 따른다. Bubble은 240px, 8×12px padding, body.m, radius.md와 floating z-index를 쓴다.
- Brand는 제품 결정에 따라 `brand.primary`, Neutral은 `gray.950`, 전경은
  `fg.neutral-inverted`를 사용한다. Bubble과 Arrow는 동일한 surface token을 공유한다.
- `resolveTooltipLayout`은 측정 geometry로 Flip·Shift와 Arrow edge fallback을 순수 계산한다.
  측정·스크롤/회전 listener와 trigger-description 접근성 결선은 host 경계로 남긴다.
- `@libitums/ui-lynx/tooltip`과 전용 styles subpath, root barrel, aggregate CSS, pack 검사를 함께
  확장한다. Storybook은 8개 대표 story와 `tooltip.web.bundle`을 제공한다.

### 2026-09-16 확장 — `apps/mobile`의 첫 소비

이 절은 같은 package/catalog 경계를 유지하면서 **제품 앱이 이 package를 처음 소비한 delta**를
기록한다. **새 공개 컴포넌트를 더하지 않는다** — 늘어난 것은 만드는 쪽이 아니라 **쓰는 쪽**이다.

**왜 새 ADR 번호가 아니고 `정정 기록`도 아닌가.** D5가
*"package를 실제 제품에 채택하는 릴리스에서 소비 route와 실기 검증을 필수로 승격한다"* 로
**이 시점을 자기 안에 예고**했으므로, 예고된 조건이 발동한 **적용 기록**이다. D1의
*"기존 `apps/mobile` 화면은 이번 변경을 이유로 강제 이관하지 않는다"* 는 **지금도 참이다** —
이관은 **0건**이고 새 화면이 소비한다. ⚠ **D5의 *"현재 제품 앱은 아직 이 package를 소비하지
않으므로"* 는 이 절이 덮는다** — 그 문장은 **쓰인 시점에 참이었고** 2026-09-16에 시점이 지난
것이라 사실 오류가 아니다. 그래서 `정정 기록`이 아니다.

- **소비하는 공개 표면은 `@libitums/ui-lynx/text-field` 하나**이고, 함께 부르는 CSS도 전용
  진입점 `@libitums/ui-lynx/text-field/styles.css` 하나다. **aggregate
  `@libitums/ui-lynx/styles.css`를 부르지 않는다** — 소비하지 않는 컴포넌트의 CSS까지 제품
  번들에 들어간다. 쓰는 자리는 진입 흐름의 입력 둘(로그인의 전화번호 칸 · 코드 검증 칸)이다.
- **소비하지 않기로 한 것과 근거.** `CompactNumericInput`은 상자 높이가 **고정 생값**이라 최대
  배율에서 글자 줄상자가 상자를 넘어 **숫자가 잘린다** — 고치는 것이 package 변경이라, 소비하면
  제품 route가 그 결함을 **처음 들여오는** 자리가 된다. `PageIndicator`는 시각이 같지만 접근성
  이름이 `Scene ${n} of ${m}`로 **영어 하드코딩**이라 한국어 화면에 영어 낭독이 들어온다.
  `Button`은 `variant="brand"`의 대비가 미달이라(면 2.97:1 · 흰 라벨 3.02:1) 저장소의 기존 액션 행
  레시피를 잇는다. ⇒ **소비 표면을 넓히지 않는 것이 이 절이 져야 하는 표면을 좁게 유지한다.**
- **해석 경로 — 소비자가 두 곳에서 workspace source를 본다.** `apps/mobile/tsconfig.typecheck.json`
  (신설)이 `@libitums/ui-lynx/text-field`를 패키지 소스로 매핑하고, `apps/mobile/vitest.config.ts`의
  `resolve.alias`가 테스트에서 같은 일을 한다. **D3이 정한 형태 그대로다** — Rspeedy가 읽는 기본
  `tsconfig.json`에는 매핑을 두지 않고, 패키지의 `types`가 `dist/*.d.ts`라 빌드 전에는 없기
  때문이다. 루트 `dev`도 이제 ui-lynx를 먼저 build한다(루트 `build`는 이미 그랬다).
  - ⚠ **형태가 `apps/storybook-lynx`와 한 줄 갈렸다 — 의도는 같고 수단이 다르다.** storybook의
    같은 파일은 `baseUrl: "."` + `paths`인데 **mobile은 `paths`만** 두었다. 이유는 취향이 아니라
    **TypeScript 버전**이다 — mobile은 **6.0.3**이고 그 버전에서 `baseUrl`은 제거돼 **`TS5101`
    하드 에러**가 된다. storybook은 **5.9.3**이라 같은 줄이 아직 걸리지 않는다. `paths`는 그
    `tsconfig.json`의 위치를 기준으로 해석되므로 `baseUrl` 없이 같은 결과가 나온다.
    ⇒ **D3의 「`tsconfig.typecheck.json`만 workspace source를 매핑한다」는 지켜졌고 형태만
    갈렸다.** **storybook의 파일을 이 회차가 고치지 않았다** — 그 앱의 TypeScript가 6으로 올라가는
    날 같은 자리가 선다.
- **D5가 비차단 후속으로 미뤄 둔 native 접근성 실기 검증이 이제 필수로 승격됐다.** 지는 자리는
  `docs/e2e/entry-flow.md`의 **K 항목**(소프트 키보드 — 종류 · 가림 · 내리는 수단)과 **V 항목**
  (VoiceOver — 입력 칸 위에서 들리는 것)이다. ⚠ **승격은 「돌았다」가 아니라 「이제 차단이다」**
  이고, 이 절을 쓰는 시점에 그 항목들은 **한 번도 실행되지 않았다.**
- ⚠ **이 소비가 제품에 처음 들여온 것 둘 — 판정이 아니라 기록이다.**
  ① `.ui-lynx-text-field-surface`의 **150ms 색 `transition`**(`motion-duration-color`).
  **끄는 길이 없다** — `prefers-reduced-motion`이 이 저장소 전체에 **0건**이고 Lynx 미디어 특성
  표에도 없다 ⟨2026-10-09 주: 쓰인 시점의 기록이다 — 「2026-10-09 확장」이 끄는 길(`MotionProvider`)을
  들였다. 다만 정본 motion.md가 색 전환은 「유지」로 두므로 이 150ms 색 전환은 reduced에서도 그대로다⟩. 소비하는 화면 쪽이 *"모션을 새로 더하지 않는다"* 로 정한 것은 **컴포넌트가 자기
  CSS로 이미 가진 것에는 적용되지 않는다** — 그 구분을 여기 적어 둔다.
  ② `:focus` **box-shadow 포커스 링.** ADR-0016 **D7**이 *"포커스 링과 탭 순서를 요구하지
  않는다"* 고 적은 축에 **실물이 하나 생겼다** — *우리가 요구하지 않는다*와 *제품에 없다*는 다른
  말이다. 이 스택에서 `:focus`가 실제로 서는지는 **미확인**(D0이 같은 자리를 이미 *"best-effort
  fallback"* 으로 적었다)이고 관측 자리는 `docs/e2e/entry-flow.md` **V1의 기록 절**이다. D7 아래에도
  같은 사실을 한 줄 이어 두었다.
  ⇒ **둘 다 AAA 2.3.3 축이라 AA 판정을 막지 않는다.** 여기 적는 이유는 **「이 변경이 저장소에
  무엇을 들여왔나」를 적는 자리가 이 절**이기 때문이다.
- **축 추적표에 새 행을 더하지 않는다** — 새 축이 아니라 같은 「공유 ReactLynx 패키지와 브라우저
  카탈로그」 축이다(ADR-0013: 새 행은 「새 축이다」라는 신호). **재검토 조건의 *"두 번째 제품 앱이
  `@libitums/ui-lynx`를 소비할 때"* 도 발동하지 않는다** — 이번은 **첫** 제품 앱이다. 그 행은
  그대로 열려 있다.

### 2026-10-09 확장 — `motion` 모듈과 패키지 첫 교차 컴포넌트 Provider

> *(2026-10-10 주: **모션 정책 축은 [ADR-0053](0053-motion-policy.md)이 진다** — 이 절과 아래 「2단계」 ·
> 「3단계」 소절 셋은 적용 기록이다. 본문은 고치지 않았고 날짜 주만 달았다.)*

이 절은 같은 package/catalog 경계에 **공개 subpath `@libitums/ui-lynx/motion`** 과 패키지 안
첫 **교차 컴포넌트 Context**(`MotionProvider` · `useMotion`)가 들어온 delta를 기록한다. 공개
컴포넌트는 늘지 않는다 — 늘어난 것은 **컴포넌트들이 공유하는 값 하나**다. 정책 정본은
design-system `foundations/motion.md`의 「Reduced motion」 · 「컴포넌트 매핑」과 `motion.json`의
`com.libitum.reduced-motion` 확장이다(keep: color · opacity · spinner / remove: translate · scale ·
rotate · width · reveal). 새 토큰은 0이고 `@libitums/design-tokens` 0.3.0 그대로다.

**왜 새 ADR 번호가 아닌가.** D4.1 ProgressHeader 문단의 *"ReactLynx가 host OS reduced-motion
설정을 이 prop에 자동 매핑하는 경로는 없으므로 소비 host가 값을 연결해야 한다"* 와 「2026-09-16
확장 — `apps/mobile`의 첫 소비」 ①의 *"끄는 길이 없다"* 가 **예고한 빈자리를 채우는 적용 기록**
이다. 두 문장은 쓰인 시점에 참이었고 이 절이 시점을 넘긴다 — 그 자리마다 날짜 주를 달았다.
뒤집힌 결정은 없다.

- **값은 Context로 흐르고 타입은 `Motion = "standard" | "reduced"` 문자열 union이다.** 기존
  `DialogMotion` · `BottomSheetMotion` · `OverlayMotion` · `ProgressHeaderMotion`은 이 타입의
  별칭이 됐다(구조적으로 같은 union이라 소비자 타입이 깨지지 않고 공개 이름은 남는다). boolean을
  컨텍스트 값으로 쓰지 않은 이유: 이미 넷이 문자열 union이고, 관찰 채널 `data-motion`이
  문자열이며, 뒤에 값이 셋 이상이 될 여지(플랫폼 crossfade 등)를 union이 받는다.
  `reducedMotion?: boolean` prop(VisualNovelDialog · ChatBubble · `useTypewriter`)은 이름을 바꾸지
  않고 **override로만** 남는다.
- **우선순위는 명시 prop > 컨텍스트 > `"standard"`.** 순수 `resolveMotion` · `resolveReducedMotion`이
  이 규칙 하나를 진다. Provider 밖(Storybook · playground · 기존 테스트)에서는 `useMotion()`이
  `"standard"`를 돌려주고 던지지 않는다 — 그래서 **Storybook 스토리와 기존 ui · integration 테스트는
  한 글자도 바뀌지 않았다.** ReactLynx의 `createContext` · `useContext`는 Card가 로컬 Context로
  이미 쓰던 선례가 있어 가용성을 새로 확인할 것이 없었다.
- **컴포넌트는 `useMotion()`을 조건 없이 한 번 부르고 계약 함수의 둘째 인자
  `contextMotion: Motion = "standard"`로 넘긴다.** 기본값이 있어 기존 단위 테스트는 바뀌지
  않는다. contract 객체에는 필드를 더하지 않는다 — RoundButton · LearningUnit 단위 테스트가 객체
  전체를 `toEqual`로 고정하고 있어, reduced는 className 토큰 하나(`<block>-motion-reduced`)로만
  contract에 드러난다.
- ⚠ **받아들인 비대칭 — 「늘 내는 넷 / reduced만 내는 넷」.** Dialog · BottomSheet · Overlay(클래스만) ·
  ProgressHeader는 전부터 `data-motion="standard"`를 늘 냈고 값만 컨텍스트에서 온다. 새로 변형을
  받은 RoundButton · LearningUnit · PageIndicator · SettingsCell은 **`reduced`일 때만** 클래스와
  `data-motion`을 낸다. 「standard에서 DOM 속성 · 클래스 · CSS 선언이 byte 단위로 같다」는 시각
  비변경 계약의 직접 결과이고, 통일하려면 어느 한쪽의 standard DOM이 바뀌므로 이 회차 밖이다.
  - 「내지 않는다」의 구현은 **조건부 spread**다
    (`motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {}`).
    `data-motion={cond ? "reduced" : undefined}`로 쓰면 테스트 렌더러가 속성을 **`"null"` 문자열로
    남겨** 「속성 없음」 단언이 깨진다 — `TextField.tsx`가 `maxlength`를 같은 꼴로 빼는 선례와 같은
    이유다(그쪽은 iOS native input이 `undefined`를 0으로 받던 문제. 둘 다 `undefined` 속성이
    「없음」으로 끝나지 않는 자리다).
- **Card · Tooltip은 변형을 만들지 않는다.** *(2026-10-11 주: Card는 뒤집혔다 — 눌림 확장이 interactive Card에
  95 % 축소와 reduced 변형(색만)을 더했다. 결정은 [ADR-0053](0053-motion-policy.md) 정정 기록 1이 진다. Tooltip만
  변형이 없다.)* motion.md 매핑이 둘 다 「유지」라 CSS 차이가 0인
  변형은 관찰할 것이 없다. Card에 있던 `@media (prefers-reduced-motion)` 블록은 정책과 반대로(색
  전환을 줄이던) 죽은 코드였고 **삭제만** 했다. 같은 이유로 Dialog · BottomSheet · RoundButton ·
  LearningUnit의 `@media` 블록도 지웠다 — Lynx는 미디어 특성을 지원하지 않아 어느 것도 픽셀을
  바꾸지 않았다. 이제 ui-lynx CSS 어디에도 `prefers-reduced-motion` 문자열이 없다(unit 테스트가
  0건을 고정한다). 추가된 CSS는 reduced 규칙 넷(RoundButton · LearningUnit `:active` `transform:
  none`, PageIndicator 항목은 색 전환만, SettingsCell knob `transition: none`)이고 기존 선언 수정은
  0이다.
- **값의 출처는 호스트 globalProps `reducedMotion: boolean` 하나**이고 `apps/mobile`의 `App.tsx`가
  `motionFromReducedMotion(reducedMotionFrom(useGlobalProps()))`로 `MotionProvider`를 `AppSession`
  밖에 세운다(모션은 세션 key와 무관한 호스트 상태). 다섯 화면은 `reducedMotion` prop을
  `resolveReducedMotion(prop, useMotion())`으로 한 번 결정해 아래로 흘린다. 호스트 쪽 키 계약은
  [ADR-0044](0044-android-tappable-inset.md) D1 아래 「후속 확장」이, 기기 확인은
  [`docs/e2e/motion-reduced.md`](../e2e/motion-reduced.md)가 진다.
- **파일 규약의 예외가 하나 늘었다.** `src/motion/`은 `typewriter`처럼 UI · CSS를 소유하지 않는
  공개 훅 디렉터리라 `<component>.contract.ts` · `.css` 계약 밖이다 —
  [`component-file-conventions.md`](../../packages/ui-lynx/docs/component-file-conventions.md).
  `check-pack` · 규약 unit test · index 통합 테스트가 그 예외를 이름으로 든다.
- 이 회차가 **열지 않은 것**(정본 motion.md의 뒤 단계): Spinner · Button Loading · 보상 · 화면
  전환(crossfade — iOS `prefersCrossFadeTransitions`를 그때 함께 본다) · 새 토큰. reduced에서
  Round Button · Learning Unit의 눌림 피드백이 0이 되는 것은 정본의 Pressed 정의(색 동일)에서 오는
  결과이고 design-system 쪽 결정으로 넘겼다 —
  [`docs/design/round-button.md`](../design/round-button.md) 「Reduced motion」. *(2026-10-09 주: Spinner ·
  Button Loading · 눌림 피드백은 같은 날 아래 「2단계」가 닫았다. 보상 · 화면 전환 · 새 토큰은 여전히
  뒤 단계다.)*
- **축 추적표에 새 행을 더하지 않는다** — 같은 「공유 ReactLynx 패키지와 브라우저 카탈로그」
  축이다. 재검토 조건의 「공개 컴포넌트가 10개를 넘을 때」와 무관하다(컴포넌트가 아니다).

#### 2026-10-09 2단계 — design-tokens 0.4.0 소비 · Spinner 회전 · Button Loading · reduced 눌림 막 · `lint:motion`

같은 package 경계 안에서 `@libitums/design-tokens`가 0.3.0 → **0.4.0**으로 오르며 생긴 motion 토큰
(`motion.scale.pressed` 0.95 · `scale.enter` 0.96 · `duration.spinner` 1000ms · `easing.linear` ·
`duration.reveal` 35ms · `opacity.pressed-shade` 0.08)을 소비한 delta다. 공개 컴포넌트는 늘지 않았고
새 ADR 번호도 아니다 — 위 절이 「열지 않은 것」으로 예고한 자리를 채우는 적용 기록이다. 기기 확인은
[`docs/e2e/motion-tokens.md`](../e2e/motion-tokens.md)가 진다.

- **눌림 · 등장 scale은 CSS 리터럴(`scale(0.95)` · `scale(0.96)`)을 유지하고 unit 테스트가 TS 토큰과
  숫자로 대조한다.** `transform` 함수 인자 안의 `var()`는 벤더링된 Lynx 문서에 없고 `calc()`는
  `transform`에서 명시적으로 미지원이다. 풀리지 않으면 선언 전체가 무효가 되어 **눌림 축소 자체가
  사라지는** 조용한 회귀라 안전한 쪽을 택했다(값이 토큰과 같아 픽셀 변화 0). 탐색(M2-I8)에서는
  **iOS 시뮬레이터가 `scale(var(--libitum-motion-scale-pressed))`를 풀었다**(눌림 95 %, 번들 안에
  `scale( {{--libitum-motion-scale-pressed}})`). 전환 조건: **Android에서도 풀리는 것을 같은 방법으로
  확인하면** 3단계(`scale.reward` keyframe이 새로 들어오는 작업)가 세 자리(Round Button · Learning Unit
  `:active`, Dialog enter/exit keyframe)를 `var()`로 바꾸고 unit 대조를 문자열 단언으로 교체한다.
  Android에서 안 풀리면 리터럴 + unit 대조가 영구 방식이다. `lint:motion`은 scale 값을 보지 않는다
  *(2026-10-10 주: 4단계부터 본다 — `scale-literal` 규칙, [ADR-0053](0053-motion-policy.md) D1)* —
  재발 방지는 unit 대조가 진다(대조 목록 밖의 새 자리는 잡지 못한다). *(2026-10-09 주: iOS는 M2-I8로
  풀렸고 Android는 3단계의 M3-A8이 쟀다 — **풀림**(눌림 56 → 52 px, 리터럴과 같은 값), 문항 등장의
  `translateX(var())`도 x 오프셋이 보였다(M3-A3 (b)). 결과는 [`docs/e2e/motion-reward.md`](../e2e/motion-reward.md)
  결과 표. 3단계는 전환하지 않고 리터럴을 유지했다 — 아래 「3단계」.)* *(2026-10-10 주: 4단계에서
  전환했다 — 다섯 자리 `var(--libitum-motion-scale-…)`, 항등 `scale(1)`만 리터럴, unit은 문자열 단언 + 비항등
  리터럴 0. keyframe 본문 `var()`는 iOS 탐색으로 풀림, Android는 e2e 회귀 행이 게이트 — ADR-0053 D6.)*
- **Spinner는 `@keyframes ui-lynx-<component>-spin`(`rotate(0deg)` → `rotate(360deg)`)을 loading 선택자에
  `var(--libitum-motion-duration-spinner) var(--libitum-motion-easing-linear) infinite`로 건다.** 정적 블록은
  byte 불변이다. 상단 투명(틈) 규칙은 variant 색 규칙(0,3,0)에 지지 않도록 같은 특이도로 **파일 끝**에
  둔다 — Round Button은 (0,1,0)이라 져서 틈 없는 원이었고 Button에는 규칙 자체가 없었다(둘 다
  회전해도 보이지 않는 상태). Lynx는 특이도 · 순서를 Web대로 적용한다.
  - **끝없는 회전은 WCAG 2.2.2의 essential 예외다.** 자동 시작이 아니라 사용자가 시작한 요청
    (login · verification · feedback의 requesting · verifying · sending)의 **유일한** 진행 표시이고,
    정지 수단 대신 완료로 끝나며(정본 `motion.md` Reduced motion 표 「진행 중임을 알리는 유일한 수단」 ·
    `button.md`), 12px 선 하나라 주의를 빼앗는 정도가 작다. 플랫폼 선례(iOS `UIActivityIndicatorView`)도
    Reduce Motion에서 멈추지 않는다. 그래서 **reduced에서도 유지**한다(2.3.3 AAA의 「필수 정보」 예외) —
    reduced 규칙에 spinner · `animation` 선언을 두지 않는다. 조건: 이 판단은 「Loading은 반드시
    끝난다」에 기대어 있다. 타임아웃 없는 요청 경로가 생기면 2.2.2보다 먼저 그 화면의 오류 처리
    문제다. VN continue indicator의 bounce 제거(아래)로 standard에서 멈출 수 없던 끝없는 움직임이
    하나 줄었다 — 2.2.2 축의 개선.
- **Button Loading은 라벨 · 아이콘을 흐름에 둔 채 `visibility: hidden`으로 숨기고 spinner wrap을
  surface 안 절대 배치 중앙에 둔다.** *(2026-10-11 주: 숨김은 inline `opacity: 0`, 래퍼는 네 변 `0` 대신
  `width/height: 100%`로 바뀌었다 — Lynx iOS에서 `<text>`의 `visibility: hidden`이 글자를 지우지 않았고 네 변 `0`이
  `fill` surface에서 서지 않았다. 산식 「Loading = Default 너비 그대로」는 그대로다. [ADR-0053](0053-motion-policy.md)
  정정 기록 1.)* 정본 산식 「Loading = Default 너비 그대로」를 측정 없이 지키는
  유일한 길이다(같은 자식이 같은 레이아웃을 차지한다). 계약 객체에 `contentVisibility: "visible" |
  "hidden"` 필드가 하나 늘었다 — 위 절의 「contract 객체에 필드를 더하지 않는다」는 RoundButton ·
  LearningUnit의 `toEqual` 보호였고 Button에는 그 제약이 없다. 기존 `column-gap: spacing-6`과 숨긴
  라벨의 색 규칙은 지웠다. 접근성 이름 `"<label>, loading"`은 그대로이고 숨긴 `<text>`는 iOS에서
  `view.hidden` + 루트 `isAccessibilityElement`로 정지점이 되지 않는다(Android는 실기 확인 항목).
- **reduced 눌림 막은 surface 첫 자식 `<view class="<block>-shade">`이고 reduced에서만 렌더한다.**
  토큰만으로 「black 8%」를 만드는 CSS는 Lynx에서 자식 요소뿐이다 — `rgba()`는 생값, `color-mix()` ·
  `filter` · `::after`는 미지원. `background-color: var(--libitum-color-black)`과
  `opacity: var(--libitum-opacity-pressed-shade, 0.08)`을 따로 주고 `:active`에서 `duration.pressed` ·
  `easing.easing`으로 켠다. 렌더 조건은 순수 함수 `hasPressedShade`(Round Button: overlay 제외,
  Learning Unit: `default` 제외)이고 contract 객체는 그대로다. standard DOM · CSS는 byte 불변. 위 절의
  「눌림 피드백 0」과 1단계 접근성 지적 R1은 이것으로 닫혔다. 막 위 아이콘 대비(Neutral 2.693:1)는
  정본의 승인 예외 행을 기다린다 — [`docs/design/round-button.md`](../design/round-button.md).
- **VN continue indicator의 bounce · `indicatorMotion` 필드 · `VisualNovelDialogIndicatorMotion` 타입 ·
  `data-motion` · `-indicator-{motion}` 클래스를 전부 걷었다.** 정본 0.4.0 「애니메이션 없음」. 값이
  `static` 하나뿐인 필드와 그 관찰 채널은 뜻이 없다. 공개 contract 필드 하나가 사라졌지만 타입은
  패키지 밖으로 재수출된 적이 없고 저장소 소비처는 테스트뿐이었다. standard DOM이 바뀐
  유일한 자리(클래스 토큰 하나 · 속성 하나)다.
- **`motionDurationMs`는 `motion` 모듈의 순수 함수이고 `useTypewriter`의 기본값은
  `defaultRevealIntervalMs = motionDurationMs(motion.duration.reveal)`이다.** 토큰의 duration이
  문자열(`"35ms"`)이라 파싱이 한 번 필요하고, 모션 값의 변환은 모션 모듈의 관심사다. 잘못된 문자열은
  던진다 — 토큰은 빌드 시 상수라 런타임에 잘못될 수 없고 조용한 NaN은 `setInterval(NaN)`으로 번진다.
- **`lint:motion`(`devtools/motion-literals/`)은 CSS 선언 단위 검사다.** `transition*` · `animation*`
  선언에서 `var(--libitum-…)` 참조를 지운 나머지에 시간 리터럴 · `cubic-bezier()` · easing 키워드가
  있으면, 그리고 `@media`가 있으면 실패한다(`display: linear` · `linear-gradient()` · keyframe 본문은
  대상 밖). `pnpm lint`의 사슬 끝에 들어가고 `pnpm test`가 `test:motion-literals`를 부른다 — ci-wiring ·
  verify.yml 변경 0. allowlist(`allowlist.json`)의 유일한 항목은 episode-narrative 배경 연출(Content
  예외 — 사유 문장이 allowlist 자체에 있다)이고, 없는 파일 · 위반 0인 항목은 실패다. *(2026-10-10 주:
  4단계부터 `transform`의 비항등 `scale*()` 리터럴(`scale-literal`)과 `.ts` · `.tsx` inline style의 모션
  리터럴(객체 리터럴 속성의 문자열 값 · JSX `style="…"`)도 본다 — [ADR-0053](0053-motion-policy.md) D1.)*
- **축 추적표 · 색인 행은 그대로다** — 같은 축의 적용 기록이고 새 결정이 아니다.

#### 2026-10-09 3단계 — 보상 모션(통과 배지) · 문항 전환 등장 · custom 화면 전환 0 · 2단계 이월(R2 · `var()`)

같은 경계 안에서 0.4.0 motion 토큰 가운데 **보상 · 전환** 자리의 것(`duration.reward` 400ms ·
`easing.enter-expressive` · `scale.reward` 0.8 · `duration.page` 300ms · `easing.enter`, 이동 거리는
`spacing-16`)을 `apps/mobile`이 처음 소비한 delta다. 공개 컴포넌트는 늘지 않았고 ui-lynx의 변경은
RoundButton 막의 접근성 속성 한 줄 **삭제**뿐이다. 새 ADR 번호가 아니다 — 위 두 절이 「뒤 단계」로
넘긴 보상 · 화면 전환 자리를 닫거나(보상 · 문항 전환) 사유를 적고 미룬(custom 화면 전환) 적용
기록이다. 기기 확인은 [`docs/e2e/motion-reward.md`](../e2e/motion-reward.md)가, 번들 수치는
[성능 보고서](../performance/reports/motion-tokens-stage3-app-launch-iphone-17-pro-simulator-01.md)가
진다.

- **보상 요소는 lesson-complete의 통과 배지 하나다. 미통과 배지는 모션 0, 재화 획득 모션은 자리가
  없어 적용하지 않았다.** 정본 `motion.md` 학습 흐름 표의 expressive는 「학습 단위를 끝냄 · 재화를
  얻음」(성취)에만 있고 `LESSON FAILED`는 성취가 아니다 — 미통과 배지는 클래스 · 속성이 지금과 byte
  동일하다. 재화는 **코드에 획득 순간이 없다**: `gemCount`는 setter 없는 `useState`이고, 보상 카드의
  `+ 0 REWARD`는 placeholder(`lessonRewardPlaceholder`)이며, 상단 바의 젬 칩은 구매가 준비될 때까지
  숨긴다. 그 카드는 배지와 **같은 화면**이라 「Expressive는 한 화면에서 한 번」에도 걸린다. 조건:
  젬 지급 규칙이 생겨 그 수가 실제로 갱신되거나 젬 칩이 서는 날, 「배지와 한 묶음(같은 keyframe)」인지
  「그 요소 단독」인지를 정본에 묻고 그때 연다. 판정은 순수 함수 `rewardMotionFor(verdict, motion)`
  (`"expressive"` · `"fade"` · `"none"`)이고 `LessonCompleteScreen`이 `useMotion()`으로 모드를 읽는다 —
  ui-lynx `motion`을 직접 쓰는 첫 앱 화면이다.
- **「화면당 한 번」은 배지 클래스가 `(verdict, motion)`의 순수 파생이라는 사실로 보장한다 — ref ·
  phase · `key`가 없다.** `verdict`는 라우트에 실려 화면과 함께 죽고 `motion`은 호스트 globalProps라
  바뀌면 트리가 통째로 다시 선다. 그래서 마운트부터 언마운트까지 `className` 문자열이 같고 Lynx는 같은
  `animation` 선언을 다시 시작하지 않는다(`AppSession`의 젬 · 진행 · inset 재렌더는 클래스를 바꾸지
  않는다 — ui 테스트가 재렌더 전후 요소 동일성으로 고정). 반복을 막는 코드를 두면 「왜 있는가」를 다음
  사람이 다시 묻는다. keyframe의 `scale(0.8)`은 2단계 D1과 같은 정책(리터럴 + unit이 `motion.scale.reward`와
  대조)이다 — 아래 `var()` 항목.
- **`exit-expressive` 퇴장은 적용하지 않았다 — 나가기 · 다시 풀기 · 시스템 뒤로가기는 즉시 핸들러 1회다.**
  이 화면의 모든 「다음 입력」이 화면 자체를 떠나는 것이라(`renderScreen`이 다른 element를 돌려주는
  순간 배지가 언마운트된다) 배지만의 400ms 퇴장을 보이려면 내비게이션을 400ms 늦춰야 한다. 정본의
  「보상 motion 중에도 다음 입력을 받는다. 다음 버튼을 누르면 보상 요소는 즉시 사라진다」는 보상이
  입력을 **막지 않는다**는 뜻이고 지연을 요구하지 않으며, 앱 어디에도 퇴장 모션을 기다리는 자리가 없고
  (`LearningShell`은 Dialog `exiting`을 쓰지 않고 바로 `onExit`), 탭 직후 동기 단언인 통합 테스트
  25자리를 전부 비동기로 바꾸는 회귀 비용이 크다. 「맵으로 가는 길을 400ms 늦추더라도 퇴장을 보이자」가
  답이면 4단계에서 `leave(action)` 꼴로 연다 — 사용자 결정 대기.
- **문항 전환은 `LearningShell`의 무대(`learning-shell-stage`)와 작업 영역(`learning-shell-scroll`)에만
  붙는 `transition` 기반 3상 기계이고, 퇴장이 없다.** 순수 리듀서(`question-transition.ts`)가
  `idle → primed → entering → idle`을 돌린다 — `primed`는 새 내용이 보이지 않는 시작값
  (`opacity: 0; transform: translateX(var(--libitum-spacing-16)); transition: none`), `entering`은 정착값으로
  가는 전환(`page` · `enter`), reduced는 `transform: none` + `opacity`만 `d2` · `linear`. 트리거는 키
  `complete ? "complete" : String(questionIndex)`의 변화이고 완료 장면도 전환한다(정본 「다음 문제 ·
  장면」). 인덱스 0 마운트는 idle(화면 push에 전환을 걸지 않는다), 인덱스 > 0 마운트는 primed(Writing이
  문항마다 껍데기를 다시 세우는 길). 전환 중 재입력은 `entering`을 **유지**해 현재 값에서 이어간다(정본
  원칙 2). 종료는 **타이머**다 — `bindtransitionend`는 벤더된 Lynx 문서에도 저장소에도 없고,
  `motionDurationMs(page | d2)` 타이머는 테스트에서 결정적이며 `advance` 자물쇠의 fake timer 케이스와
  간섭하지 않는다. 머리 · 세션 헤더 · 진행 바 · 지시문 · 액션 행 · 넘김 층 · Dialog에는 클래스가 붙지
  않고 `advance` 자물쇠 · `runAdvance`는 byte 불변이다. 관찰 채널은 `data-page="primed" | "entering"`과
  reduced일 때만 `data-motion="reduced"`(조건부 spread — 위 절의 같은 이유).
  - **퇴장이 없는 이유**: 옛 문항을 300ms 더 보이면 그 동안의 탭이 옛 문항에 간다 — 「전환 중 입력이
    다음 문항에 간다」와 양립하지 않는다. 새 내용은 즉시 DOM에 서서 입력을 받고 불투명도만 올라온다.
    정본 짝 규칙(「나타남과 사라짐은 같은 시간」)은 사라짐이 **없는** 전환에는 걸리지 않는다고 읽었다 —
    「내용이 즉시 바뀌는 전환은 등장만」을 플랫폼 매핑 행에 적을지는 design-system에 묻는다. 옛 내용의
    사라짐을 보이고 싶다면(새 문항이 150ms 늦게 서는 대가) 4단계에서 다시 본다.
  - **배치는 `LearningShellBody.tsx`가 진다.** `LearningShell.tsx`가 295줄이라 훅 · 클래스 · 속성을 더하면
    `max-lines` 300을 넘어, 무대 · 작업 영역 배치 분기를 떼어 거기서 전환 클래스 · 속성을 붙인다.
    DOM · testid · 순서는 byte 불변이고 props는 최소(`card` · `workspace` · `scrollCard` ·
    `workspaceScrolls` · `transition`)다. 카드 스크롤 모드(말하기)에서는 바깥 `scroll-view` 하나에만 붙인다 —
    안의 무대에도 붙이면 불투명도가 곱해진다.
  - **iOS에서 `opacity` 전환 중 보조기술은 무대 · 작업 영역을 건너뛴다 — 「접근성 트리 불변」이 아니다.**
    Lynx iOS의 `opacity`는 `view.layer.opacity`(모델 레이어)에 쓰고(Pod 4.0.1 `ui/LynxUI.m` 2185~2203행),
    `transition`이 선언돼 있으면 세터가 CA 애니메이션으로 넘기고 **모델값은 완료 콜백에서야** 쓰며
    (`animation/LynxTransitionAnimationManager.m` 157~181행, 콜백 178행), 그 애니메이션은
    `removedOnCompletion NO` · `fillMode both`로 **표시 레이어만** 0 → 1을 그린다
    (`animation/LynxAnimationUtils.m` 33~41행). 즉 entering 동안(standard 300ms · reduced 100ms) 두 뷰의
    `alpha`는 0에 머물고 UIKit 보조기술은 alpha 0 뷰를 `hidden`처럼 건너뛴다(UIKit 관례 — 저장소 밖
    추론). VoiceOver가 켜져 있으면 Lynx가 레이아웃마다 `UIAccessibilityLayoutChangedNotification`을
    쏘므로(`ui/LynxUIOwner.m` 1036~1042행) 문항 교체 직후의 초점 재평가가 그 창 안에서 일어난다 — 초점이
    새 문항이 아니라 세션 헤더 · 액션 행 · 넘김 층에 설 수 있다. 내용은 뷰 계층에 남고 끝나면 돌아온다
    (모델값 1 복귀). 터치는 alpha와 무관하다(`shouldHitTest`는 `hidden` · `userInteractionEnabled` ·
    `window`만 본다 — M3-I4가 전환 중 tap이 새 장면에 가는 것을 확인). 교체 뒤 초점 복원은
    [ADR-0016](0016-assistive-technology-semantics.md) D8의 축이고 실기 항목은 `motion-reward.md` M3-I8 ·
    M3-A7이다. Android는 AAR뿐이라 미확인. **4단계 조건**: M3-I8이 「초점이 매번 무대 밖에 선다」고
    적으면 D8 경로(교체 뒤 새 문항 내용으로 초점 통지)를 연다. 전환을 걷거나 `opacity` 시작값을 0.01로
    두는 우회는 실기 근거가 있을 때만 검토한다.
  - **기기 관찰의 한계 — 이 빌드에는 문항이 둘 이상인 유닛이 없다.** 그래서 「문항 1 → 2」 대신 같은
    상태 기계의 `complete` 키 경로(문항 → 완료 장면)로 등장을 판정했다(iOS: 중간 프레임 ≥ 14장 · x 오프셋
    12.7 css px · 정착 ≈ 296ms, reduced는 오프셋 0 · ≈ 88ms). 완료 장면에는 작업 영역이 없어
    `<scroll-view>` 자체에 건 전환은 **관찰되지 않았다** — 문항이 둘 이상인 유닛이 생기면 M3-I3의 작업
    영역 부분을 다시 본다.
  - **테스트 렌더러는 한 번 붙은 `data-*`를 조건부 spread에서 빠진 재렌더에서 지우지 않는다.** idle
    복귀 뒤 클래스는 base로 돌아오지만 `data-page`가 `"entering"`으로 남는다. 그래서 ui 테스트의 idle
    복귀는 **클래스 정확 일치**로만 판정한다. CSS는 클래스만 보므로 기기 동작과 무관하고, 관찰 채널
    `data-page`는 primed · entering 두 값만 뜻을 갖는다.
- **custom 화면 전환은 걸지 않았다 — 이 앱의 화면 전환은 0이다.** `AppSession`은 스택 최상단 **하나**만
  그리고 이전 화면은 즉시 언마운트돼 퇴장을 걸 요소가 없다. `Nav`는 방향을 모른다(`navReducer`는 결과
  스택만 남긴다 — push/pop을 상태에 더하면 [ADR-0007](0007-app-internals-state-routing-data-errors.md) D3의 「파생
  가능한 값을 두 번 두지 않는다」에 걸린다). `AppSession.tsx`는 정확히 300줄이다. 등장만 거는 반쪽 전환은
  짝 규칙과 어긋나고, 스플래시 · 로그인 · 전체 화면을 포함한 **모든** 화면의 첫 프레임을 바꿔 e2e 캡처와
  성능 보고서(앱 실행 `__lynx_timing_flag`)의 비교선을 흔든다. 정본 「플랫폼이 제공하는 기본 전환을 쓸
  때는 플랫폼 값을 바꾸지 않는다」 — 이 앱은 플랫폼 내비게이션을 쓰지 않으므로 `page`의 「custom push ·
  pop」 행은 스택 전환기를 갖는 날의 것이다. **4단계 설계 후보(결정 아님)**: 들어오는 화면만 crossfade
  (`page` · `enter`, reduced `d2` · `linear`), `renderScreen` 결과를 감싸는 `app-screen` 호스트(`key` = 화면
  정체 → 재마운트 등장, 별 컴포넌트로 추출), outgoing layer 없음, 제외 목록(탭 전환 · 스플래시 · 서사 ·
  VN — 들어오는 화면 이름으로 판정), 방향은 쓰지 않는다. 선행: `AppSession` 300줄 해소, 짝 규칙 예외를
  정본에 묻기, e2e · 성능 기준선 재설정.
- **scale `var()` 전환은 4단계다 — 이번 PR은 리터럴을 유지했다.** 2단계 「전환 조건」의 Android 확인은
  이 작업의 e2e 탐색 항목 M3-A8(dev 번들로 `round-button.css`의 눌림 scale을 `var()`로 바꿔 관찰)과
  M3-A3 (b)(문항 등장 `translateX(var())`의 x 오프셋 유무)가 함께 적는다. 결과는 `motion-reward.md`
  결과 표가 정본이고 여기 수치를 되풀이하지 않는다. 풀리면 세 자리(Round Button · Learning Unit `:active`,
  Dialog keyframe)와 보상 keyframe의 `var()` 전환 · unit 문자열 단언이 **4단계 첫 묶음**이다 — 같은 PR
  안에서 e2e 뒤 구현을 한 번 더 도는 루프를 두지 않는다. 안 풀리면 리터럴 + unit 대조가 영구이고 그
  사실을 이 소절에 적는다. 안 풀릴 때 `translateX(var())` 선언만 무효가 되어 이동 없는 fade로 조용히
  열화한다(불투명도 선언은 별도 줄) — 회귀가 아니다. **결과(2026-10-10 Android 회차)**: M3-A8 풀림(눌림 56 → 52 px, 리터럴과
  같은 값) · M3-A3 (b) x 오프셋 있음 — iOS(2단계 M2-I8)와 합쳐 두 플랫폼 모두 `transform` 안 `var()`를 푼다.
  따라서 4단계 첫 묶음은 「전환」이다. *(2026-10-10 주: 전환했다 — Round Button · Learning Unit `:active`,
  Dialog enter from · exit to, 배지 reward from의 다섯 자리. 일반 규칙과 달리 `@keyframes` 본문 안 `var()`는
  기기 기록이 없어 구현 전 iOS 탐색으로 Dialog · 배지 둘 다 풀림을 봤고, Android는 4단계 e2e 회귀 행이
  게이트다 — [ADR-0053](0053-motion-policy.md) D6.)*
- **R2 — RoundButton 막의 `accessibility-elements-hidden`을 지웠다.** 막은 자손 · 라벨 없는 잎 `<view>`라
  세터(자손 가림)가 무동작이고, [ADR-0016](0016-assistive-technology-semantics.md) D5 「잎에는 붙이지 않는다.
  붙여도 아무 일도 하지 않는다」에 맞춰 Learning Unit의 같은 막과 모양을 맞췄다. D5 예외(D9 scrim)의
  근거는 hit-testing인데 막은 `:active`가 루트에 걸리고 탭은 버블로 받아 그 근거가 없다 — 예외로 적지
  않고 삭제했다. 동작 차이 0(M3-I6이 R2 뒤에도 막 색 · 눌림 95 %가 같음을 확인). 2단계가 더했던 잎
  부착 한 줄이 사라져 D5의 「저장소에 남은 잎 부착 0건」 장부가 다시 맞는다. 자손이 `<svg>` · `<view>`뿐인
  래퍼 부착은 그 장부가 세지 않은 꼴이다 — 이 화면의 배지 래퍼(자손 `<svg>` 하나)는 PR 리뷰 지적으로 같은
  PR에서 지웠고(동작 차이 0, 단언 없음), Button spinner wrap · RoundButton loading · icon 래퍼는 4단계
  첫 묶음 후보. *(2026-10-10 주: 4단계가 그 셋과 Learning Unit의 잎 링 `<svg>` · surface · badge 셋을
  지웠다 — [ADR-0053](0053-motion-policy.md) D7. 장부 문장의 「다시 맞는다」는 잎을 다 센 것이 아니었다 —
  [ADR-0016](0016-assistive-technology-semantics.md) D5의 2026-10-10 주가 남은 12자리를 센다.)*
- **번들**: main `+4,847 bytes`(1,397,447 → 1,402,294, 상한 1,412,000 안), ui-lynx dist `−71 bytes`(R2 한 줄).
  `budget.json` 변경 0.
- **축 추적표 · 색인 행은 그대로다** — 같은 축의 적용 기록이고 새 결정이 아니다.

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
