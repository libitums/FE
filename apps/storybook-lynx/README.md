# Storybook Lynx catalog

브라우저 Storybook manager와 Controls/Actions를 사용하되, Canvas는 DOM으로 흉내 내지 않고
Rspeedy가 만든 Lynx Web bundle을 `<lynx-view>`에서 실행한다. 기반 통합 방식은
[`lynx-community/storybook-lynx`](https://github.com/lynx-community/storybook-lynx)의
`storybook-lynx-rsbuild` framework다.

```sh
nvm use
pnpm storybook:lynx
```

기본 URL은 `http://localhost:6006`이다. 포트가 점유되면 Storybook이 출력한 URL을 따른다.
명령은 먼저 Button·Back Header·Status Indicator의 `.web.bundle`을 만들고, Rspeedy watch와
Storybook dev server를 함께 유지한다.

## 카탈로그

- Components/Button — Default, Brand, Loading, Disabled
- Components/Back Header — Default, Title Only
- Components/Status Indicator — Completed, In Progress, Needs Retry, Locked

Controls 변경은 `<lynx-view>.updateData()`를 통해 ReactLynx `useInitData()`에 전달된다.
Button tap과 Back Header back/info tap은 `NativeModules.bridge.call("STORYBOOK_ACTION", …)`로
Storybook Actions에 돌아온다.

## 한계

Lynx Web은 props, 상태, 레이아웃, 토큰과 bridge 상호작용을 빠르게 확인하는 카탈로그다.
iOS/Android 고유 글꼴 렌더링, VoiceOver/TalkBack의 실제 읽기 순서, native gesture 차이,
safe-area/host 통합은 검증하지 않는다. 그 항목은 각 native host와 실기기에서 확인한다.
