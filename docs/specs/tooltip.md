# Tooltip 계약

- 시각 원본: `libitums/design-system/components/tooltip.md` revision
  `5c7bce3eb2c0d214de78bcec0c52d7b7395e8a19`
- 상태: **고정**
- measurement: 없음. 제품 route가 없는 UI primitive라 분석 이벤트를 추가하지 않는다.

## 1. 범위와 수용 기준

`@libitums/ui-lynx`에 트리거 옆의 짧은 설명만 그리는 `Tooltip`을 추가한다. 트리거, 열기 조건,
동시 노출 제어, Auto timer와 dismiss 입력은 소비 host가 소유한다.

1. Placement `top | bottom | start | end`, Alignment `start | center | end`, Arrow `on | off`,
   Tone `brand | neutral`을 독립 조합한다. Start/End는 direction에 따라 논리 방향으로 배치한다.
2. Bubble은 최대 240px, padding 8×12px, `body.m`, radius 12px, floating z-index를 사용하고
   Message 외 interactive child를 받지 않는다.
3. Brand는 `brand.strong`, Neutral은 `gray.950`, Message와 Arrow는
   `fg.neutral-inverted`를 사용한다. `brand.primary` Button 예외를 Tooltip에 적용하지 않는다.
4. Arrow는 밑변 12px × 높이 6px이며 Bubble 모서리에서 최소 12px 떨어진다. Arrow 끝과
   Trigger 사이에는 2px가 남도록 Bubble과 Trigger를 8px 띄운다.
5. `resolveTooltipLayout`은 trigger/bubble/boundary 측정값으로 기본 위치를 계산하고, 주축이
   경계를 벗어나면 반대 placement로 Flip하며 교차 축은 16px 경계 안으로 Shift한다. Shift 뒤
   Arrow가 모서리 여백을 지키지 못하면 Arrow를 끈다.
6. `visibility="hidden | visible"` 전환은 100ms opacity만 사용한다. Hidden은 접근성 트리에서도
   숨고 Visible Bubble은 focusable하지 않으며 trigger pointer를 가로채지 않는다.
7. 학습 콘텐츠는 비어 있지 않은 `languageTag`를 요구하고 metadata로 보존한다.

## 2. 상태와 데이터 흐름

```text
host trigger/open state -> optional host measurement -> resolveTooltipLayout -> Tooltip
host pointer/focus/press/programmatic + dismiss                         -> visibility
```

Tooltip은 timer, global singleton, ESC/뒤로가기 listener, outside tap listener와 focus state를
내부에 만들지 않는다. host가 측정 layout을 전달하지 않으면 가장 가까운 positioned host를
기준으로 placement/alignment CSS를 적용한다.

## 3. 공개 타입과 통합 경계

- root와 `@libitums/ui-lynx/tooltip`이 `Tooltip`, `getTooltipContract`,
  `resolveTooltipLayout` 및 관련 타입을 내보낸다.
- component CSS는 aggregate styles와 `@libitums/ui-lynx/tooltip/styles.css`에 포함한다.
- package build/pack은 authored ReactLynx JSX, declaration, canonical contract와 CSS를 보존한다.
- Web `aria-describedby`와 앱의 대응 설명 API 연결은 trigger를 소유한 host 책임이다.

## 4. UI와 Storybook 계약

root test id는 `ui-lynx-tooltip`, 장식 Arrow는 `ui-lynx-tooltip-arrow`다. Storybook title은
`Components/Tooltip`, story는 Top, Bottom, Start, End, Brand, No Arrow, Aligned Start,
Learning Language다. Controls는 JSON 직렬화 가능한 시각 props만 전달한다.

## 5. 계층별 테스트 계획

- unit: 기본값, 논리 방향, 입력 검증, Flip·Shift·Arrow fallback과 token CSS를 검사한다.
- ui: visible/hidden 접근성, non-focusable/event-through, Arrow 조건부 렌더와 layout 좌표를 검사한다.
- integration: root/subpath/CSS export, tarball artifact, Rspeedy entry와 정적 story index를 검사한다.
- e2e: 제품 route가 없어 비적용이다. pointer/focus/press, ESC/뒤로가기, outside tap, Auto timer,
  재측정과 native 설명 연결은 실제 host 채택 시 검증한다.

## 6. 불확실성·가정·추적성

- ReactLynx component가 trigger geometry를 소유하지 않으므로 host가 측정값을 제공하고 순수
  resolver가 배치를 소유하는 경계로 정했다.
- ReactLynx 0.125에 HTML `aria-describedby`와 같은 공개 prop이 없어 Bubble message metadata와
  접근성 text만 제공하며 trigger-description 결선은 native host gate로 남긴다.
- 한 화면 하나의 Tooltip, Pointer/Focus/Press/Programmatic trigger와 Auto/Sticky dismiss는
  제품 상태 규칙이므로 이 visual primitive의 props로 중복하지 않는다.
