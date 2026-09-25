import { root, useState } from "@lynx-js/react";

// dev 전용 진입점입니다(lynx.config.ts). 화면 하나를 앱과 같은 셸 안에 격리해
// 띄우고, 피그마와 나란히 보며 디자인을 맞추는 자리입니다. 제품 번들에 들어가지
// 않습니다.
import "@libitums/design-tokens/css/variables.css";
import "@libitums/design-tokens/css/typography.css";
import "@libitums/ui-lynx/styles.css";
import "../app/app.css";
import "./playground.css";

import { BottomNavigator } from "../components/BottomNavigator";
import type { Tab } from "../app/nav-state";
import { current } from "./current";
import {
  playgroundScreens,
  playgroundTabs,
  type PlaygroundParams,
  type PlaygroundScreen,
} from "./screens";

function Playground() {
  // `current`에서 시작하고, 화면 콜백이 부르면 다음 화면으로 옮깁니다. key로
  // 화면 상태를 새로 엽니다.
  const [{ screen, params }, setState] = useState<{
    screen: PlaygroundScreen;
    params: PlaygroundParams;
  }>({ screen: current, params: {} });
  const go = (next: PlaygroundScreen, nextParams: PlaygroundParams = {}) =>
    setState({ screen: next, params: nextParams });

  // 탭을 눌러도 화면은 그대로 둡니다 — playground에는 아직 옮겨 온 화면이 하나뿐
  // 이라, 여기서 옮기면 빈 화면이 뜹니다. 선택 상태만 바꿔 바의 선택 시각을 봅니다.
  const [tab, setTab] = useState<Tab>("journey");
  const screenTab = playgroundTabs[screen];

  return (
    // 앱 셸은 호스트가 넘긴 safe area 값으로 아래 여백을 잡습니다(App.tsx). Lynx
    // Explorer는 그 값을 넘기지 않아(lib/safe-area.ts) 여기서는 0이 되고, 그러면 바가
    // 화면 바닥에 붙어 실제 앱과 다르게 보입니다. 앱 셸이 바가 설 때 두는 것과 같은
    // 값을 대신 두어 두 쪽이 같은 모습이 되게 합니다 — dev 전용 셸이라 제품 번들에
    // 들어가지 않습니다.
    <view className="app" style={{ paddingBottom: screenTab === undefined ? "34px" : "12px" }}>
      <view className="app-content" key={screen}>
        {playgroundScreens[screen](go, params)}
      </view>
      {screenTab === undefined ? null : (
        <view className="app-navigator">
          <BottomNavigator tab={tab} onSelectTab={setTab} />
        </view>
      )}
    </view>
  );
}

root.render(<Playground />);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
