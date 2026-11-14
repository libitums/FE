import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as accessibility from "../../lib/accessibility";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteTurnHandlers } from "./chat-remote.contract";
import { KEYS_AN, clearBackHandlers, mountChat, tapId, tapKeys } from "./chat-ui.test-support";
import { chatFeedbackTestIds as fb } from "./chat-feedback.contract";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { myMessageTestIds as mine } from "./my-message.contract";
import { bubbleToolRowOf } from "./my-message-state";
import { shouldAutoOpenIdeas } from "./use-auto-ideas";
import { NO_NOTES } from "./chat-source.contract";

// `ui` 계층(SS-UI2 ~ UI8): 서버 모드 방 — 추천 답변 판 저절로 열림 · 내 글 뜻(🌐) 없음 · 리뷰 W1 ~ W4 · W6(ADR-0137).

const A0 = "00000000-0000-4000-8000-000000000000"; // 기록의 캐릭터 메시지
const A1 = "22222222-2222-4222-8222-222222222222"; // 턴의 캐릭터 메시지
const U1 = "11111111-1111-4111-8111-111111111111";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

vi.mock("../../lib/accessibility", async (importOriginal) => ({
  ...(await importOriginal<typeof accessibility>()),
  announce: vi.fn<(content: string) => "announced">(() => "announced"),
}));
const announced = () => vi.mocked(accessibility.announce).mock.calls.map((call) => call[0]);

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

describe("판정", () => {
  test("SS-U10 새 보기 묶음이고 쓰던 글 없음 · 판 닫힘이면 연다", () => {
    const a = [{ ko: "네", roman: "", en: "Yes" }];
    const b = [{ ko: "좋아요", roman: "", en: "OK" }];
    expect(shouldAutoOpenIdeas(a, b, "", false)).toBe(true);
    expect(shouldAutoOpenIdeas(a, a, "", false)).toBe(false);
    expect(shouldAutoOpenIdeas(a, [], "", false)).toBe(false);
    expect(shouldAutoOpenIdeas(a, b, "쓰는 중", false)).toBe(false);
    expect(shouldAutoOpenIdeas(a, b, "", true)).toBe(false);
    expect(shouldAutoOpenIdeas(null, null, "", false)).toBe(false);
  });

  test("SS-U11 서버 모드는 내 글 뜻(🌐) 버튼을 숨긴다", () => {
    expect(bubbleToolRowOf(undefined, NO_NOTES, "hidden").meaning).toBe("hidden");
    expect(bubbleToolRowOf("meaning", NO_NOTES).meaning).toBe("on");
  });
});

function serverSource(over: { historyIdeas?: boolean } = {}) {
  const turns: RemoteTurnHandlers[] = [];
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages: [
        { id: `${A0}#0`, at: 1, kind: "text", from: "them", text: { ko: "안녕하세요", en: "Hi" } },
      ],
      corrections: {},
      ideas: over.historyIdeas === true ? [{ ko: "네", roman: "", en: "Yes" }] : null,
    }),
    greet: async () => null,
    openTurn: (_request, handlers) => {
      turns.push(handlers);
      return { cancel: () => undefined };
    },
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  const emit = (index: number, name: string, data: unknown) =>
    turns[index]?.onEvent(name, JSON.stringify(data));
  const first = (index: number, text: string) => {
    emit(index, "start", { userMessageId: U1, assistantMessageId: A1 });
    emit(index, "delta", { segment: 0, kind: "speech", text: text.slice(0, 1) });
  };
  const rest = (index: number, text: string, withIdeas = true) => {
    emit(index, "delta", { segment: 0, kind: "speech", text: text.slice(1) });
    if (withIdeas)
      emit(index, "suggestions", { status: "ok", items: [{ text: "저도요", meaning: "Me too" }] });
    emit(index, "done", { assistantMessageId: A1 });
    turns[index]?.onEnd("complete", null);
  };
  const reply = (index: number, text: string, withIdeas = true) => {
    first(index, text);
    rest(index, text, withIdeas);
  };
  return { source, turns, reply, first, rest, emit };
}

async function openServerRoom(over: { historyIdeas?: boolean } = {}) {
  const server = serverSource(over);
  mountChat({ source: server.source, roomId: "duksu" });
  await flush();
  return server;
}

describe("서버 모드 방", () => {
  test("SS-UI2 답과 함께 추천 답변이 오면 판이 저절로 열린다", async () => {
    const { source, reply } = await openServerRoom();
    expect(screen.queryByTestId(ids.ideasPanel)).toBeNull();
    source.sendText("duksu", "안녕하세요");
    await flush(); // 실제로는 네트워크 사이에 「기다리는 중」이 한 번 그려집니다.
    reply(0, "반가워요");
    await flush();
    expect(screen.getByTestId(ids.ideasPanel).textContent).toContain("저도요");
  });

  test("SS-UI3 내 글에는 뜻(🌐) · 다시 보내기 단추가 없다(리뷰 W6)", async () => {
    const { source, reply, emit } = await openServerRoom();
    source.sendText("duksu", "안녕 하세요");
    await flush(); // 실제로는 네트워크 사이에 「기다리는 중」이 한 번 그려집니다.
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    emit(0, "correction", {
      userMessageId: U1,
      status: "ok",
      kind: "correction",
      original: "안녕 하세요",
      corrected: "안녕하세요",
      items: [],
      better: null,
      meaning: null,
    });
    reply(0, "반가워요", false);
    await flush();
    expect(screen.getAllByTestId(mine.bubble).length).toBeGreaterThan(0);
    expect(screen.queryByTestId(mine.toolMeaning)).toBeNull();
    fireEvent.tap(screen.getByTestId(mine.toolFix), { eventType: "catchEvent" });
    await new Promise((resolve) => setTimeout(resolve, CHAT_PLACEHOLDERS.timing.correctionMs + 50));
    expect(screen.getByTestId(fb.card)).toBeTruthy(); // 카드는 열렸는데
    expect(screen.queryByTestId(fb.resend)).toBeNull(); // 다시 보내기는 없다
  });

  test("SS-UI4 방을 열며 읽은 기록의 추천 답변으로는 판을 열지 않는다(리뷰 W2)", async () => {
    await openServerRoom({ historyIdeas: true });
    await flush();
    expect(screen.queryByTestId(ids.ideasPanel)).toBeNull();
  });

  test("SS-UI5 방 설정 「보기 자동」을 끄면 열지 않는다(리뷰 W1)", async () => {
    const { source, reply } = await openServerRoom();
    source.setAutoIdeas("duksu", false);
    source.sendText("duksu", "안녕하세요");
    await flush(); // 실제로는 네트워크 사이에 「기다리는 중」이 한 번 그려집니다.
    reply(0, "반가워요");
    await flush();
    expect(screen.queryByTestId(ids.ideasPanel)).toBeNull();
  });

  test("SS-UI6 답을 기다리는 동안 보내기는 막힌다(리뷰 W3)", async () => {
    const { source, turns } = await openServerRoom();
    source.sendText("duksu", "하나");
    await flush();
    tapId(ids.field);
    tapKeys(...KEYS_AN);
    tapId(ids.send);
    expect(turns).toHaveLength(1);
  });

  test("SS-UI7 방을 열며 읽은 기록은 낭독하지 않는다(리뷰 W4)", async () => {
    await openServerRoom();
    await flush();
    expect(announced()).toEqual([]);
  });

  test("SS-UI8 답은 첫 조각이 아니라 다 자란 뒤 한 번만 읽는다(리뷰 W4)", async () => {
    const { source, first, rest } = await openServerRoom();
    vi.mocked(accessibility.announce).mockClear();
    source.sendText("duksu", "안녕하세요");
    await flush();
    first(0, "반가워요");
    await flush(); // 첫 조각(「반」)이 한 번 그려진다 — 옛 결함은 여기서 「덕수쌤: 반」을 읽었다.
    rest(0, "반가워요", false);
    await flush();
    expect(announced()).toEqual(["덕수쌤: 반가워요"]);
  });
});
