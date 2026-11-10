import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@lynx-js/react/testing-library";

import { ChatIncomingRow, ChatOutgoingRow, ChatPhoto, ChatTextBubble } from "./ChatMessageRow";
import { realChildren } from "../../lib/dom.test-support";

// `ui` 계층(MC-UI3): 공용 말풍선 줄 — 상대 줄 = 숨긴 아바타 + 쌓음 > children 순서, 내 줄 클래스,
// ChatTextBubble 값(size m · ko · 번역 null이면 번역 없음), ChatPhoto 두 비율.

afterEach(cleanup);

const avatar = { name: "미나", imageUrl: "https://cdn/mina.webp" };

test("MC-UI3. 상대 줄은 숨긴 아바타 다음에 쌓음 상자가 있고 children이 그 안 순서대로 든다", () => {
  render(
    <ChatIncomingRow avatar={avatar} testId="row-in">
      <view data-testid="child-a" />
      <view data-testid="child-b" />
    </ChatIncomingRow>,
  );

  const row = screen.getByTestId("row-in");
  expect(row.className).toContain("chat-row");
  expect(row.className).not.toContain("chat-row-outgoing");
  const [first, second] = realChildren(row);
  expect(first?.getAttribute("data-testid")).toBe("ui-lynx-avatar");
  expect(first?.getAttribute("accessibility-elements-hidden")).toBe("true");
  expect(second?.className).toContain("chat-stack");
  expect(realChildren(second).map((c) => c.getAttribute("data-testid"))).toEqual([
    "child-a",
    "child-b",
  ]);
  expect(within(row).getByTestId("ui-lynx-avatar-image").getAttribute("src")).toBe(
    "https://cdn/mina.webp",
  );
});

test("MC-UI3. 그림이 없는 아바타는 사진 대신 이니셜 면이다", () => {
  render(
    <ChatIncomingRow avatar={{ name: "점원", imageUrl: null }} testId="row-in">
      <view />
    </ChatIncomingRow>,
  );

  expect(screen.queryByTestId("ui-lynx-avatar-image")).toBeNull();
  expect(screen.getByTestId("ui-lynx-avatar-initials")).toBeTruthy();
});

test("MC-UI3. 내 줄은 chat-row-outgoing 클래스이고 아바타 없이 children만 든다", () => {
  render(
    <ChatOutgoingRow testId="row-out">
      <view data-testid="child-a" />
    </ChatOutgoingRow>,
  );

  const row = screen.getByTestId("row-out");
  expect(row.className).toContain("chat-row");
  expect(row.className).toContain("chat-row-outgoing");
  expect(screen.queryByTestId("ui-lynx-avatar")).toBeNull();
  expect(within(row).getByTestId("child-a")).toBeTruthy();
});

test("MC-UI3. 텍스트 말풍선은 크기 m · 학습 언어 ko이고 번역 줄을 그대로 그린다", () => {
  render(
    <ChatTextBubble direction="incoming" speaker="미나" message="안녕하세요" translation="Hello" />,
  );

  const bubble = screen.getByTestId("ui-lynx-chat-bubble");
  expect(bubble.getAttribute("data-size")).toBe("m");
  expect(bubble.getAttribute("data-language")).toBe("learning");
  expect(bubble.getAttribute("data-lang")).toBe("ko");
  expect(bubble.getAttribute("data-direction")).toBe("incoming");
  expect(screen.getByTestId("ui-lynx-chat-bubble-message").textContent).toBe("안녕하세요");
  expect(screen.getByTestId("ui-lynx-chat-bubble-translation").textContent).toBe("Hello");
});

test("MC-UI3. translation이 null이면 번역 줄이 없다", () => {
  render(<ChatTextBubble direction="outgoing" speaker="나" message="안녕" translation={null} />);

  expect(screen.getByTestId("ui-lynx-chat-bubble").getAttribute("data-direction")).toBe("outgoing");
  expect(screen.queryByTestId("ui-lynx-chat-bubble-translation")).toBeNull();
});

test("MC-UI3. ChatPhoto는 비율마다 클래스가 다르고 src를 싣는다", () => {
  const { rerender } = render(
    <ChatPhoto src="https://cdn/a.webp" aspect="portrait-9x16" testId="photo" />,
  );
  expect(screen.getByTestId("photo").className).toContain("chat-photo-9x16");
  expect(screen.getByTestId("photo").getAttribute("src")).toBe("https://cdn/a.webp");

  rerender(<ChatPhoto src="https://cdn/a.webp" aspect="portrait-3x4" testId="photo" />);
  expect(screen.getByTestId("photo").className).toContain("chat-photo-3x4");
  expect(screen.getByTestId("photo").className).not.toContain("chat-photo-9x16");
});
