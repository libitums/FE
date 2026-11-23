import { expect, test } from "vitest";

import { messengerChatWiring } from "./messenger-chat-wiring";
import { currentScreen, navReducer } from "./nav-reducer";
import type { Nav, NavAction } from "./nav-state";
import { initialNav } from "./nav-state";

// `unit` 계층(MP-U1, 2026-11-17 기기 보고): 방 사이드바의 My profile은 User profile을 지금 탭(메신저) 스택에 쌓는다 —
// 설정 탭으로 옮겨 쌓으면 뒤로가 설정 탭 첫 화면에 닿아 방으로 돌아오지 못했다. 한 칸 뒤로가 그 방이다.

test("MP-U1 My profile은 메신저 스택에 프로필을 쌓고, 한 칸 뒤로가 그 방이다", () => {
  const roomStack = [
    { name: "messenger-list" },
    { name: "messenger-chat", roomId: "mina" },
  ] as const;
  let nav: Nav = {
    ...initialNav,
    tab: "messenger",
    stacks: { ...initialNav.stacks, messenger: [...roomStack] },
  };
  const dispatch = (action: NavAction) => {
    nav = navReducer(nav, action);
  };
  messengerChatWiring({ dispatch, imageUrlOf: () => null }).messengerChat.onOpenMyProfile();

  expect(nav.tab).toBe("messenger");
  expect(currentScreen(nav)).toEqual({ name: "profile" });
  expect(nav.stacks.more).toEqual(initialNav.stacks.more);

  nav = navReducer(nav, { type: "back" });
  expect(nav.stacks.messenger).toEqual(roomStack);
});
