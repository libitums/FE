# RoundButton 계약

- 기준 커밋: `68c7f43`
- 시각 원본: `libitum/design-system/components/round-button.md`
- 기반 결정: ADR-0006, ADR-0014, ADR-0015, ADR-0016, ADR-0025
- 상태: **고정**. 이 문서를 다시 고정하기 전에는 하류 구현이 공개 이름·상태 우선순위·test-id를 바꾸지 않는다.
- measurement: 없음. 분석 이벤트·sink·payload를 추가하지 않는다.

## 1. 범위와 불변식

`@libitums/ui-lynx`에 아이콘 하나의 원형 ReactLynx control `RoundButton`을 추가하고,
`apps/storybook-lynx`가 공개 package export를 실제 Rspeedy Lynx Web bundle로 소비한다.

1. variant는 `neutral | brand`, size는 `s | m | l | xl`로 닫는다. 기본값은
   `neutral`, `m`이다.
2. 소비자가 넘긴 padding SVG XML 문자열 하나를 Default·Pressed·Disabled에서 렌더한다.
   Loading에서는 icon을 렌더하지 않고 Spinner 하나로 **대체**한다.
3. Default와 Pressed의 icon은 variant 전경색을 SVG `current-color`로 받는다. Loading의
   Spinner는 `<view>`의 CSS border로 그리며 같은 variant 색의 기존 CSS token을
   `border-color`로 받는다. Neutral은 `fg.neutral-subtle`, Brand는 `fg.brand`다. raw hex와
   신규 token은 없다.
4. 시각 프레임은 S 28, M 36, L 44, XL 56 정사각이다. icon은 각각 16, 18, 20, 24이며,
   현재 token이 없는 M icon 18과 Spinner 12를 이유로 token을 만들거나 다른 크기로
   바꾸지 않는다. 외곽 focusable hit area의 `width`와 `height`는 S/M/L에서 **정확히 48**,
   XL에서 **정확히 56**이며 min-size나 하한 계약이 아니다. 서로 겹치지 않는다.
5. Pressed는 별도 prop이 아니라 활성 control의 transient press 상태다. 중심을 유지한 채
   surface만 95%로 줄고 hit area와 주변 layout은 변하지 않는다. Loading·Disabled에는
   pressed 변형을 적용하지 않는다.
6. `accessibilityLabel`은 빈 문자열을 허용하지 않는 **필수 소비 계약**이다. TypeScript는
   공백 여부를 증명하지 못하므로 개발 중 빈/공백 값은 명시적 오류로 다룬다. control은
   `accessibility-element={true}`와 한 개의 trait만 가진다. 활성·Loading은 `button`,
   Disabled는 `disabled`다. Loading의 이름은 `<accessibilityLabel>, 로딩 중`이다.
7. 활성 상태의 hit area tap 한 번은 `bindtap`을 정확히 한 번 호출한다. Loading과 Disabled는
   handler 자체를 연결하지 않아 tap을 차단한다. `disabled && loading`도 허용하며 Disabled
   semantics가 우선하고 Spinner는 유지한다.
8. `disabled && loading`의 Spinner는 ADR-0025의 기존 결합 상태 override에 따라 CSS
   `border-color: var(--libitum-color-border-default)`를 받는다. Disabled 단독 icon은 디자인
   원본대로 Neutral `color.gray[500]`, Brand `color.brand["reward-disabled-surface"]`에
   35% opacity다.
9. 배경·radius·stroke·spacing·motion은 배포된 `--libitum-*` CSS 변수만 사용한다. 색을
   제외한 TSX inline style은 없다. icon 색의 TypeScript token 상수는 ADR-0014 D2의 유일한
   예외다. `packages/ui-lynx/src/styles.css`가 현 패키지의 단일 컴포넌트 CSS 파일이라는
   기존 실체를 유지하며 RoundButton 전용 두 번째 전역 CSS 파일을 만들지 않는다.
10. 제품 화면, Visual Novel, native route/host, `libitum/design-system` token 저장소는
    수정하지 않는다. 디자인 원본으로부터 deviation은 없고 신규 token도 없다.

## 2. 컴포넌트 경계와 데이터 흐름

```text
Storybook manager (serializable RoundButtonStoryArgs)
  -> <lynx-view>.updateData()
    -> apps/storybook-lynx/src/lynx/round-button.tsx (useInitData)
      -> @libitums/ui-lynx/round-button RoundButton
        -> focusable hit-area view
          -> circular surface
            -> Icon | Spinner
      -> NativeModules.bridge STORYBOOK_ACTION -> Storybook onTap Action
```

| 단위 | 단일 책임 |
|---|---|
| `RoundButton` | 접근성 단위·hit area·상태 표현을 만들고 허용된 tap만 소비자 callback으로 전달한다. |
| `getRoundButtonContract` | props 기본값, class·trait·접근성 이름·상호작용 가능 여부를 순수하게 계산한다. |
| `getRoundButtonForegroundColor` | variant와 Disabled 여부를 icon SVG `current-color`의 정확한 TypeScript token 값으로 변환한다. |
| RoundButton Lynx story entry | serializable Controls를 검증·기본화해 공개 package component에 전달하고 Action bridge를 연결한다. |

fetch, API schema, hook, persistence, 제품 상태 흐름은 없다. Storybook args는 검증 앱의 로컬
init data일 뿐 제품 데이터가 아니다.

## 3. 공개 TypeScript 계약

구현 위치는 기존 관례대로 `packages/ui-lynx/src/index.tsx`다. 다음 이름은 root export와
`@libitums/ui-lynx/round-button` subpath에서 동일한 `dist/index.jsx` / `dist/index.d.ts`로
해석된다.

```ts
export type RoundButtonVariant = "neutral" | "brand";
export type RoundButtonSize = "s" | "m" | "l" | "xl";

export type RoundButtonProps = {
  readonly accessibilityLabel: string;
  readonly icon: string;
  readonly variant?: RoundButtonVariant;
  readonly size?: RoundButtonSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly bindtap?: () => void;
};

export type RoundButtonContract = {
  readonly variant: RoundButtonVariant;
  readonly size: RoundButtonSize;
  readonly className: string;
  readonly traits: "button" | "disabled";
  readonly accessibilityLabel: string;
  readonly interactive: boolean;
};

export function getRoundButtonContract(props: RoundButtonProps): RoundButtonContract;
export function getRoundButtonForegroundColor(props: RoundButtonProps): string;
export function RoundButton(props: RoundButtonProps): JSX.Element;
```

`getRoundButtonContract`는 DOM·Lynx·시간·네트워크 부수효과가 없는 총함수다. 기본 variant/size,
아래 순서의 class, trait, Loading 이름 접미사, `!disabled && !loading`을 반환한다. 빈/공백
`accessibilityLabel`만 `Error("RoundButton accessibilityLabel must not be empty")`를 던진다.

class 순서는 고정한다.

```text
ui-lynx-round-button
ui-lynx-round-button-<variant>
ui-lynx-round-button-<size>
[ui-lynx-round-button-disabled]
[ui-lynx-round-button-loading]
```

`getRoundButtonForegroundColor`도 부수효과 없는 총함수이며 **icon SVG의 `current-color`에만**
사용한다. Loading에서는 icon이 없으므로 이 함수 결과를 Spinner에 전달하지 않는다.

| 조건 | 반환 |
|---|---|
| `disabled && neutral` | `color.gray[500]` |
| `disabled && brand` | `color.brand["reward-disabled-surface"]` |
| active neutral | `color.fg["neutral-subtle"]` |
| active brand | `color.fg.brand` |

Spinner 색은 순수 함수나 `current-color` 경로를 쓰지 않는다. state/variant class가 기존 CSS
token을 `border-color`에 직접 적용한다: active Loading Neutral은
`var(--libitum-color-fg-neutral-subtle)`, active Loading Brand는
`var(--libitum-color-fg-brand)`, `disabled && loading`은
`var(--libitum-color-border-default)`다.

`Pressed`는 CSS pseudo-state라 함수 입력이나 public prop에 추가하지 않는다. component는 함수
결과만 렌더하고 상태 판정 로직을 중복하지 않는다.

## 4. 렌더·상태 계약

| 입력/상태 | 관찰 가능한 결과 |
|---|---|
| Default | icon 존재, Spinner 부재, `data-disabled="false"`, `data-loading="false"`, tap 1회 전달 |
| Pressed | 활성 hit area press 동안 surface 95%; icon/current-color와 hit area 불변 |
| Loading | icon 부재, Spinner 존재, `data-loading="true"`, 이름에 `로딩 중`, tap 차단 |
| Disabled | icon 존재(Loading 결합 시 Spinner), `data-disabled="true"`, disabled trait, tap·focus ring 차단 |

Spinner는 12×12, `stroke.width.regular` 1.5의 **정적** 부분-border 표시다. design-system
component spec이 animation을 요구하지 않으므로 회전·keyframes·animation duration/easing을
추가하지 않으며 motion 계약을 발명하지 않는다. reduced motion에서는 Spinner에 별도 변화가
없고 Pressed의 95% scale만 제거한다. 장식 icon/Spinner는 named control의 자손이므로 래퍼
`accessibility-elements-hidden={true}`로 접근성 트리에서 제외한다. focus ring은 원본의
inner white 2 + outer border.strong 2를 hit area 바깥에 그리며 크기·hit area를 바꾸지 않는다.

## 5. test-id 계약

| 표면 | 안정적인 test-id / data |
|---|---|
| 조작·접근성 root hit area | `ui-lynx-round-button`; `data-variant`, `data-size`, `data-disabled`, `data-loading`을 항상 문자열로 제공 |
| 원형 surface | `ui-lynx-round-button-surface` |
| icon | `ui-lynx-round-button-icon` (Loading에서는 없음) |
| Spinner | `ui-lynx-round-button-spinner` (Loading에서만 있음) |

동적 ID, icon 이름 기반 ID, DOM 구조 전체 snapshot은 계약이 아니다.

## 6. Storybook 및 package 계약

- story title은 `Components/Round Button`, export는 `Default`, `Brand`, `Loading`,
  `Disabled` 네 개다.
- `RoundButtonStoryArgs`는 `accessibilityLabel`, `icon`, `variant`, `size`, `disabled`,
  `loading`, `onTap`을 가진다. Lynx init data로 가는 값은 string/boolean만이다. 함수
  `onTap`은 Controls를 끄고 manager Action에만 존재하므로 직렬화 경계를 넘지 않는다.
- icon Control은 SVG XML을 직접 노출하지 않는다. story entry가 보유한 닫힌 문자열 key
  (기본 `"info-02"`)를 serializable select로 받아 padding icon import에 매핑한다.
- `apps/storybook-lynx/src/round-button-story.ts`는 entry와 integration test가 함께 import하는
  `normalizeRoundButtonStoryArgs`와 `dispatchRoundButtonStoryTap`을 내보낸다. 전자는 unknown
  Controls 입력을 아래 JSON-cloneable init data로 기본화·검증하고, 후자는 같은 init data의
  `disabled || loading`이면 bridge를 호출하지 않고 `false`, 활성 상태면 정확히 한 번 호출하고
  `true`를 반환한다. `src/lynx/round-button.tsx`는 자체 복제 로직 없이 두 helper를 실제로 쓴다.

```ts
type RoundButtonInitData = {
  readonly accessibilityLabel: string;
  readonly icon: "info-02";
  readonly variant: RoundButtonVariant;
  readonly size: RoundButtonSize;
  readonly disabled: boolean;
  readonly loading: boolean;
};

type RoundButtonStoryAction = {
  readonly channel: "STORYBOOK_ACTION";
  readonly name: "onTap";
  readonly args: readonly [accessibilityLabel: string];
};

type RoundButtonStoryBridge = (action: RoundButtonStoryAction) => void;

function normalizeRoundButtonStoryArgs(input: unknown): RoundButtonInitData;
function dispatchRoundButtonStoryTap(
  data: RoundButtonInitData,
  bridge: RoundButtonStoryBridge,
): boolean;
```

- `apps/storybook-lynx/lynx.config.ts` entry key는 `round-button`, 산출물은
  `dist/lynx/round-button.web.bundle`이다. story는 `./lynx/round-button.web.bundle`만 사용한다.
- Lynx entry는 `@libitums/ui-lynx/round-button`을 소비한다. source path mapping은
  `tsconfig.typecheck.json`에만 둘 수 있고 Rspeedy 기본 config에는 둘 수 없다.
- `package.json#exports["./round-button"]`은 root와 같은 compiled runtime/declaration을
  가리킨다. pack 검사는 subpath 존재, 선언/JSX/CSS 포함, source/test/script 비포함,
  authored ReactLynx JSX 보존을 검증한다.

## 7. 계층별 테스트 계획

### unit — required

책임: UI에서 분리된 기본화·상태 우선순위·token 선택과 정적 CSS 계약을 검증한다.

- `packages/ui-lynx/src/index.unit.test.ts`: 두 variant, 네 size, class 순서, 기본값, Loading
  label, disabled/loading 조합, interactive truth table, 빈 label 오류를
  `getRoundButtonContract`에 단언한다. `getRoundButtonForegroundColor`의 위 네 행을 token
  상수와 identity로 비교한다.
- `packages/ui-lynx/src/styles.unit.test.ts`: S/M/L/XL visual frame 28/36/44/56, icon
  16/18/20/24, hit area의 exact `width`/`height` 48/48/48/56, Spinner 12와 1.5 stroke 및
  variant/state별 CSS `border-color`, radius.full, 95% active transform,
  disabled/loading active 차단 selector, focus ring 2+2, animation/keyframes 부재와
  reduced-motion의 pressed scale 제거를 source CSS 계약으로 검증한다. computed layout/색을
  증명했다고 해석하지 않는다.

### ui — required

책임: 단일 ReactLynx component의 렌더 구조·속성·상호작용을 검증한다.

- `packages/ui-lynx/src/index.ui.test.tsx`: 필수 name/trait와 data 속성, icon content 및
  icon 전용 `current-color`, Loading icon→정적 Spinner 대체와 장식 래퍼, 활성 tap 정확히 1회,
  loading/disabled tap 0회, 결합 상태 disabled trait와 Loading 이름을 검증한다.
- 스타일 계산·실제 48px layout·native focus 표시는 jsdom UI test 범위가 아니다.

```yaml
kind: test.ui.applicability
status: required
summary: "새 ReactLynx control의 렌더 결과와 tap 차단/전달이라는 관찰 가능한 동작이 추가된다."
artifact: docs/specs/round-button.md#ui--required
producedBy: specification
```

### integration — required

책임: public package export, Storybook manager→Lynx init data→bridge, 실제 build 산출물의 경계를 검증한다.

- package unit/pack 검사: root와 `./round-button` export가 같은 runtime/types로 해석되고 실제
  tarball 소비가 가능함을 검증한다.
- `apps/storybook-lynx/src/catalog.integration.test.ts`: `round-button.web.bundle`이 존재하고
  `SDRAWROF` header와 유의미한 크기를 가지며, 정적 index에 네 story ID가 있고,
  story bundle URL·Rspeedy entry·공개 subpath 소비가 서로 일치함을 검증한다.
- 별도 integration case는 **entry가 실제 import해 쓰는** `round-button-story.ts` helper를 직접
  실행한다. `normalizeRoundButtonStoryArgs` 결과가 함수/SVG XML/`undefined` 없이
  `JSON.parse(JSON.stringify(result))` 왕복 후 동일함을 단언한다. 그 결과로
  `dispatchRoundButtonStoryTap`을 실행해 active 한 번은 bridge
  `{channel: "STORYBOOK_ACTION", name: "onTap", args: [accessibilityLabel]}` 단일 envelope를
  정확히 1회 보내고,
  Loading와 Disabled 각각 및 결합 상태는 0회 보내는지 검증한다. helper source 문자열을
  읽는 정적 단언이나 test 전용 복제 함수는 이 실행 검증을 대신하지 못한다.

```yaml
kind: test.integration.applicability
status: required
summary: "package subpath와 실제 Rspeedy bundle, Storybook Controls/Action bridge라는 둘 이상의 모듈 경계가 새로 늘어난다."
artifact: docs/specs/round-button.md#integration--required
producedBy: specification
```

### e2e — not-applicable (자동 계층)

ADR-0006 D4가 자동 e2e 계층과 `test:e2e` 명령을 두지 않기로 고정했다. 이번 작업은 제품
route/native host를 수정하지 않으므로 그 결정을 뒤집을 사용자 흐름도 없다. 자동 e2e 파일이나
빈 script를 만들지 않는다. 다만 실제 Storybook 개발 서버를 띄워 Canvas의 Lynx Web bundle,
네 상태, Controls, 활성/차단 tap을 확인하는 수동 흐름은 required이며
`docs/e2e/ui-lynx-storybook.md`에 추가한다. native focus/VoiceOver/TalkBack은 제품 route가
package를 채택할 때의 비차단 후속이다.

```yaml
kind: test.e2e.applicability
status: not-applicable
summary: "ADR-0006 D4에 따라 자동 e2e 러너가 없고 제품/native route delta도 없다. 검증 부재가 아니라 기존 Storybook 수동 e2e 채널로 관찰한다."
artifact: docs/specs/round-button.md#e2e--not-applicable-자동-계층
producedBy: specification
```

## 8. 문서 영향 판정

```yaml
kind: documentation-impact
status: required
summary: "네 번째 공개 컴포넌트, 새 subpath, 네 story와 bundle, 수동 검증 흐름이 추가되어 현재 공개 카탈로그와 ADR의 표면 열거가 낡는다."
artifact: docs/specs/round-button.md#문서-영향-판정
producedBy: specification
affected:
  - packages/ui-lynx/README.md
  - apps/storybook-lynx/README.md
  - docs/adr/0025-ui-lynx-package-and-storybook-catalog.md
  - docs/e2e/ui-lynx-storybook.md
```

- package README: 공개 컴포넌트 수·root/subpath export·RoundButton 사용 예·접근성 및
  Loading/Disabled tap 계약을 추가한다.
- Storybook README: 디자인 원본 목록, build bundle 수, catalog 네 story와 RoundButton
  Controls/Action을 추가한다.
- ADR-0025: D4의 최초 공개 표면 세 개와 D0/D5/D6의 catalog/build 검증 열거를 RoundButton
  추가 결정으로 확장한다. 별도 신규 ADR은 필요 없다. 기존 경계나 방향을 뒤집지 않고 같은
  package/catalog 표면을 한 항목 늘리는 변경이기 때문이다.
- 수동 검증 문서: Round Button 네 story, variant/size/disabled/loading/icon key Controls,
  활성 Action 1회와 차단 상태, `round-button.web.bundle` 응답 및 48/56 hit-area overlay 확인을
  추가한다. native 미검증 문구는 유지한다.

## 9. applicability evidence와 contract diff

```yaml
kind: changed-files
status: recorded
artifact: docs/specs/round-button.md
producedBy: specification
files:
  - docs/specs/round-button.md
```

```yaml
kind: contract-diff
status: recorded
artifact: docs/specs/round-button.md#applicability-evidence와-contract-diff
producedBy: specification
refreezeReason:
  - "P1: design-system component spec에 없는 Spinner animation을 제거하고 정적 Spinner로 재판정"
  - "P1: hit area를 최소값이 아닌 exact width/height로 명확화"
  - "P1: SVG current-color와 view Spinner CSS border-color 경계를 분리"
  - "P1: Storybook helper의 실제 실행형 integration 검증을 고정"
before:
  publicComponents: [Button, BackHeader, StatusIndicator]
  roundButtonSubpath: absent
  roundButtonStoryBundle: absent
after:
  publicComponents: [Button, BackHeader, StatusIndicator, RoundButton]
  roundButtonSubpath: "@libitums/ui-lynx/round-button"
  roundButtonStoryBundle: "round-button.web.bundle"
unchanged:
  - product screens and native routes
  - Visual Novel
  - design-token repository and token vocabulary
  - authored JSX package format and ReactLynx peer boundary
  - automatic e2e exclusion
```

## 10. 병렬 구현 경계

계약 고정 뒤 다음은 서로 공개 이름을 재협의하지 않고 병렬 진행할 수 있다.

1. package 구현: 공개 타입·순수 함수·RoundButton JSX와 기존 `styles.css`의 전용 class.
2. package 검증: unit/UI/static CSS/pack export 검사.
3. Storybook 구현: story args, 네 story, Lynx entry, Rspeedy entry와 Action bridge.
4. Storybook 통합 검증: 실제 bundle·정적 index·직렬화/public export 경계 검사.
5. 문서화: 위 네 affected 문서 갱신과 최종 수동 Storybook 실행 기록.

명시한 가정은 `disabled && loading` 입력을 기존 Button 소비 현실과 맞춰 허용한다는 것,
그리고 빈 접근성 이름은 조용한 fallback보다 개발 오류로 다룬다는 것이다. 미해결 질문은 없다.
