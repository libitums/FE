# Storybook Lynx catalog

브라우저 Storybook manager와 Controls/Actions를 사용하되, Canvas는 DOM으로 흉내 내지 않고
Rspeedy가 만든 Lynx Web bundle을 `<lynx-view>`에서 실행한다. 기반 통합 방식은
[`lynx-community/storybook-lynx`](https://github.com/lynx-community/storybook-lynx)의
`storybook-lynx-rsbuild` framework다.

컴포넌트의 시각·상태 계약은 `libitums/design-system`의 `components/button.md`,
`components/header/back-header.md`, `components/indicator/status-indicator.md`,
`components/round-button.md`, `components/bottom-navigator.md`를 기준으로 하며, 최초 보정 revision은
`87c1b0d2b745429be9b586cef772deb6c8707ab6`이다.
Bottom Navigator는 2026-09-11의 `main` revision
`2144145cd7ffb5777cf2b74e2fec5474eb0adc14`를 기준으로 추가했다.

```sh
nvm use
pnpm storybook:lynx
```

기본 URL은 `http://localhost:6006`이다. 포트가 점유되면 Storybook이 출력한 URL을 따른다.
명령은 먼저 Button·Back Header·Status Indicator·Round Button·Bottom Navigator의 다섯
`.web.bundle`을 만들고,
Rspeedy watch와 Storybook dev server를 함께 유지한다.

Storybook의 dev/build는 `@libitums/ui-lynx`를 먼저 build하고 package의 공개 `dist` export를
소비한다. `tsconfig.typecheck.json`의 source mapping은 코드 생성을 하지 않는 타입 검사에만
쓰며 Rspeedy 기본 설정에는 적용하지 않는다.

`pnpm --filter @libitums/storybook-lynx test`도 먼저 `@libitums/ui-lynx`와 정적 Storybook을
build한 뒤 산출물을 검사하므로 이전 실행에서 남은 `dist` 없이 동작한다.

## 카탈로그

- Components/Button — Default, Brand, Loading, Disabled
- Components/Back Header — Default, Title Only
- Components/Status Indicator — Completed, In Progress, Needs Retry, Locked
- Components/Round Button — Default, Brand, Loading, Disabled
- Components/Bottom Navigator — Default, Long Accessibility Label, All Items, Disabled

Controls 변경은 `<lynx-view>.updateData()`를 통해 ReactLynx `useInitData()`에 전달된다.
Button·Round Button tap과 Back Header back/info tap은
`NativeModules.bridge.call("STORYBOOK_ACTION", …)`로 Storybook Actions에 돌아온다.
Round Button Controls는 `accessibilityLabel`, 닫힌 icon key `info-02`, variant, size, disabled,
loading을 제공한다. 활성 tap은 `onTap` Action을 한 번 기록하고 Loading·Disabled tap은 기록하지
않는다. 함수와 SVG XML은 init data 직렬화 경계를 넘지 않는다.

Bottom Navigator Controls는 preset, selectedId, disabledLast와 320/390px viewport를 제공한다.
Default는 4개 item의 active/inactive와 dot/count badge를, Long Accessibility Label은 화면에
그리지 않는 긴 접근성 이름을, All Items는 320px에서 5개 item의 최소 지원 폭을 보여준다.
enabled item tap은 선택 pill을 해당 item으로 옮기고 `onSelect` Action에 id를 한 번 기록한다.
disabled item은 선택 상태와 Action을 변경하지 않는다. Controls의 `selectedId`를 바꾸면 runtime의
선택 상태도 해당 값으로 다시 동기화된다.
Disabled preset은 별도 `disabledReason`을 직렬화하고 runtime이 그 이유를 item의 접근성 이름에
합치는 공개 계약도 확인한다.
story runtime은 root barrel이나 workspace source가 아니라
`@libitums/ui-lynx/bottom-navigator` 공개 subpath만 소비한다.

## 한계

Lynx Web은 props, 상태, 레이아웃, 토큰과 bridge 상호작용을 빠르게 확인하는 카탈로그다.
Canvas는 시각·tap 확인 표면이며 브라우저 DOM의 키보드·스크린리더 접근성 검증으로 세지
않는다. iOS/Android 고유 글꼴 렌더링, VoiceOver/TalkBack의 실제 읽기 순서, native gesture
차이, safe-area/host 통합도 검증하지 않는다. 현재 제품 소비 route가 없어 native 접근성은
미검증이지만 이번 package/catalog 납품에는 비차단이다. package 채택 릴리스에서는 실제
native host와 실기기 검증이 필수다. 특히 Bottom Navigator의 키보드/D-pad 선형 이동, 첫·마지막
item 경계 focus 유지와 선택 상태 낭독은 Storybook Canvas 통과로 대체하지 않는다.
