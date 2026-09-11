# BottomNavigator 변경 스펙

- 상태: frozen
- 기준 디자인: `libitums/design-system/components/bottom-navigator.md`
- 범위: `packages/ui-lynx` 공개 컴포넌트와 `apps/storybook-lynx` 카탈로그
- 비범위: `apps/mobile/src/components/BottomNavigator.tsx`의 교체·삭제·이관

## 요구사항과 책임

`BottomNavigator`는 앱의 최상위 목적지 3~5개를 아이콘 전용 bar로 렌더한다. 소비자가
`selectedId`를 소유하는 controlled component이며 자체 선택 상태나 데이터 fetch를 갖지 않는다.
한 번에 정확히 하나의 enabled item만 선택할 수 있다.

컴포넌트 트리는 `BottomNavigator` → 내부 items row → 내부 cell → 40×40 surface → 장식 icon과
선택적 badge다. cell만 focusable/accessibility element이고 icon과 badge는 장식 자손이다.

데이터 흐름은 `items + selectedId` → 순수 `getBottomNavigatorContract` → 렌더 계약 순서다.
enabled cell tap은 `bindselect(id)`를 한 번 호출한다. disabled cell은 handler를 연결하지 않는다.
서버·store·API가 없으므로 `state-data` 단계는 “controlled props 밖의 상태/데이터 책임 없음”으로
생략한다.

## 공개 계약

- `BottomNavigatorItem`은 enabled/disabled discriminated union이다. 공통으로 비어 있지 않고 고유한
  `id`, 비어 있지 않은 `accessibilityLabel`, Lynx SVG XML `icon`, 선택적 badge를 갖는다. enabled는
  `availability?: "enabled"`, disabled는 `availability: "disabled"`와 비어 있지 않은
  `disabledReason`을 반드시 갖는다. 생략한 availability는 enabled다.
- badge는 `{ kind: "dot"; accessibilityLabel: string }` 또는
  `{ kind: "count"; count: positive integer }`다. count는 화면에서 `99+`로 제한하지만 접근성
  이름에는 실제 개수를 보존한다.
- `BottomNavigatorProps`: `items`, `selectedId`, 선택적 `bindselect(id)`를 갖는다. callback이 없어도
  enabled cell의 시각·접근성 계약은 변하지 않는다.
- `getBottomNavigatorContract(props)`는 container class, item-count class와 입력 순서가 보존된 item
  계약을 반환한다. 입력을 변경하지 않는다. item 계약은 exact class ordering, selected/disabled,
  interaction, accessibility name/trait, default/pressed icon token, badge render kind/text를 닫는다.
- 오류: item 수가 3~5 밖, 빈 id/name/disabledReason, 중복 id, 유효하지 않은 badge, 없거나
  disabled인 selectedId는 즉시 오류다.

stable test ID는 root `ui-lynx-bottom-navigator`, cell
`ui-lynx-bottom-navigator-item-{id}`, icon
`ui-lynx-bottom-navigator-icon-{id}-{default|pressed}`, badge
`ui-lynx-bottom-navigator-badge-{id}`다. root는 `data-count`, cell은 `data-id`,
`data-selected`, `data-disabled`를 노출한다. enabled cell은 입력 순서 기반 `focus-index`와 안정적인
focus id를 가지며 좌우 이동은 disabled를 건너뛴다. 첫·마지막 enabled cell의 바깥 방향은 자기
자신을 가리켜 bar 밖으로 예기치 않게 이탈하지 않는다.

## 시각·접근성 계약

bar는 사용자 지정 FE override인 `white`, 위쪽 `radius.md`, 디자인 정본의 upward shadow와 하단 safe area를
쓴다. 정본의 보이는 40px cell과 최소 48×48 focusable hit area를 함께 지키기 위해 세로 inset은
`20 + 48 + 20 = 88px`로 해석한다. 40px visual surface 기준으로는 원본의 24px inset이다.

default icon은 `fg.neutral-subtle`, pressed는 `fg.neutral-muted`, selected surface/icon은
`brand.primary`/`fg.neutral-inverted`, selected pressed surface는 `brand.primary-pressed`, disabled
icon은 `fg.disabled`다. selected의 60×40 pill은 비색상 형태 단서이며 `data-selected`와
접근성 이름의 `선택됨` 접미사가 상태를 중복 전달한다.

3/4개는 정본의 32px 간격을 목표 폭에서 유지한다. 5개와 작은 viewport에서는 48px hit area를
우선하고 남은 폭을 `space-between`으로 분배한다. 5개 지원 최소 viewport는 좌우 24px inset과
cell 폭을 합친 300px다. 그 미만은 이 컴포넌트의 보장 범위 밖이다. 접근성 이름은 시각 text로
렌더하지 않으므로 긴 이름과 글자 배율이 bar layout을 늘리거나 자르지 않는다.

dot은 `feedback.incorrect`, count는 `feedback.incorrect-strong-surface`와
`fg.neutral-inverted`/`typography.label.s`를 쓴다. badge 정보는 cell 이름에 합치고 badge 자체는
장식으로 숨긴다.

enabled cell은 PC에서 focusable이고 CSS `:focus-visible` double ring을 표시한다. disabled cell은
button role과 `disabledReason`이 합쳐진 이름을 유지하되 focus 순서와 tap에서 제외한다. Lynx의
`accessibility-traits`는 disabled 값을 지원하지 않으므로 유효한 `button` 값을 사용하고
`data-disabled`, handler 부재, focus 제외로 상태를 함께 표현한다. 정적/UI test는 focus 속성과 이동 연결을 검증하지만 Storybook은 실제
native focus 이동, VoiceOver/TalkBack 이름·trait, safe-area를 증명하지 않는다. 실제 제품 route가
이 package를 채택할 때 iOS/Android 실기기로 동작을 검증한다.

## package와 Storybook 계약

`@libitums/ui-lynx/bottom-navigator`는
`dist/bottom-navigator/{index.js,index.d.ts,BottomNavigator.jsx,BottomNavigator.d.ts,bottom-navigator.css}`를
제공한다. root barrel은 같은 값/타입을 재수출하고 aggregate `styles.css`는 component CSS를
import한다. packed JSX는 보존되고 source/test/script는 tarball에 새지 않는다.

Storybook runtime은 위 public subpath만 import한다. init data에는 icon key와 JSON data만 넘기고
raw SVG와 callback은 넘기지 않는다. bridge envelope는 enabled tap만
`STORYBOOK_ACTION/onSelect(id)`를 한 번 전달하고 runtime의 controlled selection을 해당 id로
갱신한다. Controls의 `selectedId`가 바뀌면 로컬 선택 상태를 다시 동기화한다. story는 Default, Long Accessibility Label,
All Items, Disabled를 제공하고 active/inactive, dot/count badge, 3~5 items, disabled 및 상호작용을
확인한다. Canvas 폭은 작은 viewport 경계를 보는 320px story를 포함한다.

## Test plan

- unit — required: pure validation/selection/name/badge/token/class/order/non-mutation 및 CSS token·geometry.
- ui — required: item 렌더, controlled selection, 장식 자손 숨김, SVG 색, badge, enabled/disabled tap,
  긴 접근성 이름, disabled를 건너뛰는 좌우 focus 연결과 양끝 self-boundary.
- integration — required: root/subpath identity, exports, aggregate CSS, 독립 dist 선언/CSS/JSX,
  pack contract, Storybook public import/bundle/index/bridge/serialization.
- e2e — required manual result: `docs/e2e/ui-lynx-storybook.md`의 Storybook 흐름으로 320/390px Canvas,
  모든 상태와 Action을 확인한다. focus 속성은 정적/UI test로 닫고 native keyboard·D-pad 동작과
  screen reader는 제품 채택 전에는 비차단 후속 경계다.

측정 요구는 없다. 따라서 analytics/performance event를 추가하지 않는다.

병렬 작업 단위는 package unit/UI, Storybook integration, 문서화, 최종 읽기 전용 접근성 감사다.
공용 barrel/export/aggregate CSS는 통합 단계에서 한 번만 수정한다.

## Documentation impact

```yaml
kind: documentation-impact
status: required
summary: "공개 컴포넌트, package subpath, Storybook catalog와 수동 검증 흐름이 늘어난다."
paths:
  - packages/ui-lynx/README.md
  - apps/storybook-lynx/README.md
  - docs/adr/0025-ui-lynx-package-and-storybook-catalog.md
  - docs/e2e/ui-lynx-storybook.md
artifact: docs/specs/bottom-navigator.md#documentation-impact
producedBy: specification
```

이 계약은 frozen이다. 시각 정본과 충돌하거나 제품 앱 이관이 필요해지면 구현에서 추측하지 않고
요구사항/스펙 단계로 되돌린다.
