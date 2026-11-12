import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  KEYS_AN,
  mountChatOpen,
  presenceProbe,
  tapId,
  tapKeys,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI24): 접근성 계약 — 알약 · 전구 · 「…」 · 보내기 · 토글은 button trait + 라벨, 토글 selected 낭독,
// 겹침이 열린 동안 머리 · 로그 · 독은 낭독에서 숨고 겹침 상자는 dialog 역할이다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

/** test-id 요소 자신이나 그 안쪽에서 접근성 이름을 가진 첫 요소입니다(RoundButton 같은 안쪽 결선 허용). */
function readable(testId: string): Element {
  const el = screen.getByTestId(testId);
  return el.hasAttribute("accessibility-label")
    ? el
    : (el.querySelector("[accessibility-label]") ?? el);
}

const labelOf = (testId: string): string =>
  readable(testId).getAttribute("accessibility-label") ?? "";
const traitsOf = (testId: string): string =>
  readable(testId).getAttribute("accessibility-traits") ?? "";

/** 요소 자신이나 조상 중 `accessibility-elements-hidden`인 것이 있는지. */
function hiddenFromReader(el: Element | null): boolean {
  for (let node = el; node !== null; node = node.parentElement) {
    if (node.getAttribute("accessibility-elements-hidden") === "true") return true;
  }
  return false;
}

test("MC-UI24. 기능 알약 둘은 button이고 이름에 가격이 든다", () => {
  mountChatOpen();

  expect(traitsOf(ids.snapshot)).toContain("button");
  // 사진 요청은 60엽전(사용자 결정 2026-11-10, CHAT_COIN_PRICES).
  expect(labelOf(ids.snapshot)).toBe("Snapshot, 60 coins");
  expect(traitsOf(ids.snapVoice)).toContain("button");
  expect(labelOf(ids.snapVoice)).toBe("Snap voice, 40 coins");
});

test("MC-UI24. 전구 · 「…」 · 보내기는 button이고 copy 라벨을 갖는다", () => {
  mountChatOpen();

  expect(traitsOf(ids.ideasButton)).toContain("button");
  expect(labelOf(ids.ideasButton)).toBe("Reply ideas");
  expect(traitsOf(ids.more)).toContain("button");
  expect(labelOf(ids.more)).toBe("More");
  expect(labelOf(ids.send)).toBe("Send");
});

test("MC-UI24. 보내기는 빈 글일 때 disabled trait이고 글이 생기면 button만 남는다", () => {
  mountChatOpen();
  expect(traitsOf(ids.send)).toContain("disabled");

  tapKeys(...KEYS_AN);

  expect(traitsOf(ids.send)).toContain("button");
  expect(traitsOf(ids.send)).not.toContain("disabled");
});

test("MC-UI24. 토글 두 칸은 button이고 켜진 칸만 selected가 낭독에 든다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });

  expect(traitsOf(ids.toggle("learning"))).toContain("button");
  expect(labelOf(ids.toggle("learning"))).toBe("Hangul keys, selected");
  expect(labelOf(ids.toggle("phone"))).toBe("Phone keyboard");

  tapId(ids.toggle("phone"));

  expect(labelOf(ids.toggle("learning"))).toBe("Hangul keys");
  expect(labelOf(ids.toggle("phone"))).toBe("Phone keyboard, selected");
});

test("MC-UI24. 머리 제목은 header trait이고 뒤로 · 설정 단추에 이름이 있다", () => {
  mountChatOpen();

  expect(screen.getByTestId(ids.title).getAttribute("accessibility-traits")).toBe("header");
  expect(labelOf(ids.back)).toBe("Back to chats");
  expect(labelOf(ids.settings)).toBe("Chat settings");
});

test("MC-UI24. 겹침이 없을 때는 머리 · 로그 · 독이 낭독에서 숨지 않는다", () => {
  mountChatOpen();

  expect(screen.getByTestId(ids.header)).toBeTruthy();
  expect(hiddenFromReader(screen.getByTestId(ids.header))).toBe(false);
  expect(hiddenFromReader(screen.getByTestId(ids.log))).toBe(false);
  expect(hiddenFromReader(screen.getByTestId(ids.composer))).toBe(false);
  expect(hiddenFromReader(screen.getByTestId(ids.featureRow))).toBe(false);
});

test("MC-UI24. 겹침이 열린 동안 머리 · 로그 · 독이 낭독에서 숨는다", () => {
  mountChatOpen();
  tapId(ids.more);
  tapId(ids.moreItem("ideas"));

  expect(screen.getByTestId(ids.regenDialog)).toBeTruthy();
  expect(hiddenFromReader(screen.getByTestId(ids.header))).toBe(true);
  expect(hiddenFromReader(screen.getByTestId(ids.log))).toBe(true);
  expect(hiddenFromReader(screen.getByTestId(ids.featureRow))).toBe(true);
  expect(hiddenFromReader(screen.getByTestId(ids.composer))).toBe(true);
  expect(hiddenFromReader(screen.getByTestId(ids.regenDialog))).toBe(false);
});

test("MC-UI24. 다시 만들기 확인 상자는 dialog 역할이다", () => {
  mountChatOpen();
  const hasDialogRole = (testId: string) => {
    const el = screen.getByTestId(testId);
    return (
      el.getAttribute("accessibility-role-description") === "dialog" ||
      el.querySelector('[accessibility-role-description="dialog"]') !== null
    );
  };

  tapId(ids.more);
  tapId(ids.moreItem("ideas"));
  expect(hasDialogRole(ids.regenDialog)).toBe(true);
});

test("MC-UI24. 사이드바 상자도 dialog 역할이다", () => {
  mountChatOpen();
  tapId(ids.settings);
  const sidebar = screen.getByTestId(ids.sidebar);
  expect(
    sidebar.getAttribute("accessibility-role-description") === "dialog" ||
      sidebar.querySelector('[accessibility-role-description="dialog"]') !== null,
  ).toBe(true);
});
