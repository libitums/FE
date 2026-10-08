import type { ReactNode } from "@lynx-js/react";

import { BottomNavigator } from "../components/BottomNavigator";
import type { Tab } from "./navigation";

// 탭 바 묶음(`.app-navigator`)입니다 — `components/BottomNavigator`와, 시스템 바가 터치를
// 가로채는 기기에서 탭 바 밑에 덧대는 바닥 면을 그립니다. 판정은 하지 않습니다:
// `floorHeight`는 `shellBottomLayout`의 결과를 받아 그리기만 합니다.
// `floorHeight`가 0이면 바닥 면 요소를 만들지 않습니다(iOS · 제스처의 트리가 수정 전과 같습니다).

export type AppNavigatorProps = {
  readonly tab: Tab;
  readonly onSelectTab: (tab: Tab) => void;
  /** 화면 위에 층이 떠 있는 동안 묶음을 낭독에서 뺍니다(`AppHeader`의 `obscured`와 같은 뜻). */
  readonly obscured: boolean;
  /** 탭 바 밑에 덧대는 바닥 면의 높이입니다. 0이면 덧대지 않습니다. */
  readonly floorHeight: number;
};

export function AppNavigator({
  tab,
  onSelectTab,
  obscured,
  floorHeight,
}: AppNavigatorProps): ReactNode {
  return (
    <view
      className="app-navigator"
      data-testid="app-navigator"
      accessibility-elements-hidden={obscured}
    >
      <BottomNavigator tab={tab} onSelectTab={onSelectTab} />
      {floorHeight > 0 ? (
        <view
          className="app-navigator-floor"
          data-testid="app-navigator-floor"
          style={{ height: `${floorHeight}px` }}
        />
      ) : null}
    </view>
  );
}
