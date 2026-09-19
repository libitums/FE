import { root } from "@lynx-js/react";

// 토큰 CSS는 진입점에서 한 번만 불러온다. `:root`에 커스텀 프로퍼티가 올라가야
// 모든 화면의 `var(--libitum-*)`가 값을 얻는다 (ADR-0014 D1).
import "@libitums/design-tokens/css/variables.css";
import "@libitums/design-tokens/css/typography.css";

// LIB-261 (ui-implementation): 로그인·코드 검증이 소비하는 `TextField`의 CSS
// 진입점(계약 §2.6·§9.2). subpath 하나만 부른다 — aggregate
// `@libitums/ui-lynx/styles.css`는 소비하지 않는 컴포넌트 열여섯의 CSS까지
// 번들에 들인다.
import "@libitums/ui-lynx/text-field/styles.css";

import { App } from "./App";

root.render(
  <App
    messengerEventSink={null}
    visualNovelEventSink={null}
    phoneCallEventSink={null}
    notificationEventSink={null}
    settingsEventSink={null}
    entryEventSink={null}
  />,
);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
