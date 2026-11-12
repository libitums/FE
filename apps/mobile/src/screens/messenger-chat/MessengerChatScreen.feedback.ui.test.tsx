import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import { chatFeedbackTestIds as fb } from "./chat-feedback.contract";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatFixtureSeed } from "./chat-source.contract";
import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  mountChat,
  nativeInput,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { messengerChatTestIds as roomIds } from "./messenger-chat.contract";
import { myMessageTestIds as ids } from "./my-message.contract";

// `integration` 계층(CR-I1 ~ I6): 방 화면 + 가짜 출처 — 고친 문장 다시 보내기 · 👍 👎 · 👎 시트 · 신고 길(ADR-0129).

vi.mock("./chat-input-focus", async (importOriginal) => ({
  ...(await importOriginal<typeof inputFocus>()),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

const timing = CHAT_PLACEHOLDERS.timing;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 12, 12, 0, 0));
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const COFFEE = "저 커피 좋아해요.";
const FIX = {
  original: COFFEE,
  corrected: "저는 커피를 좋아해요.",
  changes: [{ start: 1, end: 2 }],
  kind: "correction",
  items: [{ original: "저", corrected: "저는", reason: "Add 는 to mark the topic." }],
  better: null,
  meaning: "I like coffee.",
} as const;

// 상대 글 → 내 글(교정) → 상대 답(답이 이미 왔다).
const seed = (): ChatFixtureSeed => ({
  rooms: [
    fixtureRoom("mina", {
      messages: [
        {
          kind: "text",
          from: "them",
          text: { ko: "뭐 좋아해요?", en: "What do you like?" },
          minutesAgo: 30,
        },
        { kind: "text", from: "me", text: { ko: COFFEE, en: "" }, minutesAgo: 20, correction: FIX },
        { kind: "text", from: "them", text: { ko: "저도요!", en: "Me too!" }, minutesAgo: 5 },
      ],
    }),
  ],
  birthYear: { kind: "set", year: 2000 },
});

const outgoing = (): HTMLElement[] => screen.getAllByTestId(roomIds.outgoing);
const openCard = (index = 0): void => {
  fireEvent.tap(within(outgoing()[index] as HTMLElement).getByTestId(ids.toolFix), {
    eventType: "catchEvent",
  });
  advance(timing.correctionMs);
};
const logText = (): string => screen.getByTestId(roomIds.log).textContent ?? "";

test("CR-I1. 답이 온 마지막 내 글의 카드에 Send corrected가 서고, 누르면 옛 턴이 빠지고 고친 글이 새로 간다", () => {
  const { ledger } = mountChat({ seed: seed(), tier: "free" });
  openCard();
  expect(screen.getByTestId(fb.resend)).toBeTruthy();
  const used = ledger.usage().used;

  tapButtonIn(fb.resend);

  expect(logText()).not.toContain(COFFEE);
  expect(logText()).not.toContain("저도요!");
  expect(outgoing()).toHaveLength(1);
  expect(outgoing()[0]?.textContent).toContain("저는 커피를 좋아해요.");
  expect(ledger.usage().used).toBe(used + 1);
  advance(timing.typingDelayMs + timing.replyDelayMs);
  expect(screen.getAllByTestId(roomIds.incoming)).toHaveLength(2);
});

test("CR-I2. 다시 보낸 직후 답을 기다리는 동안에는 다시 보내기 단추가 없고, 답이 오면 끝으로 내려간 로그에 새 답이 선다", () => {
  const { source } = mountChat({ seed: seed() });
  openCard();
  tapButtonIn(fb.resend);
  expect(source.thread("mina")?.awaitingReply).toBe(true);
  expect(screen.queryAllByTestId(fb.resend)).toHaveLength(0);
  advance(timing.typingDelayMs + timing.replyDelayMs);
  expect(source.thread("mina")?.awaitingReply).toBe(false);
});

test("CR-I3. 👍 👎는 가장 최근 캐릭터 글에만, 👍는 눌러 켜고 다시 눌러 끈다", () => {
  mountChat({ seed: seed() });
  expect(screen.getAllByTestId(fb.ratingGood)).toHaveLength(1);
  const incoming = screen.getAllByTestId(roomIds.incoming);
  expect(within(incoming[1] as HTMLElement).queryByTestId(fb.ratingGood)).not.toBeNull();

  tapId(fb.ratingGood);
  expect(screen.getByTestId(fb.ratingGood).getAttribute("data-on")).toBe("true");
  tapId(fb.ratingGood);
  expect(screen.getByTestId(fb.ratingGood).getAttribute("data-on")).toBe("false");
});

test("CR-I4. 👎 → 이유 고르기 → Send면 👎가 켜지고, 새 답이 오면 지난 글에 「You flagged this」가 남는다", () => {
  const { source } = mountChat({ seed: seed() });
  tapId(fb.ratingBad);
  expect(screen.getByTestId(fb.sheet)).toBeTruthy();
  tapId(fb.sheetReason("too_hard"));
  tapButtonIn("ui-lynx-bottom-sheet-action-send");

  expect(screen.queryByTestId(fb.sheet)).toBeNull();
  expect(screen.getByTestId(fb.ratingBad).getAttribute("data-on")).toBe("true");

  source.sendText("mina", "네");
  advance(timing.typingDelayMs + timing.replyDelayMs);
  expect(screen.getByTestId(fb.ratingResult).textContent).toBe("You flagged this");
});

test("CR-I5. 👎 시트를 닫으면 저장하지 않는다", () => {
  mountChat({ seed: seed() });
  tapId(fb.ratingBad);
  tapId(fb.sheetReason("other"));
  tapId("ui-lynx-bottom-sheet-close");
  expect(screen.queryByTestId(fb.sheet)).toBeNull();
  expect(screen.getByTestId(fb.ratingBad).getAttribute("data-on")).toBe("false");
});

test("CR-I6. uncomfortable을 고르고 Report를 누르면 평가가 남고 신고 시트가 열린다", () => {
  mountChat({ seed: seed() });
  tapId(fb.ratingBad);
  tapId(fb.sheetReason("uncomfortable"));
  tapButtonIn(fb.sheetReport);
  expect(screen.queryByTestId(fb.sheet)).toBeNull();
  expect(screen.getByTestId(roomIds.reportSheet)).toBeTruthy();
  expect(screen.getByTestId(fb.ratingBad).getAttribute("data-on")).toBe("true");
});

test("CR-I7. 👎 메모는 앞뒤 공백을 지우고 평가와 함께 저장된다", () => {
  const { source } = mountChat({ seed: seed() });
  tapId(fb.ratingBad);
  tapId(fb.sheetReason("awkward_korean"));
  nativeInput("input", "  too formal  ", "ui-lynx-text-field-input");
  tapButtonIn("ui-lynx-bottom-sheet-action-send");
  const thread = source.thread("mina");
  const reply = thread?.messages.at(-1)?.id ?? "";
  expect(thread?.ratings[reply]).toEqual({
    value: "down",
    reasons: ["awkward_korean"],
    note: "too formal",
  });
});

test("CR-I8. 👎 시트가 닫히면 초점이 👎로, 👎에서 넘어간 신고 시트가 닫혀도 👎로 돌아간다", () => {
  mountChat({ seed: seed() });
  tapId(fb.ratingBad);
  tapId("ui-lynx-bottom-sheet-close");
  advance(16);
  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenLastCalledWith(fb.ratingBad);

  vi.mocked(inputFocus.restoreAccessibilityFocus).mockClear();
  tapId(fb.ratingBad);
  tapId(fb.sheetReason("uncomfortable"));
  tapButtonIn(fb.sheetReport);
  tapButtonIn("ui-lynx-bottom-sheet-action-cancel");
  advance(16);
  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenCalledTimes(1);
  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenCalledWith(fb.ratingBad);
});
