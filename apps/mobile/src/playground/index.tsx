import { root, useState } from "@lynx-js/react";

// dev 전용 진입점입니다(lynx.config.ts). 화면 하나를 앱과 같은 셸 안에 격리해
// 띄우고, 피그마와 나란히 보며 디자인을 맞추는 자리입니다. 제품 번들에 들어가지
// 않습니다.
import "@libitums/design-tokens/css/variables.css";
import "@libitums/design-tokens/css/typography.css";
import "@libitums/ui-lynx/styles.css";
import "../app/app.css";
import "./playground.css";

import { current } from "./current";
import { playgroundScreens, type PlaygroundParams, type PlaygroundScreen } from "./screens";

function Playground() {
  // `current`에서 시작하고, 화면 콜백이 부르면 다음 화면으로 옮깁니다. key로
  // 화면 상태를 새로 엽니다.
  const [{ screen, params }, setState] = useState<{
    screen: PlaygroundScreen;
    params: PlaygroundParams;
  }>({ screen: current, params: {} });
  const go = (next: PlaygroundScreen, nextParams: PlaygroundParams = {}) =>
    setState({ screen: next, params: nextParams });
  return (
    <view className="app">
      <view className="app-content" key={screen}>
        {playgroundScreens[screen](go, params)}
      </view>
    </view>
  );
}

root.render(<Playground />);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
