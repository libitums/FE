import { expect, test } from "vitest";

import { messengerChatWiring } from "./messenger-chat-wiring";
import { navReducer, showsTabNavigator } from "./nav-reducer";
import type { Nav, NavAction } from "./nav-state";
import { initialNav } from "./nav-state";

// `unit` 계층(MW-U1): 메신저 탭 위에 쌓인 화면이 접근 안내로 대신 그려질 때(ADR-0128 리뷰 W1) 안내의 「Go to Journey」가 메신저
// 스택도 루트로 접는다 — 접지 않으면 메신저 탭을 다시 누를 때마다 탭 바 없는 같은 안내가 선다(2026-11-17 UX 점검).

test("MW-U1 Go to Journey는 메신저 탭 스택을 루트로 접고 여정 탭 루트로 간다", () => {
  let nav: Nav = {
    ...initialNav,
    tab: "messenger",
    stacks: {
      ...initialNav.stacks,
      messenger: [{ name: "messenger-list" }, { name: "messenger-chat", roomId: "mina" }],
    },
  };
  const dispatch = (action: NavAction) => {
    nav = navReducer(nav, action);
  };
  messengerChatWiring({ dispatch, imageUrlOf: () => null }).messengerChat.onGoToJourney();
  expect(nav.tab).toBe("journey");
  expect(nav.stacks.messenger).toEqual([{ name: "messenger-list" }]);
  expect(showsTabNavigator(nav)).toBe(true);
  nav = navReducer(nav, { type: "switchTab", tab: "messenger" });
  expect(showsTabNavigator(nav)).toBe(true);
});
