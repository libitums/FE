import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import { chatRowPreview } from "./chat-list";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { chatTurnsTestIds } from "./chat-turns.contract";
import {
  KEYS_AN,
  clearBackHandlers,
  mountChat,
  tapId,
  tapKeys,
  textOf,
} from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import { friendStoriesTestIds as fs } from "./friend-stories.contract";
import { messengerChatTestIds as chat } from "./messenger-chat.contract";
import { myStoriesTestIds as ids, type ChatQuizMark } from "./my-stories.contract";
import { createTrialStore } from "./trial-store";

// `ui` 계층(MS-UI27 ~ UI30): 대화방의 내 스토리 반응(시안 20 — origin `story_reaction`의 인용)과 덕수쌤 퀴즈(시안 21 ~ 23, 서버 반영 예상
// `meta`를 앱이 푼 `quiz` 표시). 서버 기록은 대역 원격이 줍니다.

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const NOW = Date.UTC(2026, 10, 25, 6, 30);

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const quote = {
  storyId: "ms-1",
  characterId: "duksu",
  line: "야근",
  imagePath: null,
  postedAt: NOW - 40 * 60_000,
  kind: "mine" as const,
};
const them = (id: string, ko: string, extra: Partial<ChatMessage> = {}): ChatMessage =>
  ({
    id,
    at: NOW,
    kind: "text",
    from: "them",
    text: { ko, en: `${ko} (en)` },
    ...extra,
  }) as ChatMessage;
const me = (id: string, ko: string, quiz?: ChatQuizMark): ChatMessage =>
  ({
    id,
    at: NOW,
    kind: "text",
    from: "me",
    text: { ko, en: "" },
    ...(quiz === undefined ? {} : { quiz }),
  }) as ChatMessage;
const ask = them("m1#0", "퀴즈예요! 「overtime」을 한국어로 말해 볼까요?", {
  story: quote,
  quiz: { kind: "ask" },
});

function serverRoom(messages: readonly ChatMessage[]) {
  const openTurn = vi.fn<ChatRemote["openTurn"]>(() => ({ cancel: () => undefined }));
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages, corrections: {}, ideas: null }),
    greet: async () => null,
    openTurn,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  return { source, openTurn };
}

async function open(messages: readonly ChatMessage[], over: { coins?: number } = {}) {
  const room = serverRoom(messages);
  const mounted = mountChat({
    source: room.source,
    roomId: "duksu",
    tier: "free",
    trial: createTrialStore(0),
    coinBalance: over.coins ?? 0,
  });
  await flush();
  return { ...room, ...mounted };
}

test("MS-UI27. 반응 메시지(시안 20) — 인물 말풍선 위 「Replied to your story」 + 단어 카드, 지운 스토리는 「Deleted story」, 목록 미리보기는 반응 글", async () => {
  const { source } = await open([
    them("m0#0", "어제 도서관 어땠어?"),
    them("m1#0", "오늘도 야근해? 몇 시에 끝나?", { story: quote }),
    them("m1#1", "힘내!"),
  ]);
  const cards = screen.getAllByTestId(fs.quote);
  expect(cards).toHaveLength(1);
  expect(cards[0]?.textContent).toContain("Replied to your story");
  expect(cards[0]?.textContent).toContain("야근");
  expect(cards[0]?.getAttribute("accessibility-label")).toContain("Replied to your story");
  const room = source.snapshot().rooms.find((each) => each.roomId === "duksu");
  expect(room === undefined ? null : chatRowPreview(room)).toEqual({
    kind: "text",
    from: "them",
    text: { ko: "힘내!", en: "힘내! (en)" },
  });
  cleanup();
  clearBackHandlers();
  await open([
    them("m2#0", "오늘도 야근해?", {
      story: { ...quote, storyId: "", line: "", postedAt: null, kind: "deleted" },
    }),
  ]);
  expect(screen.getByTestId(fs.quote).textContent).toContain("Deleted story");
});

test("MS-UI28. 퀴즈 반응(시안 21) — 입력 칸 위 「Quiz answer is free」, 엽전이 없어도 보내기는 무료로 나간다, 퀴즈 표시가 없으면 띠도 없다", async () => {
  const { openTurn } = await open([ask]);
  expect(textOf(ids.quizFree)).toBe("Quiz answer is free");
  expect(screen.queryByTestId(chatTurnsTestIds.coinSend)).toBeNull();
  tapId(chat.field);
  tapKeys(...KEYS_AN);
  tapId(chat.send);
  expect(openTurn).toHaveBeenCalledTimes(1);
  cleanup();
  clearBackHandlers();
  await open([them("m1#0", "오늘도 야근해?", { story: quote })]);
  expect(screen.queryByTestId(ids.quizFree)).toBeNull();
  expect(screen.getByTestId(chatTurnsTestIds.coinSend)).not.toBeNull();
});

test("MS-UI29. 맞힘(시안 22) — 내 답 아래 「Free · quiz answer」, 가운데 「Correct! …」, 선물 음성 아래 「Voice gift · …」, 띠 없음", async () => {
  await open([
    ask,
    me("u1", "야근!", { kind: "answer", attempt: 1, result: "correct" }),
    them("m3#0", "맞아요, 야근! 오늘은 일찍 끝나면 좋겠네요", {
      quiz: { kind: "gift", word: "야근" },
    }),
    {
      id: "m3~voice~v1",
      at: NOW,
      kind: "voice",
      durationMs: 0,
      text: { ko: "야근", en: "" },
      audioUrl: null,
    },
  ]);
  expect(textOf(ids.quizNote("u1"))).toBe("Free · quiz answer");
  expect(textOf(ids.quizCorrect("u1"))).toBe("Correct! You and 덕수쌤 got closer");
  expect(textOf(ids.voiceGift("m3~voice~v1"))).toBe("Voice gift · 덕수쌤 says “야근”");
  expect(screen.queryByTestId(ids.quizFree)).toBeNull();
});

test("MS-UI30. 틀림(시안 23) — 첫 답 「Free · quiz answer」, 힌트 뒤 띠가 다시 서고, 둘째 답 「Free · last try」 뒤 정답 공개면 띠 · 맞힘 줄 없음", async () => {
  const hinted = [ask, me("u1", "일?", { kind: "answer", attempt: 1, result: "hint" })];
  await open([...hinted, them("m4#0", "아까워요! 힌트: 「야」로 시작해요")]);
  expect(textOf(ids.quizFree)).toBe("Quiz answer is free");
  expect(screen.queryByTestId(ids.quizCorrect("u1"))).toBeNull();
  cleanup();
  clearBackHandlers();
  await open([
    ...hinted,
    them("m4#0", "아까워요! 힌트: 「야」로 시작해요"),
    me("u2", "야간?", { kind: "answer", attempt: 2, result: "revealed" }),
    them("m5#0", "거의 맞았어요! 정답은 야근이에요"),
  ]);
  expect(textOf(ids.quizNote("u1"))).toBe("Free · quiz answer");
  expect(textOf(ids.quizNote("u2"))).toBe("Free · last try");
  expect(screen.queryByTestId(ids.quizFree)).toBeNull();
  expect(screen.queryByTestId(ids.quizCorrect("u2"))).toBeNull();
});
