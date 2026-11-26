import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { ChatTextBubble } from "./ChatMessageRow";

// `ui` 계층(CL1 ~ CL4, ADR-0188 개정 D8): 메신저 텍스트 말풍선의 줄 순서 — [한국어 / 로마자] 묶음 → 구분선 → 뜻.
// 로마자가 없으면 한국어 → 구분선 → 뜻, 뜻도 없으면 구분선이 없다. 클래스 이름으로 줄을 셉니다.

afterEach(cleanup);

const ROMAN = "ui-lynx-chat-bubble-annotation-romanization";
const DIVIDER = "ui-lynx-chat-bubble-annotation-divider";
const MEANING = "ui-lynx-chat-bubble-annotation-meaning";
const TRANSLATION = "ui-lynx-chat-bubble-translation";

const lines = (): string[] => {
  const bubble = screen.getByTestId("ui-lynx-chat-bubble");
  const found = bubble.querySelectorAll(
    `[data-testid='ui-lynx-chat-bubble-message'], .${ROMAN}, .${DIVIDER}, .${MEANING}, .${TRANSLATION}`,
  );
  return Array.from(found).map((line) =>
    line.getAttribute("data-testid") === "ui-lynx-chat-bubble-message" ? "ko" : line.className,
  );
};

test("CL1. 로마자 · 뜻 묶음이면 한국어 → 로마자 → 구분선 → 뜻", () => {
  render(
    <ChatTextBubble
      direction="incoming"
      speaker="미나"
      message="안녕"
      translation={null}
      annotation={{
        romanization: "annyeong",
        meaning: "Hi",
        spokenRomanization: "Pronunciation: annyeong",
      }}
    />,
  );

  expect(lines()).toEqual(["ko", ROMAN, DIVIDER, MEANING]);
});

test("CL2. 번역만 있으면 한국어 → 구분선 → 뜻(번역 줄 · 로마자 줄 없음)", () => {
  render(<ChatTextBubble direction="incoming" speaker="미나" message="안녕" translation="Hi" />);

  expect(lines()).toEqual(["ko", DIVIDER, MEANING]);
  expect(screen.getByTestId(MEANING).textContent).toBe("Hi");
  expect(screen.getByTestId("ui-lynx-chat-bubble").getAttribute("accessibility-label")).toBe(
    "미나: 안녕, Hi",
  );
});

test("CL3. 번역이 없거나 공백뿐이면 구분선도 없다", () => {
  render(<ChatTextBubble direction="incoming" speaker="미나" message="안녕" translation="  " />);

  expect(lines()).toEqual(["ko"]);
});

test("CL4. 내 말풍선(주황 면)도 같은 순서다 — 색은 chat.css가 흰 계열로 덮는다", () => {
  render(
    <ChatTextBubble direction="outgoing" speaker="나" message="고마워" translation="Thanks" />,
  );

  expect(lines()).toEqual(["ko", DIVIDER, MEANING]);
});
