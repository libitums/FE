# Round Button — 디자인 고정 증거

- 대상: `@libitums/ui-lynx`가 앞으로 제공할 Round Button과
  `apps/storybook-lynx`의 검증 story
- 이 문서가 지는 것: 구현이 그대로 대조할 구조, variant, size, state, token, motion,
  focus/hit-area 규칙과 upstream gap
- 이 문서가 지지 않는 것: props·export 이름, JSX/CSS 구현, story 구성, design-system 원본 변경
- 원본: `libitum/design-system/components/round-button.md`,
  `foundations/accessibility.md`, `color.json`, `spacing.json`, `radius.json`, `stroke.json`,
  `motion.json`, `iconography.json` (2026-09-10 열람)
- 소비 규칙: ADR-0014 D1·D2·D4·D9, ADR-0015 D2, ADR-0025 D0·D4·D5

## 1. 고정 상태

**시각 계약은 고정됐고 구현 가능 상태다.** 색, radius, stroke, hit area,
S/L/XL 아이콘 크기, focus ring, pressed timing과 reduced-motion 정책은 기존 token으로 닫힌다.
반면 원본이 직접 `현재 대응 토큰 없음`이라고 표시한 **M 아이콘 18px**과
**Spinner 12px**은 FE에서 token 이름을 만들 수 없다. 다만 두 값과 surface의 28/36/44/56은
component 원본이 직접 고정한 authoritative component 값이므로 그대로 구현할 수 있다.
§8의 upstream gap은 비차단으로 보고한다.

이 문서는 그 결핍을 `spacing.12`, 새 CSS 변수, 임의 hex로 덮지 않는다. 특히
`spacing.12`는 12px이라는 값이 같아도 **간격 token**이지 Spinner size token이 아니다.
원본에 명시된 18px과 12px을 직접 쓰는 것은 새 값을 발명하는 우회가 아니라 component
계약을 소비하는 것이다.

## 2. 구조와 에셋

```text
Focusable hit area (원형, input/semantics 경계)
└── Visual surface (원형)
    └── padding variant Icon
        └── Loading일 때 Icon을 대체하는 Spinner
```

- surface는 `radius.full`, `color.gray.100`, border/shadow 없음이다.
- 아이콘은 `icon.$extensions.com.libitum.iconography.variants.padding` 변형만 쓴다.
  `no-padding` 변형과 섞지 않는다.
- SVG는 `fill="currentColor"` 원본이다. ReactLynx에서는 CSS `color`가 아니라
  `<svg current-color={...}>`에 `@libitums/design-tokens`의 TypeScript color 상수를 넘긴다.
  크기·surface·ring은 CSS 변수로 소비한다(ADR-0014 D1·D2).
- Icon과 Spinner는 동시에 보이지 않는다. Loading은 같은 자리에 Spinner만 렌더한다.

## 3. Size 매핑

| size | visual surface | Icon | 구현 token | focusable hit area / ring 기준 |
|---|---:|---:|---|---:|
| S | 28 × 28px | 16 × 16px | `--libitum-icon-size-xs` | `--libitum-spacing-48` 정사각 |
| M | 36 × 36px | 18 × 18px | **없음 — GAP-RB-01** | `--libitum-spacing-48` 정사각 |
| L | 44 × 44px | 20 × 20px | `--libitum-icon-size-sm` | `--libitum-spacing-48` 정사각 |
| XL | 56 × 56px | 24 × 24px | `--libitum-icon-size-md` | visual surface와 같은 56 × 56 |

visual surface는 항상 고정 정사각이며 Icon의 실측 크기로 늘거나 줄지 않는다. 위 28/36/44/56은
foundation token으로 재구성하지 않고 component 원본의 고정 규격을 그대로 쓴다.
`spacing` token의 임의 덧셈이나 FE 전용 size token을 만들지 않는다.

S/M/L의 바깥 48 × 48 영역은 투명 padding 또는 부모 control로 확보한다. 이 영역 전체가
tap과 keyboard/D-pad focus 및 접근성 semantics의 단일 target이다. 이웃 control의 hit area와
겹치면 안 된다. XL은 visual surface 자체가 공통 48 최소값보다 크므로 56 × 56 전체가 target이다.

## 4. Variant와 state 매핑

모든 표의 배경색은 CSS 변수, Icon 색은 ReactLynx `current-color`에 넘기는 TS 상수다.
Spinner는 CSS border color로 같은 semantic color를 사용한다.

### 4.1 Neutral

| state | surface | Icon / Spinner | opacity | scale |
|---|---|---|---:|---:|
| Default | `--libitum-color-gray-100` | `color.fg["neutral-subtle"]` / `--libitum-color-fg-neutral-subtle` | 100% | 100% |
| Pressed | `--libitum-color-gray-100` | Default와 같음 | 100% | 95% |
| Loading | `--libitum-color-gray-100` | Spinner `--libitum-color-fg-neutral-subtle` | 100% | 100% |
| Disabled | `--libitum-color-gray-50` | `color.gray[500]` / `--libitum-color-gray-500` | Icon 35% | 100% |

### 4.2 Brand

| state | surface | Icon / Spinner | opacity | scale |
|---|---|---|---:|---:|
| Default | `--libitum-color-gray-100` | `color.fg.brand` / `--libitum-color-fg-brand` | 100% | 100% |
| Pressed | `--libitum-color-gray-100` | Default와 같음 | 100% | 95% |
| Loading | `--libitum-color-gray-100` | Spinner `--libitum-color-fg-brand` | 100% | 100% |
| Disabled | `--libitum-color-gray-50` | `color.brand["reward-disabled-surface"]` / `--libitum-color-brand-reward-disabled-surface` | Icon 35% | 100% |

Disabled의 35%는 component 원본이 고정한 값이고 대비 수치 예외가 적용된다. 다른 상태에
opacity를 전파하지 않는다.

### 4.3 Loading + Disabled

공개 API가 두 값을 함께 받을 때는 기존 `Button` precedent를 그대로 사용한다.

| 속성 | 고정 |
|---|---|
| semantics / interaction | Disabled 우선: disabled trait, tap 차단, focus 순서 제외 |
| surface | `--libitum-color-gray-50` |
| content | Icon 대신 Spinner 유지 |
| Spinner color | `--libitum-color-border-default` |
| scale / focus ring | 100%; ring 없음 |

### 4.4 Spinner

| 속성 | 고정 |
|---|---|
| frame | 12 × 12px — **대응 token 없음, GAP-RB-02** |
| stroke | `--libitum-stroke-width-regular` |
| radius | `--libitum-radius-full` |
| color | Neutral은 `--libitum-color-fg-neutral-subtle`, Brand는 `--libitum-color-fg-brand` |
| 위치 | Icon을 대체해 visual surface 중앙 |

## 5. Pressed와 motion

- Pressed는 visual surface만 중심점을 유지한 채 95%로 축소한다. focusable hit area와 주변
  layout은 움직이거나 줄지 않는다.
- 전환 시간은 `--libitum-motion-duration-pressed`, easing은
  `--libitum-motion-easing-easing`을 사용한다. foundation에서 pressed를 “크기 변화와 색 변화”의
  micro interaction으로 정의한다.
- 원본은 Spinner 회전을 요구하지 않는다. 회전 주기나 keyframe을 발명하지 않고 정적인
  Spinner로 구현한다.

### Reduced motion

시스템의 동작 줄이기가 켜지면 `motion.$extensions.com.libitum.reduced-motion`을 그대로 따른다.

- 감지: Web `@media (prefers-reduced-motion: reduce)`; iOS
  `UIAccessibility.isReduceMotionEnabled`; Android `Settings.Global.TRANSITION_ANIMATION_SCALE`.
- 이동·확대를 제거한다. 따라서 Pressed의 95% scale은 적용하지 않는다.
- Spinner는 기본 상태부터 정적이므로 reduced motion에서 별도의 대체 animation이나 opacity
  transition을 추가하지 않는다. accessible busy/처리 중 상태와 Icon→Spinner 교체는 유지한다.

## 6. Focus와 접근성

Focused는 별도 state가 아니라 Default·Pressed·Loading 위에 결합되는 layer다.

| layer | token |
|---|---|
| inner ring | `--libitum-stroke-width-strong` solid `--libitum-color-white` |
| outer ring | `--libitum-stroke-width-strong` solid `--libitum-color-border-strong` |
| 두 ring 사이 | `--libitum-spacing-0` |
| surface 바깥 총 범위 | `--libitum-spacing-4` |
| shape | `--libitum-radius-full` |

- ring은 visual surface가 아니라 §3의 **focusable hit area 바깥 윤곽**을 따른다.
- ring은 layout/hit-area 크기를 바꾸지 않으며 clipping되면 안 된다.
- Disabled는 focus 순서에서 제외하고 ring을 표시하지 않는다.
- Web keyboard focus는 `:focus-visible`; forced colors 또는 host system indicator가 더 강하면
  기본 indicator를 제거하지 않는다. ReactLynx host별 keyboard focus 지원은 native에서 확인한다.
- icon-only control은 행동 목적을 나타내는 accessible name이 필수다. Icon/Spinner는 장식
  자손으로 숨기고 control 하나만 접근성 node가 된다.
- Loading은 같은 node와 accessible name을 유지하고 busy/처리 중 상태를 programmatic하게
  알린다. Disabled는 programmatic disabled state를 제공하고 tap을 전달하지 않는다.
- Storybook Lynx는 visual/tap surface일 뿐 keyboard, VoiceOver, TalkBack, native focus ring을
  증명하지 않는다. 제품 route 채택 시 iOS/Android 실기 검증이 필수다(ADR-0025 D5).

## 7. 구현 대조표

| 축 | 닫힌 계약 |
|---|---|
| variant | Neutral / Brand만 허용 |
| size | S / M / L / XL; visual frame과 hit area를 분리 |
| base states | Default / Pressed / Loading / Disabled |
| focused 조합 | Default+Focused, Pressed+Focused, Loading+Focused; Disabled+Focused는 금지 |
| asset | padding icon variant; Loading에서는 Spinner로 교체 |
| icon color | TS token → `current-color` (ADR-0014의 유일한 CSS 예외) |
| other visuals | `@libitums/design-tokens`가 내보내는 `--libitum-*` CSS 변수만 |
| motion | pressed=d3/기본 easing; Spinner는 정적; reduced motion에서는 pressed 확대/축소 제거 |

## 8. Design-system gap과 blocker 판정

| id | 결핍 | 금지하는 우회 | 영향 / 요청할 결정 |
|---|---|---|---|
| GAP-RB-01 | M Icon 18 × 18 size token 없음 | 새 FE token, `calc()`/scale로 다른 token 변형 | 원본의 18px을 직접 적용하므로 비차단. design-system에 icon size token 추가 요청 |
| GAP-RB-02 | Spinner 12 × 12 size token 없음 | `spacing.12`를 size token처럼 재해석, 새 FE token | 원본의 12px을 직접 적용하므로 비차단. design-system에 Spinner size token 추가 요청 |

**Blocker: 없음.** GAP-RB-01~02는 token 체계의 추적 항목이지만 component 원본이 정확한 값을
직접 제공하므로 전체 matrix를 구현하고 검증할 수 있다. 구현은 새 token이나 hex를 만들지 않고,
두 gap 값에만 원본의 px 값을 직접 적용한다.

## 9. ADR / README 영향 근거

- **이 디자인 문서만 추가하는 현재 변경에는 ADR 수정이 필요 없다.** ADR-0014 D4와
  ADR-0025 D4의 “필요 token이 없으면 만들지 않는다” 결정을 그대로 적용한 결과다.
- 구현 범위를 승인할 때는 ADR-0025 D0의 design-system 원본 목록과 D4의 첫 공개 표면을
  Round Button까지 확장해야 한다. 이는 공개 package surface 확대 결정이다.
- GAP-RB-01~02의 px 값은 component 원본이 직접 정한 값이므로 ADR-0014 D4가 금지한 “FE에서
  새 값을 정하는 우회”가 아니다. ADR을 바꾸지 않고 구현하되 upstream token 보강은 요청한다.
- 구현 시 `packages/ui-lynx/README.md`에는 공개 subpath, variant/size/state, accessible-name 및
  native focus 검증 한계를 추가하고, `apps/storybook-lynx/README.md`에는 Round Button story와
  대표 matrix를 추가한다.
- `docs/adr/README.md`의 보류 표에는 GAP-RB-01~02를 “Round Button size token” 한 행으로
  묶어 upstream 요청을 추적한다. 구현을 막는 보류로 표기하지 않는다.
