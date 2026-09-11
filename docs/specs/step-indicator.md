# StepIndicator 계약

- 시각 원본: `libitums/design-system/components/indicator/step-indicator.md` revision
  `3f7ed6d17df769e37215adb40f7abfc2e1174fd1`
- 기반 결정: ADR-0025 D1–D6와 2026-09-11 StepIndicator 확장
- 상태: **고정**. 이 문서를 다시 고정하기 전에는 하류 구현이 공개 이름, 입력 범위,
  상태 파생, test-id, story 이름 또는 package subpath를 바꾸지 않는다.
- measurement: 없음. 분석 이벤트, sink, payload를 추가하지 않는다.

## 1. 범위와 불변식

`@libitums/ui-lynx`에 고정된 순서형 흐름의 현재 위치를 보여 주는 비인터랙티브
ReactLynx 컴포넌트 `StepIndicator`를 추가하고, `apps/storybook-lynx`가 공개 package
subpath를 실제 Rspeedy Lynx Web bundle로 소비한다.

1. 공개 입력은 1-based `currentStep`과 `totalSteps` 두 값뿐이다. `totalSteps`는 2–5 정수,
   `currentStep`은 1–`totalSteps` 정수다. 기본값, optional prop, tap callback은 없다.
2. `currentStep`보다 작은 단계는 `completed`, 같은 단계는 `current`, 큰 단계는
   `upcoming`이다. 이 상태는 저장하거나 소비자에게 받지 않고 순수하게 파생한다.
3. 잘못된 `totalSteps`는
   `Error("totalSteps must be an integer between 2 and 5")`, 잘못된 `currentStep`은
   `Error("currentStep must be an integer between 1 and totalSteps")`로 즉시 거부한다.
   `totalSteps`를 먼저 검증한다.
4. 원은 `totalSteps`개, 연결선은 인접 단계 사이에 `totalSteps - 1`개다. 각 연결선의
   상태와 색은 오른쪽 단계가 아니라 **왼쪽 단계**의 상태를 따른다.
5. 원은 32×32px, 연결선은 2px이며 연결선은 남는 가로 공간을 같은 비율로 나눈다.
   색, typography, spacing, radius, stroke는 배포된 `--libitum-*` CSS 변수를 사용한다.
   raw color나 신규 semantic token은 만들지 않는다.
6. 원과 연결선은 이동 control이 아니다. component props와 렌더 root에 `bindtap`,
   button trait, focus 이동 API를 추가하지 않는다.
7. 접근성 트리에는 전체 줄 하나만 `N단계 중 M단계` 이름의 요소로 노출한다. 숫자 원,
   숫자 text, 연결선은 visual wrapper의 `accessibility-elements-hidden={true}` 아래에 둔다.
   Storybook은 native VoiceOver/TalkBack 실청을 증명하지 않는다.
8. 제품 화면, route, native host, 서버/API, persistence, analytics와 design-token 저장소는
   수정하지 않는다. React context, local/global state, effect, fetch hook도 추가하지 않는다.

## 2. 컴포넌트 경계와 데이터 흐름

```text
Storybook manager (serializable currentStep, totalSteps)
  -> <lynx-view>.updateData()
    -> normalizeStepIndicatorStoryArgs(unknown)
      -> useInitData()
        -> @libitums/ui-lynx/step-indicator StepIndicator
          -> one accessible status root
            -> hidden visual row
              -> Step circle 1
              -> Connector using circle 1 status
              -> ...
              -> Step circle N
```

| 단위 | 단일 책임 |
|---|---|
| `StepIndicator` | 순수 계약 결과를 한 접근성 상태 root와 숨겨진 시각 row로 렌더한다. |
| `getStepIndicatorContract` | 입력을 검증하고 단계 번호·상태·접근성 이름을 순수하게 계산한다. |
| `normalizeStepIndicatorStoryArgs` | unknown Storybook init data를 유효하고 JSON 직렬화 가능한 두 정수로 기본화한다. |
| StepIndicator Lynx story entry | 정규화 결과를 공개 package subpath의 컴포넌트에 전달한다. |

fetch, API 요청/응답 schema, hook, cache, persistence와 제품 상태 흐름은 없다. Storybook
args는 검증 앱의 로컬 init data일 뿐 제품 데이터가 아니다.

## 3. 공개 TypeScript와 package 계약

구현, contract, 순수 logic, CSS, unit/UI test와 barrel은
`packages/ui-lynx/src/step-indicator/`에 함께 둔다.

```ts
export type StepIndicatorStepStatus = "completed" | "current" | "upcoming";

export type StepIndicatorProps = {
  readonly currentStep: number;
  readonly totalSteps: number;
};

export type StepIndicatorStep = {
  readonly number: number;
  readonly status: StepIndicatorStepStatus;
};

export type StepIndicatorContract = {
  readonly accessibilityLabel: string;
  readonly steps: readonly StepIndicatorStep[];
};

export function getStepIndicatorContract(props: StepIndicatorProps): StepIndicatorContract;
export function StepIndicator(props: StepIndicatorProps): JSX.Element;
```

`getStepIndicatorContract`는 DOM, Lynx runtime, 시간, 네트워크와 저장소 부수효과가 없는
결정적 순수 함수다. 유효한 입력에는 정확히 하나의 `current`를 반환하고, 유효하지 않은
입력에는 1절의 오류를 던진다. component는 이 함수의 결과를 렌더하며 상태 판정을 복제하지
않는다.

공개 package 경계는 다음과 같다.

- `@libitums/ui-lynx/step-indicator`는 `dist/step-indicator/index.js`와
  `dist/step-indicator/index.d.ts`를 가리킨다.
- root `@libitums/ui-lynx`는 같은 component, 순수 함수와 타입을 재수출해 기존 root 소비
  호환성을 유지한다.
- `@libitums/ui-lynx/step-indicator/styles.css`는
  `dist/step-indicator/step-indicator.css`를 가리키며 component 전용 CSS의 선택적 공개
  subpath다. 이 CSS 경로는 tree-shaking으로 제거되지 않도록 side effect로 유지한다.
- aggregate `@libitums/ui-lynx/styles.css`는 design token CSS와 기존 모든 component CSS를
  유지하면서 `./step-indicator/step-indicator.css`를 import한다. 일반 소비자는 aggregate
  stylesheet를 진입점에서 한 번 import한다.
- package build는 TypeScript를 지운 ESM/declaration/CSS를 만들되 `StepIndicator.jsx`의
  authored ReactLynx JSX를 보존한다. pack 검사는 runtime/declaration/CSS와 두 subpath target,
  source/test/script 비포함을 검증한다.

## 4. 렌더·접근성·상태 계약

| 입력 | 원 상태 | 연결선 상태 | 접근성 이름 |
|---|---|---|---|
| `currentStep=1, totalSteps=4` | current, upcoming, upcoming, upcoming | current, upcoming, upcoming | `4단계 중 1단계` |
| `currentStep=2, totalSteps=4` | completed, current, upcoming, upcoming | completed, current, upcoming | `4단계 중 2단계` |
| `currentStep=4, totalSteps=4` | completed, completed, completed, current | completed, completed, completed | `4단계 중 4단계` |

접근성 root는 `accessibility-element={true}`와 계산된 `accessibility-label`을 가진다.
`status`라는 별도 public prop이나 개별 원의 접근성 이름은 없다. static UI test는 접근성
속성과 자손 가림을 검증하며, native 읽기 순서·발화·trait는 ADR-0025 D5에 따라 package가
제품 route에 채택될 때 실기기로 닫는다.

## 5. test-id 계약

| 표면 | 안정적인 test-id / data |
|---|---|
| 접근성 status root | `ui-lynx-step-indicator`; `data-current`, `data-total` |
| 접근성에서 숨긴 visual row | `ui-lynx-step-indicator-visual` |
| 반복 숫자 원 | `ui-lynx-step-indicator-circle`; `data-status` |
| 반복 연결선 | `ui-lynx-step-indicator-connector`; `data-status` |

원과 연결선은 반복 test-id를 사용하며 순서와 개수는 `getAllByTestId`로 관찰한다. 단계 번호를
붙인 동적 test-id, CSS 구조 전체 snapshot, class 문자열 전체는 계약이 아니다.

## 6. Storybook First/Middle/Last 계약

- story title은 `Components/Step Indicator`이고 export는 `First`, `Middle`, `Last` 세 개다.
- 공통 args는 `{ currentStep: 1, totalSteps: 4 }`다. `First`는 공통 args,
  `Middle`은 `{ currentStep: 2 }`, `Last`는 `{ currentStep: 4 }`를 덮어써 각각
  1/4, 2/4, 4/4를 나타낸다.
- Controls와 Lynx init data에는 `currentStep`, `totalSteps` 두 number만 둔다. 함수, action,
  SVG 또는 제품 객체는 직렬화 경계를 넘지 않는다.
- `currentStep` Control은 integer step 1, UI 범위 1–5이고 `totalSteps` Control은 integer
  step 1, 범위 2–5다. 둘 사이의 유효성은 runtime normalizer가 최종 보장한다.
- `normalizeStepIndicatorStoryArgs(input)`의 fallback을 다음처럼 고정한다.
  `input`이 object가 아니면 빈 object로 본다. `totalSteps`가 2–5 정수가 아니면 4,
  `currentStep`이 1–정규화된 `totalSteps` 정수가 아니면
  `Math.min(2, totalSteps)`를 쓴다. 결과는 두 number key만 가진 JSON-roundtrip 가능한 값이다.
- Lynx entry key와 bundle은 각각 `step-indicator`,
  `dist/lynx/step-indicator.web.bundle`이다. story의 bundle URL은
  `./lynx/step-indicator.web.bundle`이다.
- runtime entry는 workspace source나 root barrel이 아닌
  `@libitums/ui-lynx/step-indicator`만 소비한다. source path mapping은 emit하지 않는
  `tsconfig.typecheck.json`에만 허용한다.
- StepIndicator에는 Action bridge가 없다. Canvas의 원을 tap해도 이동이나 Action이 발생하지
  않는다.

## 7. 계층별 테스트 계획과 applicability

### unit — required / applicable

책임: UI에서 분리된 입력 검증, 순수 상태 파생과 정적 CSS 계약을 검증한다.

- `packages/ui-lynx/src/step-indicator/step-indicator.unit.test.ts`는 2/5단계 경계,
  completed/current/upcoming 순서, 정확히 하나의 current, 접근성 이름, 범위 밖·소수 입력의
  오류와 검증 순서를 단언한다.
- 같은 파일의 CSS 검사는 32px 원, 2px/flex-grow 연결선, label.m typography, 원의 세 상태
  token과 왼쪽 단계 상태별 connector token을 단언한다. source CSS 계약이며 실제 computed
  layout이나 native font를 증명했다고 해석하지 않는다.

```yaml
kind: test.unit.applicability
status: applicable
summary: "입력 검증과 completed/current/upcoming 및 왼쪽 단계 connector 파생이 새 순수 함수 책임이다."
artifact: docs/specs/step-indicator.md#unit--required--applicable
producedBy: specification
```

### ui — required / applicable

책임: 단일 ReactLynx component의 렌더 구조, 상태 data, 접근성 노출과 비상호작용을 검증한다.

- `packages/ui-lynx/src/step-indicator/StepIndicator.ui.test.tsx`는 원 N개와 connector N-1개,
  숫자 순서, 각 원/connector의 `data-status`, root 하나의 접근성 이름, visual 자손 가림,
  `bindtap`과 button trait 부재를 검증한다.
- 실제 native 발화와 32px/2px computed layout은 jsdom UI test 범위가 아니다.

```yaml
kind: test.ui.applicability
status: applicable
summary: "새 ReactLynx status component의 반복 렌더, 단일 접근성 노출과 비인터랙티브 표면이 사용자에게 보인다."
artifact: docs/specs/step-indicator.md#ui--required--applicable
producedBy: specification
```

### integration — required / applicable

책임: package root/subpath/CSS/tarball 경계와 Storybook manager→init data→실제 Lynx bundle을
검증한다.

- `packages/ui-lynx/src/index.integration.test.ts`와 `scripts/check-pack.mjs`는 root와
  `./step-indicator` runtime/type identity, `./step-indicator/styles.css`, aggregate CSS,
  component-specific dist, packed export target과 authored JSX 보존을 검증한다.
- `apps/storybook-lynx/src/catalog.integration.test.ts`는 normalizer의 유효 값 JSON 왕복과
  위 fallback, `step-indicator.web.bundle` header/크기, First/Middle/Last story ID,
  Rspeedy entry와 공개 component subpath 소비를 검증한다.
- source 문자열 단언만으로 normalizer 실행이나 package build/pack 검증을 대신하지 않는다.

```yaml
kind: test.integration.applicability
status: applicable
summary: "두 package subpath, aggregate CSS, tarball, Storybook Controls와 실제 Rspeedy bundle이라는 여러 모듈 경계가 추가된다."
artifact: docs/specs/step-indicator.md#integration--required--applicable
producedBy: specification
```

### e2e — not-applicable / automatic layer

ADR-0025 D5의 검증 경계와 기존 repository profile에 따라 제품 route/native host delta가 없는
이번 package/catalog 변경에는 자동 e2e 파일이나 script를 추가하지 않는다. 대신 실제
Storybook 개발 서버에서 First/Middle/Last, Controls, 원/connector geometry, 상태 색과 tap
무반응을 확인하는 수동 흐름은 required이며 `docs/e2e/ui-lynx-storybook.md`가 소유한다.
VoiceOver/TalkBack 실청은 제품 route 채택 전까지 비차단 후속이다.

```yaml
kind: test.e2e.applicability
status: not-applicable
summary: "제품/native route가 바뀌지 않고 자동 e2e 러너 대상이 아니다. 실제 catalog는 기존 Storybook 수동 E2E 채널로 검증한다."
artifact: docs/specs/step-indicator.md#e2e--not-applicable--automatic-layer
producedBy: specification
```

```yaml
kind: specification.test-plan
status: frozen
summary: "StepIndicator의 unit, ReactLynx UI, package/Storybook integration과 수동 Storybook 검증 책임을 계층별로 고정했다."
artifact: docs/specs/step-indicator.md#7-계층별-테스트-계획과-applicability
producedBy: specification
```

## 8. state-data 삽입 단계

state-data 작업은 **skip**이다. 소비 입력은 부모가 직접 전달하는 두 정수이고 component의
상태는 `getStepIndicatorContract`가 렌더마다 순수 파생한다. 서버, API client/schema, fetch,
cache, persistence, store/context와 비동기 lifecycle이 없으므로 별도 상태·데이터 레이어를
만들면 범위와 책임만 늘어난다.

실행 시 침묵 생략하지 않고 `frontend:state.skip-justification` 증거에 다음 사유를 기록한다.

```yaml
kind: frontend:state.skip-justification
status: recorded
summary: "StepIndicator는 부모가 준 currentStep/totalSteps를 순수 파생할 뿐 서버/API/persistence/store가 없어 state-data 구현 변경이 없다."
artifact: docs/specs/step-indicator.md#8-state-data-삽입-단계
producedBy: state-data
```

## 9. 문서 영향 판정

```yaml
kind: documentation-impact
status: required
summary: "다섯 번째 공개 컴포넌트, 두 subpath, 세 story와 bundle, 수동 검증 흐름이 추가되어 package/catalog/ADR 문서가 낡는다."
affected:
  - packages/ui-lynx/README.md
  - apps/storybook-lynx/README.md
  - docs/adr/0025-ui-lynx-package-and-storybook-catalog.md
  - docs/e2e/ui-lynx-storybook.md
artifact: docs/specs/step-indicator.md#9-문서-영향-판정
producedBy: specification
```

- package README는 다섯 번째 component, 사용 예, 공개 component/CSS subpath, aggregate CSS와
  접근성·비인터랙티브 계약을 기록한다.
- Storybook README는 다섯 bundle, First/Middle/Last, Controls와 normalizer fallback을 기록한다.
- ADR-0025는 현재 다섯 component barrel과 StepIndicator package/catalog 확장을 기록한다.
- 수동 문서는 세 story, 2–5 Controls, 왼쪽 상태 connector, 32px/2px geometry, tap 무반응과
  bundle 응답을 기록한다.

## 10. 계약 차이와 고정 증거

```yaml
kind: contract-diff
status: recorded
summary: "기존 네 ui-lynx 컴포넌트는 유지하고 비인터랙티브 StepIndicator, 순수 단계 파생, 두 공개 subpath와 First/Middle/Last catalog만 추가한다; 제거 0개다."
artifact: docs/specs/step-indicator.md#10-계약-차이와-고정-증거
producedBy: specification
before:
  publicComponents: [Button, BackHeader, StatusIndicator, RoundButton]
  stepIndicatorSubpath: absent
  stepIndicatorStyleSubpath: absent
  stepIndicatorStoryBundle: absent
after:
  publicComponents: [Button, BackHeader, StatusIndicator, RoundButton, StepIndicator]
  stepIndicatorSubpath: "@libitums/ui-lynx/step-indicator"
  stepIndicatorStyleSubpath: "@libitums/ui-lynx/step-indicator/styles.css"
  stepIndicatorStoryBundle: "step-indicator.web.bundle"
unchanged:
  - existing component props and behavior
  - product screens and native routes
  - design-token repository and token vocabulary
  - authored JSX package format and ReactLynx peer boundary
  - automatic e2e exclusion
```

```yaml
kind: specification.contract
status: frozen
summary: "1-based 2–5 input, three derived states, left-state connectors, one accessibility label, no interaction, two public subpaths and three stories are frozen."
artifact: docs/specs/step-indicator.md
producedBy: specification
```

```yaml
kind: specification.testids
status: frozen
summary: "StepIndicator root, visual row, repeated circle/connector selectors와 data-current/data-total/data-status를 닫았다."
artifact: docs/specs/step-indicator.md#5-test-id-계약
producedBy: specification
```

## 11. 병렬 구현 경계

계약 고정 뒤 다음 단위는 공개 이름과 상태 의미를 재협의하지 않고 진행할 수 있다.

1. package logic/UI: contract 타입, `getStepIndicatorContract`, component JSX와 전용 CSS.
2. package 검증: unit/UI, root 및 두 subpath, aggregate CSS, build/pack/JSX 보존 검사.
3. Storybook 구현: normalizer, First/Middle/Last, Lynx entry와 Rspeedy bundle entry.
4. Storybook 통합 검증: JSON fallback, 실제 bundle, story index와 공개 subpath 경계.
5. documentation: 9절의 네 affected 문서와 수동 Storybook 흐름.

state-data에는 병렬 구현물이 없다. package logic은 부모 입력을 순수하게 변환하고 Storybook
normalizer는 catalog 경계만 소유한다. 같은 파일에 대한 병렬 쓰기는 허용하지 않으며 package
공개 export와 Storybook runtime 연결은 각 소유 단위가 준비된 뒤 공통 통합 지점에서 결선한다.

명시한 가정은 없다. 미해결 계약 질문도 없다.

```yaml
kind: changed-files
status: recorded
summary: "specification은 StepIndicator 고정 스펙 문서 1개만 추가했고 제품 JSX/CSS/상태 구현은 수정하지 않았다."
artifact: docs/specs/step-indicator.md
producedBy: specification
files:
  - docs/specs/step-indicator.md
```
