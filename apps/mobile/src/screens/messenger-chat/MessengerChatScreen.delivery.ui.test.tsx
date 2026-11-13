import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteHistory, RemoteTurnHandlers } from "./chat-remote.contract";
import { clearBackHandlers, mountChat } from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(ES-UI1 ~ UI5): 서버 모드 배달 실패 화면 — Not sent · 다시 보내기 대화상자 · 끊긴 답 줄 · 기록 실패 · 회색 줄(ADR-0138).

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const tap = (testId: string) =>
  fireEvent.tap(screen.getByTestId(testId), { eventType: "catchEvent" });
const label = (testId: string) => screen.getByTestId(testId).getAttribute("accessibility-label");

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

function setup(
  histories: (RemoteHistory | null)[] = [],
  greet: ChatRemote["greet"] = async () => null,
) {
  const turns: RemoteTurnHandlers[] = [];
  const queue = [...histories];
  const remote: ChatRemote = {
    loadHistory: async () =>
      queue.length > 0
        ? (queue.shift() ?? null)
        : {
            messages: [
              { id: "h#0", at: 1, kind: "text", from: "them", text: { ko: "안녕", en: "" } },
            ],
            corrections: {},
            ideas: null,
          },
    greet,
    openTurn: (_request, handlers) => {
      turns.push(handlers);
      return { cancel: () => undefined };
    },
  };
  const timers = fakeTimers();
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers,
    remote,
  });
  const emit = (index: number, name: string, data: unknown) =>
    turns[index]?.onEvent(name, JSON.stringify(data));
  return { source, turns, emit, timers };
}

async function open(histories: (RemoteHistory | null)[] = [], greet?: ChatRemote["greet"]) {
  const harness = setup(histories, greet);
  mountChat({ source: harness.source, roomId: "duksu" });
  await flush();
  return harness;
}

describe("보내지 못한 글", () => {
  test("ES-UI1 Not sent와 ↻이 서고, 말풍선 낭독에 not sent가 붙는다", async () => {
    const { source, turns } = await open();
    source.sendText("duksu", "커피 마셨어요");
    turns[0]?.onEnd("network", null);
    await flush();
    expect(screen.getByTestId(ids.unsent).textContent).toContain("Not sent");
    expect(label(ids.unsentRetry)).toBe("Send again");
    expect(screen.queryByTestId(ids.notice)).toBeNull();
    const bubble = screen.getByTestId(ids.unsent).querySelector("[accessibility-label]");
    expect(bubble?.getAttribute("accessibility-label")).toContain("커피 마셨어요, Not sent");
  });

  test("ES-UI2 ↻ → 대화상자 → Send again은 다시 보내고, Delete는 글을 뺀다", async () => {
    const { source, turns } = await open();
    source.sendText("duksu", "하나");
    turns[0]?.onEnd("network", null);
    await flush();
    tap(ids.unsentRetry);
    expect(screen.getByTestId(ids.unsentDialog).textContent).toContain("Message not sent");
    fireEvent.tap(within(screen.getByTestId(`${ids.unsentDialog}-send`)).getByText("Send again"));
    await flush();
    expect(turns).toHaveLength(2);
    expect(screen.queryByTestId(ids.unsentDialog)).toBeNull();
    expect(screen.queryByTestId(ids.unsent)).toBeNull();
    turns[1]?.onEnd("network", null);
    await flush();
    tap(ids.unsentRetry);
    fireEvent.tap(within(screen.getByTestId(`${ids.unsentDialog}-delete`)).getByText("Delete"));
    await flush();
    expect(screen.queryByTestId(ids.unsent)).toBeNull();
    expect(source.thread("duksu")?.messages.some((m) => m.kind === "text" && m.from === "me")).toBe(
      false,
    );
  });
});

describe("끊긴 답 · 기록 실패 · 회색 줄", () => {
  test("ES-UI3 끊긴 답은 채우는 중 줄, 30초 안에 못 채우면 Refresh, 누르면 다시 채운다", async () => {
    const { source, turns, emit, timers } = await open([
      { messages: [], corrections: {}, ideas: null },
      null,
      null,
      null,
      null,
      null,
    ]);
    source.sendText("duksu", "안녕");
    await flush();
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    turns[0]?.onEnd("network", null);
    await flush();
    expect(screen.getByTestId(ids.recovery).getAttribute("data-state")).toBe("fetching");
    expect(screen.getByTestId(ids.recovery).textContent).toContain(
      "Getting the rest of the reply…",
    );
    expect(screen.queryByTestId(ids.recoveryRefresh)).toBeNull();
    for (const ms of [2_000, 3_000, 5_000, 20_000]) {
      timers.advance(ms);
      await flush();
    }
    expect(screen.getByTestId(ids.recovery).textContent).toContain("Reply didn't finish.");
    tap(ids.recoveryRefresh);
    await flush();
    expect(screen.getByTestId(ids.recovery).getAttribute("data-state")).toBe("fetching");
  });

  test("ES-UI4 빈 방은 가운데 안내 + Try again, 다시 시도하면 기록이 선다", async () => {
    const { source } = await open([null]);
    await flush();
    const failed = screen.getByTestId(ids.historyFailed);
    expect(failed.getAttribute("data-layout")).toBe("empty");
    expect(failed.textContent).toContain("Couldn't load your chat");
    tap(ids.historyRetry);
    await flush();
    await flush();
    expect(screen.queryByTestId(ids.historyFailed)).toBeNull();
    expect(source.thread("duksu")?.server?.history).toBe("loaded");
  });

  test("ES-UI5 새 회색 줄 문구 — 답 실패 · 안전 규칙 · 너무 빠름", async () => {
    const { source, turns, emit } = await open();
    source.sendText("duksu", "안녕");
    emit(0, "start", { userMessageId: U1, assistantMessageId: A1 });
    emit(0, "error", { code: "upstream_unavailable" });
    turns[0]?.onEnd("complete", null);
    await flush();
    expect(screen.getByTestId(ids.notice).textContent).toContain("덕수쌤 can't reply right now.");
    source.sendText("duksu", "또");
    turns[1]?.onEnd("http-error", JSON.stringify({ error: "rate_limited" }));
    await flush();
    const notices = screen.getAllByTestId(ids.notice).map((n) => n.textContent ?? "");
    expect(notices.some((t) => t.includes("You're sending too fast."))).toBe(true);
  });
});

describe("Android 접근성", () => {
  test("ES-UI7 탭 · 낭독 요소는 flatten을 끄고, 탭 요소는 접근성 탭을 켠다(리뷰 C1)", async () => {
    const { source, turns, emit, timers } = await open([
      { messages: [], corrections: {}, ideas: null },
      null,
      null,
      null,
      null,
      null,
    ]);
    source.sendText("duksu", "하나");
    turns[0]?.onEnd("network", null);
    await flush();
    await flush();
    source.server?.discard("duksu", source.thread("duksu")?.server?.unsent[0] ?? "");
    source.sendText("duksu", "둘");
    await flush();
    emit(1, "start", { userMessageId: U1, assistantMessageId: A1 });
    turns[1]?.onEnd("network", null);
    for (const ms of [0, 2_000, 3_000, 5_000, 20_000]) {
      timers.advance(ms);
      await flush();
    }
    const tappables = [screen.getByTestId(ids.recoveryRefresh)];
    for (const element of tappables) {
      const name = element.getAttribute("data-testid") ?? "";
      expect(element.getAttribute("accessibility-enable-tap"), name).toBe("true");
      expect(element.getAttribute("flatten"), name).toBe("false");
    }
  });

  test("ES-UI8 Not sent 말풍선 · ↻ · Try again · 기록 실패 문구", async () => {
    const { source, turns } = await open([null]);
    await flush();
    const failed = screen.getByTestId(ids.historyFailed);
    const copy = failed.querySelector("[accessibility-label]");
    expect(copy?.getAttribute("flatten")).toBe("false");
    expect(copy?.getAttribute("accessibility-label")).toContain("Couldn't load your chat");
    const retry = screen.getByTestId(ids.historyRetry);
    expect(retry.getAttribute("accessibility-enable-tap")).toBe("true");
    expect(retry.getAttribute("flatten")).toBe("false");
    fireEvent.tap(retry, { eventType: "catchEvent" });
    await flush();
    await flush();
    source.sendText("duksu", "하나");
    turns[0]?.onEnd("network", null);
    await flush();
    const bubble = screen.getByTestId(ids.unsent).querySelector("[accessibility-label]");
    for (const element of [bubble, screen.getByTestId(ids.unsentRetry)]) {
      expect(element?.getAttribute("accessibility-enable-tap")).toBe("true");
      expect(element?.getAttribute("flatten")).toBe("false");
    }
  });
});
