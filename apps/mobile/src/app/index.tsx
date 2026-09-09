import { root } from "@lynx-js/react";

// 토큰 CSS는 진입점에서 한 번만 불러온다. `:root`에 커스텀 프로퍼티가 올라가야
// 모든 화면의 `var(--libitum-*)`가 값을 얻는다 (ADR-0014 D1).
import "@libitums/design-tokens/css/variables.css";
import "@libitums/design-tokens/css/typography.css";

import { App } from "./App";

root.render(<App messengerEventSink={null} />);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
