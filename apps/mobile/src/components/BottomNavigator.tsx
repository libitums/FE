// 바텀 네비게이션 셸입니다. 시각과 접근성은 ui-lynx의 `BottomNavigator`가 지고,
// 여기서는 앱의 `Tab` union을 그 컴포넌트의 문자열 id API로 옮기는 일만 합니다 —
// 그래야 탭 이름이 문자열로 흩어지지 않고 `Tab`이 계속 닫아 줍니다.

// 아이콘은 필요한 이름의 subpath만 가져옵니다. SVG XML 문자열을 그대로 받는
// `<svg content>` 경로를 씁니다(ADR-0014 D6).
//
// 여정은 `flag`가 아니라 `flag-03`입니다 — 디자인의 깃발은 오른쪽으로 뻗은 삼각
// 깃발이고, `flag`는 사각 깃발이라 모양이 다릅니다.
import flag from "@libitums/icons/lynx/flag-03";
import friends from "@libitums/icons/lynx/friends";
import message from "@libitums/icons/lynx/message";
import cross from "@libitums/icons/lynx/cross";

import { BottomNavigator as UiBottomNavigator } from "@libitums/ui-lynx/bottom-navigator";
import type { BottomNavigatorItem } from "@libitums/ui-lynx/bottom-navigator";

import type { ReactNode } from "@lynx-js/react";

import type { Tab } from "../app/navigation";
import { playSound } from "../lib/sound-effects";
import { useUiCopy } from "../lib/ui-copy";
import { moreIcon } from "./more-icon";

import "./bottom-navigator.css";

export type BottomNavigatorProps = {
  tab: Tab;
  onSelectTab: (tab: Tab) => void;
  /** 탭 NEW 배지(2026-11-13) — 글자 배지, 낭독은 탭 이름 뒤 「, new」. */
  badges?: Partial<Record<Tab, "new">>;
  /** 더보기 메뉴가 열려 있는가(ADR-0169) — 열린 동안 ⋯는 ×(brand-strong)이고 이름이 「Close menu」입니다. */
  moreOpen?: boolean;
};

// 항목은 모듈 내부 상수입니다. export하지 않고 props로도 받지 않습니다 — 네 탭은
// `Tab` union이 이미 닫아 두었습니다. 배열 순서가 좌→우 배치 순서입니다.
//
// `id`를 `Tab` 값과 같게 두는 것이 이 어댑터의 전부입니다. 아래 `toTab`이 되돌릴 때
// 이 전제에 기대고, timing flag 이름도 거기서 파생합니다 — 탭마다 따로 적으면 오타가
// 조용히 성능 수집을 끊습니다(ADR-0019). flag는 `libitum:navigation:<tab>`입니다.
const tabs: readonly { readonly id: Tab; readonly icon: string }[] = [
  { id: "journey", icon: flag },
  { id: "roleplay", icon: friends },
  { id: "messenger", icon: message },
  // 마지막은 늘 더보기 동그라미(ADR-0169) — 아이콘은 그릴 때 열림에 따라 ⋯ / ×. 새 탭(예: 랭킹)은 이 줄 앞에 한 줄 더하고
  // `Tab` · `initialNav.stacks` · 탭 이름표에 같은 id를 더합니다. 다섯이 되면 ui-lynx가 양끝 맞춤(항목 56)으로 놓습니다.
  { id: "more", icon: moreIcon },
];

// 탭 이름은 문구표에서 옵니다 — 언어가 바뀌면 항목을 다시 짓습니다.
function itemsFor(
  labels: Readonly<Record<Tab, string>>,
  badges: Partial<Record<Tab, "new">>,
  newCopy: { readonly badge: string; readonly spoken: string },
  moreOpen: boolean,
): readonly (BottomNavigatorItem & {
  readonly id: Tab;
})[] {
  return tabs.map((tab) => ({
    ...tab,
    ...(tab.id === "more" ? { variant: "action" as const, icon: moreOpen ? cross : moreIcon } : {}),
    accessibilityLabel: labels[tab.id],
    timingFlag: `libitum:navigation:${tab.id}`,
    ...(badges[tab.id] === "new"
      ? {
          badge: {
            kind: "label" as const,
            text: newCopy.badge,
            accessibilityLabel: newCopy.spoken,
          },
        }
      : {}),
  }));
}

// ui-lynx는 id를 `string`으로 돌려주므로 `Tab`으로 좁혀서 넘깁니다. 위 배열에 없는
// id가 오면 셸이 모르는 탭이라는 뜻이라, 조용히 넘기지 않고 버립니다.
function toTab(id: string): Tab | undefined {
  return tabs.find((tab) => tab.id === id)?.id;
}

export function BottomNavigator({
  tab,
  onSelectTab,
  badges = {},
  moreOpen = false,
}: BottomNavigatorProps): ReactNode {
  const copy = useUiCopy();
  // 탭 이름표 넷 — 더보기는 열린 동안 「Close menu」(×). 설정 탭 이름(`shell.tabs.settings`)은 더보기 메뉴의 Settings 줄이 씁니다.
  const labels: Readonly<Record<Tab, string>> = {
    journey: copy.shell.tabs.journey,
    roleplay: copy.shell.tabs.roleplay,
    messenger: copy.shell.tabs.messenger,
    more: moreOpen ? copy.more.menu.close : copy.more.menu.tab,
  };
  return (
    <UiBottomNavigator
      items={itemsFor(labels, badges, copy.shell.tabNew, moreOpen)}
      selectedId={tab}
      bindselect={(id) => {
        const next = toTab(id);
        if (next !== undefined) {
          playSound("button");
          onSelectTab(next);
        }
      }}
    />
  );
}
