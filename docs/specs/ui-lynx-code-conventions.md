# 작업 스펙: UI Lynx 컴포넌트 파일 컨벤션 통일

상태: 요구사항 승인 및 계약 재고정 완료, 구현 전
기준점: `main` `a8316a4ba0748b95aae40e10a37a562486176b66`

## 목적 (goal)

`@libitums/ui-lynx`의 여덟 공개 ReactLynx 컴포넌트를 저장소 문서와 같은 파일 구조로
통일하고 자동 검증해, 작성자와 검증자가 파일 역할·공개 산출물을 추측하지 않게 한다.

## 타깃 (target)

- 디바이스: 기존 `@libitums/ui-lynx` 소비 범위인 iOS/Android Lynx Host
- 브라우저 하한: 기존 `apps/storybook-lynx`의 Lynx Web 검증 범위. 새 브라우저나 하한은
  추가하지 않는다.

## 디자인 (design_ref)

DESIGN.md 표준과 `docs/design/ui-lynx-code-conventions.md`의 시각 비변경 계약을 따른다.
벗어남: 없음. 토큰·CSS·JSX·상태·접근성·상호작용 계약을 바꾸지 않는다.

## 범위

- 포함(scope_in): `packages/ui-lynx`의 component-local contract/logic/test 파일명과 내용
  합치기, 내부 상대 import와 barrel 갱신, build/pack 산출물 기대값, 파일 규칙 자동 검사,
  repository layer test scripts와 하네스 profile 범위 정합화, 영향 문서 갱신
- 제외(scope_out): props/type 의미, 순수 함수 결과, root/subpath 공개 export 이름과 값 identity,
  package export subpath, JSX render tree, CSS 선언·token, `data-testid`, 접근성 속성, 이벤트,
  Storybook story/bridge, 모바일 앱 기능, 의존성 및 측정 이벤트 변경

## 수용 기준 (acceptance_criteria)

1. §2의 15개 before→after rename/merge가 정확히 적용되고, 여덟 component directory에
   `contract.ts`, `logic.ts`, kebab-case component test, `index.ui.test.tsx`가 0개다.
2. 각 component directory는 `<Component>.tsx`, `<component>.contract.ts`,
   `<component>.css`, `index.ts`, `<Component>.ui.test.tsx`를 가지며, runtime contract가 있는
   컴포넌트만 `<Component>.unit.test.ts`를 가진다.
3. §3의 public value/type export 집합, root와 subpath value identity, `package.json`의 모든
   export/subpath와 side-effect CSS 경로가 기준점과 동일하다.
4. `check-pack.mjs`와 package integration test는 모든 컴포넌트의 canonical contract
   `.js/.d.ts`를 요구하고 generic `contract.*`/`logic.*` 산출물을 금지한다. packed JSX는
   `.jsx`로 보존되며 source/test/script가 tarball에 들어가지 않는다.
5. §5의 파일 규칙 검사 단위 테스트는 root `pnpm test:unit`에서 현재 드리프트를 이유로
   assertion 2건이 실패해 legitimate red가 확인됐다. structural logic 구현 후 실제 tree에서
   위반 0을 반환한다.
6. `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, 새 root `pnpm test:unit`,
   `pnpm test:ui`, `pnpm test:integration`, `pnpm test`, `pnpm build`가 모두 통과한다.
7. 구현 전후 모든 `data-testid` 문자열, JSX/CSS 의미 diff, component props/type 의미와 순수
   함수 입출력이 동일하다. snapshot/기대값 완화로 통과시키지 않는다.
8. repository profile의 `test.unit/ui/integration`이 새 root layer scripts를 호출해 mobile,
   ui-lynx 및 해당 Storybook integration을 빠짐없이 실행한다. profile 갱신 전의 하네스
   layer 결과는 완료 증거로 인정하지 않는다.

## 측정 (measurement)

없음: 내부 파일·검증 컨벤션 정리이며 출시 후 사용자 사용 여부를 측정할 기능이 아니다.

## 제약 (constraints)

- Node `>=22.12 <23`, pnpm `10.34.5`, 현재 고정된 TypeScript/Vitest/oxlint/oxfmt를 사용한다.
- 파일 이동과 contract/logic의 물리적 합치기만 허용한다. export declaration과 함수/type
  본문은 의미 변화 없이 옮긴다.
- 디자인 문서는 design 역할이 별도 갱신한다. 구현·문서 역할은
  `docs/design/ui-lynx-code-conventions.md`를 수정하지 않는다.
- Git merge/cherry-pick/commit/push 및 브랜치 산출물 복사는 범위 밖이다.

## 시각 레퍼런스 (visual_reference)

기준점의 기존 컴포넌트와 Storybook 화면. pixel·layout·motion 변경은 0이어야 한다.

## 우선순위 / 데이터 (선택)

- 우선순위: 공개/사용자 계약 보존 > 자동 검출 가능한 일관성 > 작은 diff
- 데이터: API·상태·fixture 변경 없음

## 비고

- [추론] 표시 항목: 없음. 최신 main 정본, 통일 규칙, 비변경 축과 profile 조사 요구가
  사용자 브리프에 명시됐다.
- 이전 스펙의 `packages/ui-lynx` 부재 전제와 mobile lint 62-warning 범위는 폐기한다.
- 필수 슬롯 7/7이 채워졌고 미해결 제품 요구사항은 없다. repository profile 선행조건은
  §7의 worktree-local 생성·validator 통과로 해소됐다.

## 1. 최신 main 정본과 전수 조사 결과

정본은 HEAD `a8316a4ba0748b95aae40e10a37a562486176b66`의 다음 항목이다.

- `packages/ui-lynx/docs/component-file-conventions.md`
- `packages/ui-lynx/src/{back-header,bottom-navigator,button,page-indicator,progress-header,round-button,status-indicator,step-indicator}/`
- `packages/ui-lynx/src/index.ts`, `packages/ui-lynx/src/index.integration.test.ts`
- `packages/ui-lynx/package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`
- `packages/ui-lynx/scripts/{check-pack,clean-dist,copy-styles}.mjs`
- root `package.json`, `apps/mobile/package.json`, `apps/storybook-lynx/package.json`
- `docs/adr/0006-command-interface-and-test-layers.md`,
  `docs/adr/0025-ui-lynx-package-and-storybook-catalog.md`, `docs/conventions/code.md`

문서 규칙은 공개 타입과 순수 계약 로직을 `<component>.contract.ts` 하나에 두고,
component test basename을 PascalCase로 요구한다. 현재 상태는 다음과 같다.

| 컴포넌트 | contract 구조 | unit 이름 | UI 이름 | 판정 |
|---|---|---|---|---|
| BackHeader | `contract.ts` | 없음(순수 runtime 없음) | `index.ui.test.tsx` | contract/UI 위반 |
| BottomNavigator | `contract.ts` + `logic.ts` | kebab-case | kebab-case | 4축 위반 |
| Button | `contract.ts` + `logic.ts` | kebab-case | `index.ui.test.tsx` | 4축 위반 |
| PageIndicator | `page-indicator.contract.ts` | PascalCase | PascalCase | 준수 |
| ProgressHeader | `contract.ts`에 타입+함수 | PascalCase | PascalCase | contract 이름 위반 |
| RoundButton | `round-button.contract.ts` | PascalCase | PascalCase | 준수 |
| StatusIndicator | `contract.ts` + `logic.ts` | kebab-case | `index.ui.test.tsx` | 4축 위반 |
| StepIndicator | `step-indicator.contract.ts` | PascalCase | PascalCase | 준수 |

`src/styles.unit.test.ts`와 `src/index.integration.test.ts`는 component-local test가 아니라
package aggregate contract test이므로 PascalCase component basename 규칙의 대상이 아니다.

## 2. exact before→after rename/move/merge map

### 2.1 contract/logic

| before | after | 방식 |
|---|---|---|
| `back-header/contract.ts` | `back-header/back-header.contract.ts` | rename, type 본문 동일 |
| `bottom-navigator/contract.ts` | `bottom-navigator/bottom-navigator.contract.ts` | 타입을 기준 파일로 이동 |
| `bottom-navigator/logic.ts` | `bottom-navigator/bottom-navigator.contract.ts` | 두 함수를 같은 파일에 병합, old file 삭제 |
| `button/contract.ts` | `button/button.contract.ts` | 타입을 기준 파일로 이동 |
| `button/logic.ts` | `button/button.contract.ts` | 두 함수를 같은 파일에 병합, old file 삭제 |
| `progress-header/contract.ts` | `progress-header/progress-header.contract.ts` | rename, 타입·함수 본문 동일 |
| `status-indicator/contract.ts` | `status-indicator/status-indicator.contract.ts` | 타입을 기준 파일로 이동 |
| `status-indicator/logic.ts` | `status-indicator/status-indicator.contract.ts` | const·함수를 같은 파일에 병합, old file 삭제 |

### 2.2 component tests

| before | after |
|---|---|
| `back-header/index.ui.test.tsx` | `back-header/BackHeader.ui.test.tsx` |
| `bottom-navigator/bottom-navigator.unit.test.ts` | `bottom-navigator/BottomNavigator.unit.test.ts` |
| `bottom-navigator/bottom-navigator.ui.test.tsx` | `bottom-navigator/BottomNavigator.ui.test.tsx` |
| `button/button.unit.test.ts` | `button/Button.unit.test.ts` |
| `button/index.ui.test.tsx` | `button/Button.ui.test.tsx` |
| `status-indicator/status-indicator.unit.test.ts` | `status-indicator/StatusIndicator.unit.test.ts` |
| `status-indicator/index.ui.test.tsx` | `status-indicator/StatusIndicator.ui.test.tsx` |

이동 후에도 테스트 case 이름·assertion·fixture·event 의미는 동일하다. 본문 차이는 아래 필요한
contract import 경로 변경과 lint-only 구문만 허용한다. `BackHeader.ui.test.tsx`의 2개 및
`Button.ui.test.tsx`의 2개 callback mock은 `vi.fn()`에서 `vi.fn<() => void>()`로 바꿔
`vitest/require-mock-type-parameters`를 만족한다. 이는 type-only 차이이며 runtime 호출·기대값을
바꾸지 않는다.

### 2.3 import/export 갱신

- `BackHeader.tsx`, `back-header/index.ts`: `./contract` → `./back-header.contract`
- `BottomNavigator.tsx`: `./contract`와 `./logic` → `./bottom-navigator.contract` 하나
- `bottom-navigator/index.ts`: 모든 type/value 재수출 source를
  `./bottom-navigator.contract` 하나로 변경
- `BottomNavigator.unit.test.ts`: type/function import를 같은 canonical contract로 변경
- `Button.tsx`, `button/index.ts`: `./contract`와 `./logic` → `./button.contract` 하나
- `ProgressHeader.tsx`, `progress-header/index.ts`, `ProgressHeader.unit.test.ts`:
  `./contract` → `./progress-header.contract`
- `StatusIndicator.tsx`, `status-indicator/index.ts`: `./contract`와 `./logic` →
  `./status-indicator.contract` 하나

`packages/ui-lynx/src/index.ts`는 component barrel만 소비하므로 내용 변경이 필요 없다.
Storybook과 외부 소비자는 source 내부 경로를 사용하지 않으므로 import 변경이 없다.

## 3. public contract 불변식

### 3.1 값·타입 export

| subpath | public values | public types |
|---|---|---|
| `button` | `Button`, `getButtonContract`, `getButtonIconColor` | `ButtonContract`, `ButtonProps`, `ButtonSize`, `ButtonVariant`, `ButtonWidth`, `IconPosition` |
| `back-header` | `BackHeader` | `BackHeaderProps` |
| `status-indicator` | `StatusIndicator`, `getStatusIndicatorLabel`, `statusIndicatorNames` | `StatusIndicatorProps`, `StatusIndicatorStatus` |
| `round-button` | `RoundButton`, `getRoundButtonContract`, `getRoundButtonForegroundColor` | `RoundButtonContract`, `RoundButtonProps`, `RoundButtonSize`, `RoundButtonVariant` |
| `progress-header` | `ProgressHeader`, `getProgressHeaderProgress` | `ProgressHeaderMotion`, `ProgressHeaderProgress`, `ProgressHeaderProps` |
| `page-indicator` | `PageIndicator`, `PAGE_INDICATOR_MAX_PAGE_COUNT`, `getPageIndicatorModel` | `PageIndicatorItem`, `PageIndicatorModel`, `PageIndicatorProps` |
| `bottom-navigator` | `BottomNavigator`, `getBottomNavigatorContract`, `getBottomNavigatorContracts` | `BottomNavigatorBadge`, `BottomNavigatorContract`, `BottomNavigatorCountBadge`, `BottomNavigatorDotBadge`, `BottomNavigatorDisabledItem`, `BottomNavigatorEnabledItem`, `BottomNavigatorItem`, `BottomNavigatorItemContract`, `BottomNavigatorProps` |
| `step-indicator` | `StepIndicator`, `getStepIndicatorContract` | `StepIndicatorContract`, `StepIndicatorProps`, `StepIndicatorStep`, `StepIndicatorStepStatus` |

Root `@libitums/ui-lynx`는 위 집합을 그대로 재수출한다. 모든 root value는 대응 subpath
value와 `toBe` identity가 같아야 한다. 함수 signature, discriminated union member,
literal 범위, optional/readonly 여부는 바꾸지 않는다.

### 3.2 package/export/visual/behavior

- `package.json`의 root 및 여덟 component subpath, component CSS subpath,
  `./styles.css`, `./package.json` 경로는 변경하지 않는다.
- `main/module/types`, peer/dependency range, `sideEffects` 목록은 변경하지 않는다.
- `.tsx`는 type-erased preserved JSX인 `dist/<component>/<Component>.jsx`로 남는다.
- component contract 산출물만 `dist/<component>/<component>.contract.{js,d.ts}`로
  통일한다. generic `contract.*`와 `logic.*`는 더 이상 산출하지 않는다.
- `.css`, aggregate stylesheet import, class/test-id/accessibility/event props, Lynx tree,
  text, icon, token, motion과 순수 함수 반환값은 기준점과 동일하다.

## 4. packaging 및 자동 규칙 검사

### 4.1 `check-pack.mjs`

`components[].modules`의 최종 값은 모든 항목에서 정확히 `["<directory>.contract"]`다.
검사는 각 contract `.js/.d.ts`가 tarball에 존재하고 `contract.js/.d.ts`와
`logic.js/.d.ts`는 어느 component에도 없음을 확인한다. 기존 JSX 보존, export target,
CSS export, source/test/script 배제, `replaceAll` 배제 검사는 유지한다.

`src/index.integration.test.ts`도 현재 StepIndicator에만 있는 generic contract/logic 부재
검사를 여덟 component 전체로 일반화하고 canonical contract artifact 존재를 검사한다.
root/subpath identity assertion은 삭제하거나 축소하지 않는다.

### 4.2 파일 규칙 pure checker

장기 규약 자동화를 위해 아래 내부 검사 단위를 추가한다. package public export에는 넣지 않고
build/pack 대상인 `src` 밖 `packages/ui-lynx/scripts/`에 둔다.

```text
module: packages/ui-lynx/scripts/component-file-conventions.mjs
export: findComponentFileConventionViolations(entries)
input: readonly { directory: string; files: readonly string[] }[]
output: readonly { directory: string; code: string; actual?: string; expected?: string }[]
errors: throw하지 않고 모든 위반을 directory/code/actual 순으로 정렬해 반환
side effects: 없음
```

규칙은 다음만 판정한다.

1. directory는 kebab-case이며 대응 PascalCase component 구현이 하나 있다.
2. `<Component>.tsx`, `<component>.contract.ts`, `<component>.css`, `index.ts`,
   `<Component>.ui.test.tsx`가 존재한다.
3. unit test가 존재하면 이름은 `<Component>.unit.test.ts` 하나다. runtime pure export가 없는
   BackHeader에 내용 없는 unit test를 만들지 않는다.
4. `contract.ts`, `logic.ts`, kebab-case component test, `index.ui.test.tsx`를 금지한다.

4번 금지는 canonical 파일 존재 여부와 독립적이다. 예를 들어 `Button.ui.test.tsx`와
`index.ui.test.tsx`가 함께 있거나 `Button.unit.test.ts`와 `button.unit.test.ts`가 함께 있으면
각 canonical 파일이 존재해도 noncanonical duplicate 위반을 반드시 반환한다.

IO adapter와 실제 tree 검사는 같은 test file에서 `readdir` 결과를 위 pure function에
전달한다. checker/테스트는 package root/index에서 export하지 않고 tarball에도 포함하지 않는다.

현재 tree에서 checker가 산출해야 하는 진단 증거는 27개다. code와 actual/expected는 다음
행을 펼친 값으로 고정한다.

| directory | code | actual/expected |
|---|---|---|
| `back-header` | `missing-contract`, `forbidden-generic-contract`, `missing-ui-test`, `noncanonical-ui-test` | expected `back-header.contract.ts`, actual `contract.ts`; expected `BackHeader.ui.test.tsx`, actual `index.ui.test.tsx` |
| `bottom-navigator` | `missing-contract`, `forbidden-generic-contract`, `forbidden-logic`, `missing-unit-test`, `noncanonical-unit-test`, `missing-ui-test`, `noncanonical-ui-test` | expected canonical contract/Pascal tests; actual `contract.ts`, `logic.ts`, two kebab-case tests |
| `button` | `missing-contract`, `forbidden-generic-contract`, `forbidden-logic`, `missing-unit-test`, `noncanonical-unit-test`, `missing-ui-test`, `noncanonical-ui-test` | expected canonical contract/Pascal tests; actual `contract.ts`, `logic.ts`, `button.unit.test.ts`, `index.ui.test.tsx` |
| `progress-header` | `missing-contract`, `forbidden-generic-contract` | expected `progress-header.contract.ts`, actual `contract.ts` |
| `status-indicator` | `missing-contract`, `forbidden-generic-contract`, `forbidden-logic`, `missing-unit-test`, `noncanonical-unit-test`, `missing-ui-test`, `noncanonical-ui-test` | expected canonical contract/Pascal tests; actual `contract.ts`, `logic.ts`, `status-indicator.unit.test.ts`, `index.ui.test.tsx` |

PageIndicator, RoundButton, StepIndicator의 위반은 0개다. 실제 tree test의 기대값은 처음부터
끝까지 빈 배열이다. 위 27개는 red 원인의 검토 증거이지 테스트가 허용하는 기대값이 아니다.

## 5. 테스트 계획과 legitimate red

### 5.1 unit / pureFunctions

`required`. `component-file-conventions.mjs`의 scaffold는 import 가능하고 빈 배열을 반환한다.
먼저 `component-file-conventions.unit.test.mjs`에 synthetic 위반 입력의 exact sorted 결과와
현재 여덟 directory의 **위반 0**을 단언한다. scaffold의 빈 결과 때문에 synthetic case가
기대한 위반을 받지 못하는 assertion failure가 첫 legitimate red다. import error, 문법 오류,
runner 미수집은 rejected다.

synthetic matrix에는 canonical UI/unit test와 대응 noncanonical duplicate가 동시에 있는
directory를 포함하고, 각각 `noncanonical-ui-test`와 `noncanonical-unit-test`가 반환되는 것을
exact assertion으로 고정한다. canonical 존재를 이유로 forbidden-file 검사를 건너뛰는 구현은
green이 될 수 없다.

```text
input files include:
  Button.ui.test.tsx, index.ui.test.tsx,
  Button.unit.test.ts, button.unit.test.ts
required violations:
  { directory: "button", code: "noncanonical-ui-test", actual: "index.ui.test.tsx", expected: "Button.ui.test.tsx" }
  { directory: "button", code: "noncanonical-unit-test", actual: "button.unit.test.ts", expected: "Button.unit.test.ts" }
```

checker 구현 후 synthetic case는 green이 되고 실제 tree의 동일한 빈 배열 단언은 §2 rename
전까지 27개 위반을 받아 red가 된다. 기대값을 바꾸지 않고 rename/merge로 위반 0을 만든다.
기존 component unit tests도 전부 실행해 함수 결과와 CSS 정적 계약이 동일함을 확인한다.

이 계층의 implementation variant는 하나의 **비동작 structural logic 단위**다. 다음
changed-files를 함께 소유해야 actual-tree 단언이 green이 되며, UI 구현 계층으로 나누지 않는다.

- `component-file-conventions.mjs`의 pure checker 구현
- §2의 contract/logic 8개 rename/merge와 component test 7개 rename
- `BackHeader.tsx`, `BottomNavigator.tsx`, `Button.tsx`, `ProgressHeader.tsx`,
  `StatusIndicator.tsx`의 internal import source 변경
- 대응 component `index.ts`와 `BottomNavigator.unit.test.ts`,
  `ProgressHeader.unit.test.ts`의 internal import source 변경
- `check-pack.mjs`의 canonical contract module 목록 변경

이 단위는 JSX body, props/type/function semantics, 테스트 assertion을 수정하지 않는다.
root `pnpm test:unit`의 첫 red는 assertion failure 2건으로 `test.unit.red-proof: confirmed`가
확인됐으며, module 해석·compile·runner failure가 아니다.

### 5.2 ui

UI 구현 계층은 `not-applicable`이다. §5.1 structural logic이 UI test 파일명과 TSX의 internal
import source까지 소유하지만 component module/export/props/state/interaction/render를
바꾸지 않는다. 따라서 정당한 UI red가 없고 change workflow에는 UI `moot`도 없다. 기존 UI
suite는 구현 후 root regression 명령으로 그대로 실행하며 신규 UI test와 신규/변경 stable
`data-testid`는 0개다.

`BackHeader.ui.test.tsx`, `Button.ui.test.tsx`, `RoundButton.ui.test.tsx`의
`vi.fn()` → `vi.fn<() => void>()` type-only 변경과 `RoundButton.unit.test.ts`의
`no-useless-escape` 제거는 ui-lynx lint warning을 0으로 만드는 exact lint-only 변경으로
허용한다. assertion, fixture, expected 값, event 호출, test-id와 runtime/visual semantics는
바꾸지 않으며 이 네 파일 변경 때문에 UI 계층을 applicable로 전환하지 않는다.

```yaml
kind: test.ui.applicability
status: not-applicable
summary: "UI 동작·렌더·props가 바뀌지 않고 파일명/internal import-source만 structural logic 단위에서 이동하므로 UI 구현과 신규 UI red가 없다. 기존 UI suite는 최종 regression으로 실행한다."
producedBy: specification
step: specification
```

### 5.3 integration

`required`. package integration과 `pack:check`가 canonical emitted filenames, forbidden old
artifacts, public export identity를 검증한다. 현재 root `pnpm test:integration`은 ui-lynx
6/6, mobile 96/96, Storybook 39/40으로 legitimate red다. 유일한 실패는
`apps/storybook-lynx/src/catalog.integration.test.ts`가 `check-pack.mjs`에서 과거
`modules: ["contract"]` 문자열을 요구해 canonical `<directory>.contract` 규칙과 충돌하는
assertion이다. build/module/runner 실패가 아니며 assertion 완화 대상도 아니다.

이 파일의 해당 case는 Storybook story/bridge 동작이 아니라 ui-lynx의 package docs/source
boundary를 읽어 검증하므로 integration **test-design**이 소유한다. 기존 한 generic assertion을
여덟 directory 각각의 `modules: ["<directory>.contract"]` 존재와 generic
`modules: ["contract"]`/`logic` 부재 assertion으로 교체한다. 다른 story, bridge, bundle,
interaction assertion은 수정하지 않는다. 그 test-design 수정 뒤 §5.1 structural logic이
rename/import와 `check-pack.mjs` 협력을 이미 완성하므로 integration의 첫 실행은 통과할 수 있다.

첫 실행이 모두 통과하면 `test.integration.red-proof: moot`는 다음 세 조건으로만 인정한다.

1. root `pnpm test:integration`의 package/mobile/Storybook integration이 전부 통과한다.
2. 원인을 `logic` 단계의 named changed-files로 기록한다: §2의 canonical contract/test paths,
   다섯 TSX와 다섯 component barrel의 import 변경, `BottomNavigator.unit.test.ts`,
   `ProgressHeader.unit.test.ts`, `check-pack.mjs`.
3. `src/index.integration.test.ts`가 여덟 canonical contract artifact와 여덟 generic
   contract/logic 부재를 실제 반복하고, `catalog.integration.test.ts`도 여덟 canonical
   per-directory module 선언과 generic 선언 부재를 검증하며, root/subpath identity assertions도
   실행돼 공허하지 않다.

이 경우 integration implementation은 무동작이며 `changed-files: []`를 남긴다. 첫 실행이
실패하면 `moot`가 아니다. canonical artifact/identity assertion failure는 structural logic
누락이므로 unit logic 단계로 되돌리고, import/compile/build/runner failure는 rejected로
test-design 또는 실행 환경에 돌려보낸다. integration 구현에서 제품 의미를 새로 고쳐 red를
green으로 만들지 않는다.

```yaml
kind: test.integration.applicability
status: applicable
summary: "source rename이 dist/tarball 파일명과 barrel identity에 영향을 주므로 package/pack/root/subpath 경계를 검증하고 repository integration 전체를 회귀 실행한다."
producedBy: specification
step: specification
```

### 5.4 e2e

`not-applicable`. JSX, CSS, story, interaction, native host 연결을 바꾸지 않는다. 자동 계층과
whitespace/semantic diff가 비변경을 증명하면 Storybook/native 수동 시각 재검증을 새로
요구하지 않는다. 의미 diff가 생기면 이 판정은 무효이며 specification으로 되돌린다.

```yaml
kind: test.e2e.applicability
status: not-applicable
summary: "파일과 내부 module 경로만 바뀌고 사용자 시작점·행동·렌더·스타일·host 결과는 그대로이므로 새 E2E 여정이 없다."
producedBy: specification
step: specification
```

`require-test-evidence`는 e2e `not-applicable`만으로 통과하지 않는다. review 전 아래 별도
승인 증거가 반드시 있어야 한다. specification은 사용자 승인을 대신 만들지 않는다.

```yaml
kind: approval-record
status: granted
summary: "UI Lynx 파일 구조 정리에 사용자 여정 E2E가 적용되지 않는다는 생략 승인"
scope: test.e2e.applicability
approvedBy: <승인한 사용자 식별>
approvedAt: <기록 시각>
producedBy: <승인을 기록한 단계>
```

`approval-record: granted`가 없으면 e2e 구현을 억지로 만들지 않고 review 이관을
`precondition-unmet`으로 차단해 승인 주체에 에스컬레이션한다.

### 5.5 layer 명령

| layer | root command 최종 책임 |
|---|---|
| unit | ui-lynx `test:unit` + mobile `test:unit` |
| ui | ui-lynx `test:ui` + mobile `test:ui` |
| integration | ui-lynx `test:integration` + mobile `test:integration` + storybook-lynx `test` |
| aggregate | 위 세 root layer scripts + `test:report-policy` |

root `package.json`은 `test:unit`, `test:ui`, `test:integration`을 위 순서로 추가했고 기존
`test`가 이 세 script와 `test:report-policy`를 호출하도록 변경됐다. package별 실제 파일
선택은 각 package script가 계속 소유하며 root/profile에 pattern을 복제하지 않는다.

## 6. exact changed-files 계약

```yaml
kind: changed-files
status: recorded
base: a8316a4ba0748b95aae40e10a37a562486176b66
required:
  - docs/specs/ui-lynx-code-conventions.md
  - apps/storybook-lynx/src/catalog.integration.test.ts
  - packages/ui-lynx/docs/component-file-conventions.md
  - packages/ui-lynx/README.md
  - packages/ui-lynx/scripts/check-pack.mjs
  - packages/ui-lynx/scripts/component-file-conventions.mjs
  - packages/ui-lynx/scripts/component-file-conventions.unit.test.mjs
  - packages/ui-lynx/src/index.integration.test.ts
  - packages/ui-lynx/src/back-header/BackHeader.tsx
  - packages/ui-lynx/src/back-header/index.ts
  - packages/ui-lynx/src/back-header/back-header.contract.ts
  - packages/ui-lynx/src/back-header/BackHeader.ui.test.tsx
  - packages/ui-lynx/src/bottom-navigator/BottomNavigator.tsx
  - packages/ui-lynx/src/bottom-navigator/index.ts
  - packages/ui-lynx/src/bottom-navigator/bottom-navigator.contract.ts
  - packages/ui-lynx/src/bottom-navigator/BottomNavigator.unit.test.ts
  - packages/ui-lynx/src/bottom-navigator/BottomNavigator.ui.test.tsx
  - packages/ui-lynx/src/button/Button.tsx
  - packages/ui-lynx/src/button/index.ts
  - packages/ui-lynx/src/button/button.contract.ts
  - packages/ui-lynx/src/button/Button.unit.test.ts
  - packages/ui-lynx/src/button/Button.ui.test.tsx
  - packages/ui-lynx/src/progress-header/ProgressHeader.tsx
  - packages/ui-lynx/src/progress-header/index.ts
  - packages/ui-lynx/src/progress-header/progress-header.contract.ts
  - packages/ui-lynx/src/progress-header/ProgressHeader.unit.test.ts
  - packages/ui-lynx/src/round-button/RoundButton.unit.test.ts
  - packages/ui-lynx/src/round-button/RoundButton.ui.test.tsx
  - packages/ui-lynx/src/status-indicator/StatusIndicator.tsx
  - packages/ui-lynx/src/status-indicator/index.ts
  - packages/ui-lynx/src/status-indicator/status-indicator.contract.ts
  - packages/ui-lynx/src/status-indicator/StatusIndicator.unit.test.ts
  - packages/ui-lynx/src/status-indicator/StatusIndicator.ui.test.tsx
  - package.json
  - docs/adr/0006-command-interface-and-test-layers.md
  - docs/adr/0025-ui-lynx-package-and-storybook-catalog.md
  - docs/conventions/code.md
deleted-after-merge:
  - packages/ui-lynx/src/back-header/contract.ts
  - packages/ui-lynx/src/back-header/index.ui.test.tsx
  - packages/ui-lynx/src/bottom-navigator/contract.ts
  - packages/ui-lynx/src/bottom-navigator/logic.ts
  - packages/ui-lynx/src/bottom-navigator/bottom-navigator.unit.test.ts
  - packages/ui-lynx/src/bottom-navigator/bottom-navigator.ui.test.tsx
  - packages/ui-lynx/src/button/contract.ts
  - packages/ui-lynx/src/button/logic.ts
  - packages/ui-lynx/src/button/button.unit.test.ts
  - packages/ui-lynx/src/button/index.ui.test.tsx
  - packages/ui-lynx/src/progress-header/contract.ts
  - packages/ui-lynx/src/status-indicator/contract.ts
  - packages/ui-lynx/src/status-indicator/logic.ts
  - packages/ui-lynx/src/status-indicator/status-indicator.unit.test.ts
  - packages/ui-lynx/src/status-indicator/index.ui.test.tsx
lint-only-allowances:
  - "packages/ui-lynx/src/back-header/BackHeader.ui.test.tsx: vi.fn() -> vi.fn<() => void>() 2건"
  - "packages/ui-lynx/src/button/Button.ui.test.tsx: vi.fn() -> vi.fn<() => void>() 2건"
  - "packages/ui-lynx/src/round-button/RoundButton.ui.test.tsx: vi.fn() -> vi.fn<() => void>()"
  - "packages/ui-lynx/src/round-button/RoundButton.unit.test.ts: no-useless-escape 제거"
worktree-runtime-evidence:
  - .agent-harness/profile.yaml
  - .agent-harness/decisions/ui-lynx-code-conventions-profile.md
implementation-forbidden:
  - docs/design/ui-lynx-code-conventions.md
  - packages/ui-lynx/package.json
  - packages/ui-lynx/src/index.ts
  - packages/ui-lynx/src/**/*.css
  - apps/storybook-lynx/src/**
test-design-exceptions:
  - apps/storybook-lynx/src/catalog.integration.test.ts
producedBy: specification
```

`docs/design/ui-lynx-code-conventions.md`는 병렬 design 역할이 소유하는 허용된 최종
아티팩트다. 위 금지는 구현/문서 역할이 그 파일을 덮어쓰지 말라는 소유권 경계다.

`packages/ui-lynx/package.json`은 exports/sideEffects/package scripts가 이미 필요한 package
검사를 소유하므로 변경하지 않는다. 새 checker test는 기존 `vitest run unit.test` 패턴에
수집된다. `apps/storybook-lynx/src/**`의 제품 구현 금지는 유지되며 위 exact exception은
integration test-design이 stale package-boundary assertion 하나를 강화하는 데만 쓴다.
변경 파일이 위 목록 밖으로 늘면 contract-diff를 먼저 갱신한다.

## 7. repository profile command mismatch 해결 증거

기준점의 외부 소비 저장소 profile은 mobile만 실행해 ui-lynx와 Storybook integration을
하네스 증거에서 누락했다. 이 worktree에서는 root layer scripts와 다음 routing으로 해결됐다.

```yaml
commands:
  test.unit: { command: "pnpm test:unit" }
  test.ui: { command: "pnpm test:ui" }
  test.integration: { command: "pnpm test:integration" }
```

- membership 단일 소유자: root `package.json`의 `test:unit/ui/integration`
- 하네스 routing: `.agent-harness/profile.yaml`은 세 root script 이름만 호출
- 결정 근거: `.agent-harness/decisions/ui-lynx-code-conventions-profile.md`
- validator: `node /Users/sehyun/Documents/GitHub/FE/.agent-harness/harness/tooling/validators/validate.mjs --profile /private/tmp/ui-lynx-code-conventions.6PFYmN/.agent-harness/profile.yaml`
- 결과: passed. profile blocker 해소

두 `.agent-harness` 파일은 ignored worktree-runtime evidence이며 제품 diff나 배포 package에
포함하지 않는다. 외부 원본 profile은 수정하지 않는다. 이후 test-execution은 반드시 위
worktree-local profile의 절대 경로를 전달하며, 다른 profile을 사용한 결과는 완료 증거가 아니다.

## 8. documentation-impact

```yaml
kind: documentation-impact
status: required
summary: "canonical contract-only component 구조와 repository-wide layer test 명령이 기존 ADR/README/code convention의 contract+logic 및 mobile-only 설명을 낡게 만든다."
artifact: docs/specs/ui-lynx-code-conventions.md#8-documentation-impact
affected:
  - packages/ui-lynx/docs/component-file-conventions.md
  - packages/ui-lynx/README.md
  - docs/conventions/code.md
  - docs/adr/0006-command-interface-and-test-layers.md
  - docs/adr/0025-ui-lynx-package-and-storybook-catalog.md
notAffected:
  - docs/e2e/*.md
  - apps/storybook-lynx/README.md
reason: "시각·사용자 여정·Storybook 사용법은 그대로이고 파일 소유권과 검증 명령 범위만 바뀐다. ADR-0025 D4.1의 별도 logic 허용과 ADR-0006의 mobile-only profile 표는 새 정본과 직접 충돌한다."
producedBy: specification
```

문서 갱신은 역사적 결정을 삭제하지 않고 최신 정정/현재 규칙이 contract-only 구조와 root
layer scripts를 명확히 가리키게 한다. `packages/ui-lynx/README.md`의 PageIndicator
“contract, logic” 표현도 unified contract로 고친다.

## 9. contract-diff

```yaml
kind: contract-diff
status: recorded
base: a8316a4ba0748b95aae40e10a37a562486176b66
added-internal:
  - pure file-convention checker and its unit test
changed-internal:
  - five component contract paths
  - three split logic modules merged into canonical contracts
  - seven component test filenames
  - internal imports and pack artifact expectations
  - BackHeader/Button/RoundButton UI mock type parameter와 RoundButton unit escape의 exact lint-only 정리; assertion/fixture/expected/event/runtime semantics 불변
  - pure checker가 canonical test와 공존하는 noncanonical duplicate도 독립 위반으로 반환
  - Storybook catalog integration의 stale generic module assertion을 eight canonical module assertions로 강화
  - repository root layer test command routing
layering:
  unit: "required; checker와 모든 rename/merge/import/pack-list 변경을 한 structural logic 단위가 소유"
  ui: "not-applicable; 기존 suite는 최종 regression으로만 실행"
  integration: "applicable; 선행 logic이 협력을 완성해 첫 실행이 green이면 조건부 moot와 integration changed-files: [] 기록"
  e2e: "not-applicable; review 전 별도 approval-record: granted 필요"
unchanged-public:
  - all component value and type export names
  - all root and subpath export targets
  - props and type semantics
  - pure function signatures and results
  - JSX, CSS, accessibility, interaction and data-testid contracts
removed-public: []
type-contract-added: false
typecheck-note: "새 TypeScript 계약 파일을 작성하지 않는다. 기존 타입을 경로만 바꿔 이동하며 최종 pnpm typecheck와 declaration build로 동일성을 검증한다."
producedBy: specification
```

## 10. 검증 순서와 증거

1. worktree-local profile validator 통과와 올바른 Node/pnpm·frozen lockfile 환경을 확인한다.
2. 이미 확인된 root `pnpm test:unit`의 assertion failure 2건을
   `test.unit.red-proof: confirmed` 원본 증거로 보존한다.
3. §5.1의 단일 structural logic 단위에서 checker, rename/merge, internal import,
   `check-pack.mjs` 목록을 함께 적용하고 root `pnpm test:unit`을 green으로 만든다.
4. UI 구현 단계는 만들지 않는다. `test.ui.applicability: not-applicable`을 전달하되,
   최종 회귀로 root `pnpm test:ui`를 실행한다.
5. 확인된 1건의 Storybook integration red에 따라 test-design이
   `apps/storybook-lynx/src/catalog.integration.test.ts`의 generic assertion을 여덟 canonical
   module 및 generic 부재 assertion으로 교체한다. 그 뒤 root `pnpm test:integration`을 처음
   실행해 모두 통과하고 §5.3의 named changed-files·비공허 assertion 조건이 충족되면
   `test.integration.red-proof: moot`와 integration implementation `changed-files: []`를
   기록한다. 실패하면 moot를 기록하지 않고 §5.3의 소유 계층으로 되돌린다.
6. `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
   `pnpm --filter @libitums/ui-lynx pack:check`를 실행한다. 하네스 test-runner에는
   worktree-local profile의 절대 경로를 전달한다.
7. `git diff --check`, changed-files allowlist, `git diff -w` JSX/CSS 의미 diff,
   `data-testid` 문자열 집합과 root/subpath export 집합을 기준점과 비교한다.
8. review 이관 전에 §5.4의 E2E 생략 `approval-record: granted`를 승인 주체로부터 기록한다.
   기록이 없으면 `require-test-evidence`를 통과한 것으로 보고하지 않는다.

### 조사 증거

- `git rev-parse HEAD` → `a8316a4ba0748b95aae40e10a37a562486176b66`
- 전수 파일 목록: `find packages/ui-lynx -maxdepth 4 -type f | sort`
- 내부 결선: `rg -n '^import |^export ' packages/ui-lynx/src packages/ui-lynx/scripts`
- 드리프트 근거: `packages/ui-lynx/docs/component-file-conventions.md`와 §1 표
- package 경계: `packages/ui-lynx/package.json`, `scripts/check-pack.mjs`,
  `src/index.integration.test.ts`
- profile 해결 증거: `.agent-harness/profile.yaml`,
  `.agent-harness/decisions/ui-lynx-code-conventions-profile.md`; §7의 absolute-profile validator
  명령 passed
- unit red: worktree root `pnpm test:unit`에서 의도한 규칙 assertion failure 2건 confirmed;
  module/compile/runner precondition failure가 아님
- integration red: `/private/tmp/ui-lynx-code-conventions.integration.log`, SHA-256
  `a1e822361ea8204323c8f9025bfe8e16863e4d257001f504a083e158c798f4b7`; ui-lynx 6/6,
  mobile 96/96, Storybook 39/40, stale `modules: ["contract"]` assertion 1건만 실패

이 문서가 최신 main의 계약 고정점이다. §3의 공개 불변식이나 §6의 경로를 넓혀야 하면
구현에서 임의로 바꾸지 말고 specification으로 되돌려 contract-diff를 갱신한다.
