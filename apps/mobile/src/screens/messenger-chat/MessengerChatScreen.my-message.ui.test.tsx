import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import * as accessibility from "../../lib/accessibility";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  KEYS_AN,
  mountChat,
  mountChatOpen,
  tapId,
  tapKeys,
} from "./chat-ui.test-support";
import type { ChatFixtureSeed } from "./chat-source.contract";
import { messengerChatTestIds as roomIds } from "./messenger-chat.contract";
import { myMessageTestIds as ids } from "./my-message.contract";

// `ui` 계층(MC2-UI4): 방 화면에서 내 말풍선 도구 — 씨앗 · 가짜 타이머. 아이콘 줄이 누구에게 있는지 · 열고 닫기 ·
// 한 말풍선에 하나만 열림 · 말풍선끼리 독립 · 낭독 순서 · 보낸 글에 답이 오면 생기는 교정.
// 가정(구현자가 따를 것): 내 줄은 `messenger-chat-outgoing` 안에 `myMessageTestIds`를 갖는다. 낭독은 `lib/accessibility`의 announce.

vi.mock("../../lib/accessibility", async (importOriginal) => ({
  ...(await importOriginal<typeof accessibility>()),
  announce: vi.fn<(content: string) => "announced">(() => "announced"),
}));

const timing = CHAT_PLACEHOLDERS.timing;
const announce = (): ReturnType<typeof vi.fn> => vi.mocked(accessibility.announce);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 10, 12, 0, 0));
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
  changes: [
    { start: 1, end: 2 },
    { start: 5, end: 6 },
  ],
  explanation: "Add 는 after 저 and 를 after 커피.",
} as const;
const REPLY_FIX = {
  original: "안",
  corrected: "안녕",
  changes: [{ start: 1, end: 2 }],
  explanation: "Say 안녕 for hello.",
} as const;

// 내 글 둘: 첫째는 교정 없음, 둘째는 씨앗 교정(점이 처음부터 보임). 뒤에 상대 글 하나.
const seed = (): ChatFixtureSeed => ({
  rooms: [
    fixtureRoom("mina", {
      messages: [
        {
          kind: "text",
          from: "me",
          text: { ko: "안녕하세요", en: "Hello" },
          minutesAgo: 30,
        },
        {
          kind: "text",
          from: "me",
          text: { ko: COFFEE, en: "I like coffee." },
          minutesAgo: 20,
          correction: FIX,
        },
        {
          kind: "text",
          from: "them",
          text: { ko: "오늘 뭐 해요?", en: "What now?" },
          minutesAgo: 5,
        },
      ],
    }),
  ],
  meanings: [
    { ko: "안녕하세요", romanization: "annyeonghaseyo", meaning: "Hello" },
    { ko: COFFEE, romanization: "jeo keopi joahaeyo", meaning: "I like coffee." },
    { ko: "안", romanization: "an", meaning: "(a syllable)" },
  ],
  corrections: [REPLY_FIX],
  fallbackMeaning: { romanization: "…", meaning: "Meaning coming soon" },
});

const rows = (): HTMLElement[] => screen.getAllByTestId(roomIds.outgoing);
const rowTool = (index: number, testId: string): HTMLElement | null =>
  within(rows()[index] as HTMLElement).queryByTestId(testId);
const viewOf = (index: number): string | null =>
  within(rows()[index] as HTMLElement)
    .getByTestId(ids.bubble)
    .getAttribute("data-view");
// 도구 단추는 catchtap입니다 — 탭이 로그까지 올라가 열린 키보드를 접지 않게 막습니다(접근성 M7).
const tapTool = (index: number, testId: string): void => {
  const el = within(rows()[index] as HTMLElement).getByTestId(testId);
  fireEvent.tap(el, { eventType: "catchEvent" });
};

test("MC2-UI4. 모든 내 글에 해석 단추가 있고, 교정 씨앗 글에만 고친 문장 단추와 점이 있다", () => {
  mountChat({ seed: seed() });

  expect(rows()).toHaveLength(2);
  expect(rowTool(0, ids.toolMeaning)).not.toBeNull();
  expect(rowTool(1, ids.toolMeaning)).not.toBeNull();
  expect(rowTool(0, ids.toolFix)).toBeNull();
  expect(rowTool(1, ids.toolFix)).not.toBeNull();
  expect(rowTool(1, ids.toolFix)?.getAttribute("data-dot")).toBe("shown");
  expect(viewOf(0)).toBe("closed");
  expect(viewOf(1)).toBe("closed");
});

test("MC2-UI4. 상대 글에는 도구 줄이 없다", () => {
  mountChat({ seed: seed() });

  const theirs = screen.getAllByTestId(roomIds.incoming);
  expect(within(theirs[0] as HTMLElement).queryByTestId(ids.tools)).toBeNull();
  expect(screen.getAllByTestId(ids.tools)).toHaveLength(2);
});

test("MC2-UI4. 지구본: 스켈레톤 → meaningMs 뒤 로마자 · 뜻 → 다시 누르면 닫힌다", () => {
  mountChat({ seed: seed() });

  tapTool(0, ids.toolMeaning);
  expect(viewOf(0)).toBe("meaning-loading");
  expect(rowTool(0, ids.meaningSkeleton)).not.toBeNull();
  advance(timing.meaningMs - 1);
  expect(viewOf(0)).toBe("meaning-loading");
  advance(1);
  expect(viewOf(0)).toBe("meaning");
  expect(rowTool(0, ids.meaningRoman)?.textContent?.trim()).toBe("annyeonghaseyo");
  expect(rowTool(0, ids.meaningText)?.textContent?.trim()).toBe("Hello");
  expect(rowTool(0, ids.meaningSkeleton)).toBeNull();
  expect(rowTool(0, ids.toolMeaning)?.getAttribute("data-state")).toBe("on");

  tapTool(0, ids.toolMeaning);
  expect(viewOf(0)).toBe("closed");
  expect(rowTool(0, ids.toolMeaning)?.getAttribute("data-state")).toBe("off");
});

test("MC2-UI4. 한 번 받은 뜻은 다시 열면 스켈레톤 없이 바로 보인다", () => {
  mountChat({ seed: seed() });
  tapTool(0, ids.toolMeaning);
  advance(timing.meaningMs);
  tapTool(0, ids.toolMeaning);

  tapTool(0, ids.toolMeaning);

  expect(viewOf(0)).toBe("meaning");
  expect(rowTool(0, ids.meaningSkeleton)).toBeNull();
});

test("MC2-UI4. 연필: 카드 스켈레톤이 서고 점이 바로 사라지며 correctionMs 뒤 카드가 선다", () => {
  mountChat({ seed: seed() });

  tapTool(1, ids.toolFix);
  expect(viewOf(1)).toBe("fix-loading");
  expect(rowTool(1, ids.fixSkeleton)).not.toBeNull();
  expect(rowTool(1, ids.toolFix)?.getAttribute("data-dot")).toBe("hidden");
  advance(timing.correctionMs - 1);
  expect(rowTool(1, ids.fixCard)).toBeNull();
  advance(1);

  expect(viewOf(1)).toBe("fix");
  expect(rowTool(1, ids.fixSkeleton)).toBeNull();
  expect(rowTool(1, ids.fixCard)).not.toBeNull();
  expect(rowTool(1, ids.fixSegment(0))?.textContent).toBe("저");
  expect(rowTool(1, ids.fixSegment(0))?.getAttribute("data-kind")).toBe("same");
  expect(rowTool(1, ids.fixSegment(1))?.textContent).toBe("는");
  expect(rowTool(1, ids.fixSegment(1))?.getAttribute("data-kind")).toBe("changed");
  expect(rowTool(1, ids.fixExplanation)?.textContent?.trim()).toBe(FIX.explanation);
  expect(rowTool(1, ids.toolFix)?.getAttribute("data-state")).toBe("on");
});

test("MC2-UI4. 점은 한 번 열면 닫아도 돌아오지 않는다", () => {
  mountChat({ seed: seed() });
  tapTool(1, ids.toolFix);
  advance(timing.correctionMs);

  tapTool(1, ids.toolFix);

  expect(viewOf(1)).toBe("closed");
  expect(rowTool(1, ids.toolFix)?.getAttribute("data-dot")).toBe("hidden");
});

test("MC2-UI4. 한 말풍선에는 도구 하나만 열린다 — 연필이 열린 채 지구본을 누르면 카드는 닫히고 뜻이 열린다", () => {
  mountChat({ seed: seed() });
  tapTool(1, ids.toolFix);
  advance(timing.correctionMs);
  expect(rowTool(1, ids.fixCard)).not.toBeNull();

  tapTool(1, ids.toolMeaning);

  expect(rowTool(1, ids.fixCard)).toBeNull();
  expect(viewOf(1)).toBe("meaning-loading");
  expect(rowTool(1, ids.toolFix)?.getAttribute("data-state")).toBe("off");
  advance(timing.meaningMs);
  expect(viewOf(1)).toBe("meaning");
  expect(rowTool(1, ids.fixCard)).toBeNull();
});

test("MC2-UI4. 다른 말풍선은 독립이다 — 한쪽을 열어도 다른 쪽은 그대로 열려 있다", () => {
  mountChat({ seed: seed() });
  tapTool(0, ids.toolMeaning);
  advance(timing.meaningMs);

  tapTool(1, ids.toolFix);
  advance(timing.correctionMs);

  expect(viewOf(0)).toBe("meaning");
  expect(viewOf(1)).toBe("fix");
  tapTool(0, ids.toolMeaning);
  expect(viewOf(0)).toBe("closed");
  expect(viewOf(1)).toBe("fix");
});

test("MC2-UI4. 낭독: 불러오는 중 → 내용 순서로 한 번씩 알린다(처음 마운트는 알리지 않는다)", () => {
  mountChat({ seed: seed() });
  advance(100);
  expect(announce()).not.toHaveBeenCalled();

  tapTool(0, ids.toolMeaning);
  expect(announce()).toHaveBeenCalledTimes(1);
  expect(announce()).toHaveBeenNthCalledWith(1, "Loading the meaning…");
  advance(timing.meaningMs);
  expect(announce()).toHaveBeenCalledTimes(2);
  expect(announce()).toHaveBeenNthCalledWith(2, "annyeonghaseyo, Hello");

  tapTool(1, ids.toolFix);
  expect(announce()).toHaveBeenNthCalledWith(3, "Loading a better way…");
  advance(timing.correctionMs);
  expect(announce()).toHaveBeenCalledTimes(4);
  expect(announce()).toHaveBeenNthCalledWith(4, `Better: ${FIX.corrected}. ${FIX.explanation}`);
});

test("MC2-UI4. 보내고 상대 답이 오면 그 글에 고친 문장 단추와 점이 생기고 열면 카드가 선다", () => {
  mountChatOpen({ seed: seed() });
  tapKeys(...KEYS_AN);
  tapId(roomIds.send);
  // 내 새 글은 아이콘 줄에 해석만 있다(교정은 답이 오면 생긴다).
  expect(rows()).toHaveLength(3);
  expect(rowTool(2, ids.toolMeaning)).not.toBeNull();
  expect(rowTool(2, ids.toolFix)).toBeNull();

  advance(timing.typingDelayMs + timing.replyDelayMs);

  expect(rowTool(2, ids.toolFix)).not.toBeNull();
  expect(rowTool(2, ids.toolFix)?.getAttribute("data-dot")).toBe("shown");
  tapTool(2, ids.toolFix);
  advance(timing.correctionMs);
  expect(rowTool(2, ids.fixCard)).not.toBeNull();
  expect(rowTool(2, ids.fixSegment(1))?.textContent).toBe("녕");
});

test("MC2-UI4. 표에 없는 글의 뜻은 대체 문장으로 서고 단추는 계속 동작한다", () => {
  mountChatOpen({ seed: seed() });
  tapKeys("ㅇ", "ㅏ", "ㅁ");
  tapId(roomIds.send);

  tapTool(2, ids.toolMeaning);
  advance(timing.meaningMs);

  expect(rowTool(2, ids.meaningText)?.textContent?.trim()).toBe("Meaning coming soon");
});
