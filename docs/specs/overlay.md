# Overlay 계약

- 시각 원본: `libitums/design-system/components/overlay.md` revision
  `89a8fa557d94c52423d47a3a1e839a45c5f23fe7`
- 상태: **고정**
- measurement: 없음. 분석 이벤트, sink, payload를 추가하지 않는다.

## 1. 범위와 수용 기준

`@libitums/ui-lynx`에 target 위 dim/blur 층만 그리는 `Overlay`를 추가한다. foreground와 그
action은 소비 host가 sibling으로 소유하며 `Overlay`는 `children`을 받지 않는다.

1. `scope="screen"`은 viewport 전체를 가리고 `surface="sheet" | "dialog"`를 반드시 받는다.
   sheet는 `dismiss="none" | "tap"`, dialog는 `dismiss="none"`만 허용한다. Tap은
   `binddismiss`를 반드시 동반하고 tap마다 한 번 호출한다.
2. `scope="area"`는 가장 가까운 positioned parent를 채우며 `dismiss="none"`만 허용한다.
   host는 부모에 `position: relative`와 `overflow: hidden`을 제공한다.
3. dim은 design-system의 `gray.950` #1A1C20 45%인 `rgba(26, 28, 32, 0.45)`다. 대응 semantic
   token이 없어 이 값만 원본 고정값으로 쓴다.
4. `blur="on"`은 Lynx `blur-view`의 `blur-radius="4px"`를 쓴다. 미지원 플랫폼과 투명도 감소
   환경의 fallback은 blur 없는 dim이며 host가 `blur="off"`로 매핑한다.
5. 표시 중에는 `event-through={false}`로 target pointer 입력을 차단한다. Overlay 자체는
   focusable하지 않고 접근성 트리에서 숨긴다.
6. Screen host는 target을 접근성 트리에서 숨기고 focus를 foreground 안에 가두고 복귀시키는
   책임을 가진다. Area host는 target의 개별 control을 접근성 트리에서 제외한다.
7. `phase="entering" | "visible" | "exiting"`으로 opacity 전환을 명시한다. Area는 150ms color,
   sheet는 300ms sheet, dialog는 250ms dialog token을 쓴다. reduced도 opacity를 유지하되
   100ms linear를 쓴다. phase가 visible이 아닐 때만 `bindmotionend`를 전달한다.
8. 한 modal surface에 Screen Overlay는 하나만 두며 Overlay 위에 Overlay를 중첩하지 않는다.

## 2. 상태와 데이터 흐름

```text
host state -> Target sibling -> Overlay -> Foreground sibling
                                | tap (sheet only)
                                -> binddismiss -> host close state
```

네트워크, API schema, cache, persistence, global state는 없다. `getOverlayContract`는 props를
class, interaction과 기본값으로 바꾸는 결정적 순수 함수다. blur/motion은 기본 `off`/`standard`,
phase/dismiss는 기본 `visible`/`none`이다.

## 3. 공개 타입과 통합 경계

공개 props는 `AreaOverlayProps | SheetOverlayProps | DialogOverlayProps` 판별 유니온이다.
Area에 surface/Tap, Dialog에 Tap, Tap에 callback이 없는 조합은 TypeScript에서 거부하고 순수
contract도 JavaScript 소비자의 잘못된 조합을 런타임에서 거부한다.

- root와 `@libitums/ui-lynx/overlay`가 같은 구현, 타입과 `getOverlayContract`를 내보낸다.
- component CSS는 aggregate styles와 `@libitums/ui-lynx/overlay/styles.css`에 모두 포함한다.
- package build/pack은 authored ReactLynx JSX, declaration, canonical contract, CSS를 보존한다.
- 기존 BottomSheet/Dialog 작업 브랜치는 수정하지 않는다. 해당 host가 채택할 때 기존 자체
  scrim을 이 primitive로 교체하는 것은 별도 통합 작업이다.

## 4. UI와 Storybook 계약

안정적인 test id는 root의 `ui-lynx-overlay` 하나이며 `data-scope`를 노출한다. blur off는
`view`, on은 `blur-view`다. foreground를 Overlay 안에 넣지 않는다.

Storybook title은 `Components/Overlay`, story는 `SheetDismissible`, `DialogModal`, `Area`,
`AreaBlur`, `ReducedMotion`이다. args는 JSON 직렬화 가능한 scope/surface/blur/dismiss/phase/motion만
Lynx init data로 보내며 callback은 bridge Action으로 되돌린다. 잘못된 Area/Dialog Tap 조합은
normalizer가 `none`으로 보정한다.

## 5. 계층별 테스트 계획

### unit — applicable

기본값, 판별 조합, 잘못된 dismiss 거부와 class 파생을 검사한다.

### ui — applicable

scope별 요소, 4px blur-view, event 차단, 접근성 숨김, tap callback과 animation end 전달,
색·z-index·motion CSS token을 검사한다.

### integration — applicable

root/subpath/CSS export, tarball artifact, Storybook Rspeedy entry, JSON normalizer, Action bridge와
정적 catalog story를 검사한다.

### e2e — not applicable

제품 route와 native host 연결은 이번 범위에 없다. Storybook visual 확인은 수행하지만 실제
VoiceOver/TalkBack focus trap, safe area, Android blur capture, iOS blur와 투명도 감소 설정은
제품 host 채택 시 실기기 E2E로 닫는다.

## 6. 불확실성·가정·추적성

- 사용자가 Overlay도 같은 UI primitive 흐름으로 요청했고 기존 Card Storybook을 유지 중이므로
  별도 제품 route 통합 없이 package+catalog를 산출한다고 가정했다.
- semantic overlay color token이 원본에도 없으므로 raw rgba 사용은 의도된 gap이다.
- `blur-view`는 Web 공식 지원 표기가 없어서 Storybook에서는 fallback 품질만 보며 native blur
  완료 증거로 사용하지 않는다.
- Screen 안전 영역은 fixed viewport dim이 포함하고, foreground의 safe-area padding은 host가
  소유한다.

| 수용 기준 | 증거 |
|---|---|
| Scope/blur/dismiss 판별 계약 | `Overlay.unit.test.ts`, TypeScript typecheck |
| dim, fill, z-index, motion | `Overlay.ui.test.tsx`, Storybook visual |
| package 공개 경계 | `index.integration.test.ts`, `check-pack.mjs` |
| Storybook 직렬화/Action | `catalog.integration.test.ts`, static Storybook build |
| native focus/blur/safe area | 후속 제품 host E2E, 이번 범위 비적용 |
