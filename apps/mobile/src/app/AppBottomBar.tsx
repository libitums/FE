import { useState } from "@lynx-js/react";
import type { Dispatch, ReactNode } from "@lynx-js/react";

import { MoreMenu } from "../components/MoreMenu";
import { useLayerBack } from "../lib/use-back-handler";
import { AppNavigator } from "./AppNavigator";
import type { MoreWiring } from "./more-wiring";
import type { Nav, NavAction, Tab } from "./nav-state";

export type AppBottomBarProps = {
  readonly nav: Nav;
  readonly dispatch: Dispatch<NavAction>;
  readonly more: MoreWiring;
  readonly obscured: boolean;
  readonly floorHeight: number;
  readonly badges?: Partial<Record<Tab, "new">>;
};

// 탭 바 + 더보기 메뉴(ADR-0168)입니다. 넷째 단추(⋯)는 탭을 바꾸지 않고 메뉴 카드를 열고 닫습니다 — 열린 동안 ×, 다시 누르거나
// 바깥(투명 막)을 누르거나 시스템 뒤로면 닫힙니다. 메뉴 줄은 more 탭으로 가며 고른 화면을 루트로 세웁니다(그동안 ⋯는 선택 C).
// 다른 탭을 고르면 메뉴를 닫고 그 탭으로 갑니다. 단어장 줄의 수는 열 때 기기 단어장에서 읽습니다(이벤트 핸들러 · 배경 스레드).
export function AppBottomBar({
  nav,
  dispatch,
  more,
  obscured,
  floorHeight,
  badges,
}: AppBottomBarProps): ReactNode {
  const [menu, setMenu] = useState<{ readonly words: number; readonly due: number } | null>(null);
  const close = () => setMenu(null);
  useLayerBack(menu === null ? null : close);

  const handleSelectTab = (tab: Tab) => {
    if (tab !== "more") {
      setMenu(null);
      dispatch({ type: "switchTab", tab });
      return;
    }
    if (menu !== null) {
      setMenu(null);
      return;
    }
    more.emit({ name: "more_menu_opened" });
    setMenu(more.wordbookCounts());
  };

  return (
    <AppNavigator
      tab={nav.tab}
      badges={badges}
      obscured={obscured}
      floorHeight={floorHeight}
      moreOpen={menu !== null}
      onSelectTab={handleSelectTab}
    >
      {menu === null ? null : (
        <MoreMenu
          words={menu.words}
          due={menu.due}
          onClose={close}
          onSelect={(root) => {
            setMenu(null);
            more.onSelectMoreRoot(root, nav);
          }}
        />
      )}
    </AppNavigator>
  );
}
