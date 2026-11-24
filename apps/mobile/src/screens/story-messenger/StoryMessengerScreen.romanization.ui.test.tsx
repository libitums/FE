import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@lynx-js/react/testing-library";

import type { ChoiceRomanization } from "../../lib/session-options";
import { StoryMessengerScreen } from "./StoryMessengerScreen";
import { storyMessengerTestIds as ids, type StoryChatView } from "./story-messenger.contract";

// `ui` 계층(ADR-0188 D3): 메신저 막간 말풍선 · 답장 보기의 로마자 줄이 스위치를 따르는지 봅니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

const chat: StoryChatView = {
  counterpart: "미나",
  counterpartAvatarUrl: null,
  turns: [
    {
      kind: "message",
      self: false,
      speaker: "미나",
      text: { ko: "식당 찾았어요?", roman: "sikdang chajasseoyo?", en: "Found it?" },
      imageUrl: null,
      afterOption: null,
    },
    {
      kind: "message",
      self: true,
      speaker: "나",
      // 콘텐츠 로마자가 없는 줄 — 화면이 변환한 읽기로 채웁니다.
      text: { ko: "같이 가요", en: "Let's go together" },
      imageUrl: null,
      afterOption: null,
    },
    { kind: "reply", options: [{ ko: "아니요", roman: "aniyo", en: "No" }] },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(romanization?: ChoiceRomanization) {
  render(
    <StoryMessengerScreen
      insets={insets}
      chat={chat}
      onComplete={() => undefined}
      onExit={() => undefined}
      {...(romanization === undefined ? {} : { romanization })}
    />,
  );
  for (let i = 0; i < 10; i += 1) {
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  }
}

const bubbleIn = (testId: string) => within(screen.getAllByTestId(testId)[0] as HTMLElement);

test("SMR-U1. 켬이면 말풍선에 로마자 · 구분선 · 뜻이 서고, 콘텐츠 로마자가 없으면 변환한 읽기가 선다", () => {
  mount("shown");
  const incoming = bubbleIn(ids.incoming);
  expect(incoming.getByTestId("ui-lynx-chat-bubble-annotation-romanization").textContent).toBe(
    "sikdang chajasseoyo?",
  );
  expect(incoming.getByTestId("ui-lynx-chat-bubble-annotation-meaning").textContent).toBe(
    "Found it?",
  );
  expect(incoming.getByTestId("ui-lynx-chat-bubble").getAttribute("accessibility-label")).toBe(
    "미나: 식당 찾았어요?, Pronunciation: sikdang chajasseoyo?, Found it?",
  );
  const outgoing = bubbleIn(ids.outgoing);
  expect(outgoing.getByTestId("ui-lynx-chat-bubble-annotation-romanization").textContent).toBe(
    "gachi gayo",
  );
});

test("SMR-U2. 켬이면 답장 보기 아래에 로마자 · 영어 두 줄이 선다", () => {
  mount("shown");
  const option = screen.getByTestId(ids.option(0));
  expect(option.textContent).toContain("aniyo");
  expect(option.textContent).toContain("No");
});

test.each([["hidden" as const], [undefined]])(
  "SMR-U3. 끔(%s)이면 이 변경 전 모양 — 말풍선은 뜻 한 줄, 답장 보기에 로마자가 없다",
  (romanization) => {
    mount(romanization);
    const incoming = bubbleIn(ids.incoming);
    expect(incoming.queryByTestId("ui-lynx-chat-bubble-annotation-romanization")).toBeNull();
    expect(incoming.getByTestId("ui-lynx-chat-bubble-translation").textContent).toBe("Found it?");
    expect(screen.getByTestId(ids.option(0)).textContent).not.toContain("aniyo");
  },
);
