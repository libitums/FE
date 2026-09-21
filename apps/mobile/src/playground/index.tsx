import { root } from "@lynx-js/react";

// dev 전용 진입점 (lynx.config.ts). 화면 하나를 앱과 같은 셸 안에 격리해 띄우고,
// 피그마와 나란히 보며 디자인을 맞추는 자리다. 제품 번들에 들어가지 않는다.
import "@libitums/design-tokens/css/variables.css";
import "@libitums/design-tokens/css/typography.css";
import "@libitums/ui-lynx/styles.css";
import "../app/app.css";
import "./playground.css";

import { current } from "./current";
import { playgroundScreens } from "./screens";

function Playground() {
  const Screen = playgroundScreens[current];
  return (
    <view className="app">
      <view className="app-content">
        <Screen />
      </view>
    </view>
  );
}

root.render(<Playground />);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
