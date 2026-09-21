import { GlobalPropsProvider, root } from "@lynx-js/react";

// 토큰 CSS는 진입점에서 한 번만 불러온다. `:root`에 커스텀 프로퍼티가 올라가야
// 모든 화면의 `var(--libitum-*)`가 값을 얻는다 (ADR-0014 D1).
import "@libitums/design-tokens/css/variables.css";
import "@libitums/design-tokens/css/typography.css";

// LIB-261 (ui-implementation): 로그인·코드 검증이 소비하는 `TextField`의 CSS
// 진입점(계약 §2.6·§9.2). subpath 하나만 부른다 — aggregate
// `@libitums/ui-lynx/styles.css`는 소비하지 않는 컴포넌트 열여섯의 CSS까지
// 번들에 들인다.
import "@libitums/ui-lynx/text-field/styles.css";
// 온보딩이 소비하는 AnswerLabel · Button · Card · ChatBubble · PageIndicator · RoundButton · StatusIndicator의 CSS 진입점. 같은 이유로 subpath만 부른다.
import "@libitums/ui-lynx/answer-label/styles.css";
import "@libitums/ui-lynx/button/styles.css";
import "@libitums/ui-lynx/card/styles.css";
import "@libitums/ui-lynx/chat-bubble/styles.css";
import "@libitums/ui-lynx/page-indicator.css";
import "@libitums/ui-lynx/round-button/styles.css";
import "@libitums/ui-lynx/status-indicator/styles.css";

import { App } from "./App";

// `GlobalPropsProvider`가 있어야 호스트가 뒤늦게 넘기는 safe area 값에 `useGlobalProps`가
// 다시 그린다(lib/safe-area.ts).
root.render(
  <GlobalPropsProvider>
    <App
      messengerEventSink={null}
      visualNovelEventSink={null}
      phoneCallEventSink={null}
      notificationEventSink={null}
      settingsEventSink={null}
      entryEventSink={null}
    />
  </GlobalPropsProvider>,
);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
