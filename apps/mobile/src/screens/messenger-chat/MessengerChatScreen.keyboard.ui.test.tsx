import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  mountChatOpen,
  presenceProbe,
  slotContent,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI12): 방이 열릴 때 한국어 키보드 탐지 결과에 따라 처음 키보드와 토글 줄이 정해진다
// (keyboardPlanFor 표 — 계산은 unit). 입력 칸은 늘 마운트된 `<input>` 하나다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

test.each(["unknown", "absent"] as const)(
  "MC-UI12. 탐지가 %s이면 학습 키보드로 시작하고 토글 줄이 보인다",
  (presence) => {
    mountChatOpen({ probe: presenceProbe(presence) });

    expect(screen.getByTestId("messenger-keyboard")).toBeTruthy();
    expect(slotContent()).toBe("learning-keyboard");
    expect(screen.getByTestId(ids.toggleRow)).toBeTruthy();
    expect(screen.getByTestId(ids.field).getAttribute("data-keyboard")).toBe("learning");
  },
);

test("MC-UI12. 탐지가 present이면 휴대폰 키보드로 시작하고 토글 줄이 없으며 자리는 빈 자리 표시다", () => {
  mountChatOpen({ probe: presenceProbe("present") });

  expect(screen.queryByTestId(ids.toggleRow)).toBeNull();
  expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
  expect(slotContent()).toBe("phone-spacer");
  expect(screen.getByTestId(ids.field).getAttribute("data-keyboard")).toBe("phone");
});

test("MC-UI12. 토글은 두 칸이고 켜진 칸만 data-selected이며 낭독에 selected가 든다", () => {
  mountChatOpen({ probe: presenceProbe("unknown") });

  const learning = screen.getByTestId(ids.toggle("learning"));
  const phone = screen.getByTestId(ids.toggle("phone"));
  expect(learning.getAttribute("data-selected")).toBe("true");
  expect(phone.getAttribute("data-selected")).toBe("false");
  expect(learning.getAttribute("accessibility-label")).toBe("Hangul keys, selected");
  expect(phone.getAttribute("accessibility-label")).toBe("Phone keyboard");
  expect(learning.getAttribute("accessibility-traits")).toBe("button");
  expect(phone.getAttribute("accessibility-traits")).toBe("button");
});

test("MC-UI12. 입력 칸은 늘 마운트된 <input>이고 길이 제한 · 보내기 키 · 읽기 전용 아님을 갖는다", () => {
  mountChatOpen({ probe: presenceProbe("unknown") });

  const input = screen.getByTestId(ids.input);
  expect(input.tagName.toLowerCase()).toBe("input");
  expect(input.getAttribute("maxlength")).toBe("200");
  expect(input.getAttribute("confirm-type")).toBe("send");
  expect(input.hasAttribute("readonly")).toBe(false);
});

test("MC-UI12. 학습 키보드로 시작해도 <input>은 이미 마운트되어 있다(숨은 입력 패턴)", () => {
  mountChatOpen({ probe: presenceProbe("absent") });

  expect(screen.getByTestId(ids.input)).toBeTruthy();
  expect(screen.getByTestId(ids.display)).toBeTruthy();
});

test("MC-UI12. 입력 줄에는 전구 · 입력 칸 · 보내기가 한 입력 줄 안에 있다", () => {
  mountChatOpen();

  const composer = screen.getByTestId(ids.composer);
  expect(composer.contains(screen.getByTestId(ids.ideasButton))).toBe(true);
  expect(composer.contains(screen.getByTestId(ids.field))).toBe(true);
  expect(composer.contains(screen.getByTestId(ids.send))).toBe(true);
});
