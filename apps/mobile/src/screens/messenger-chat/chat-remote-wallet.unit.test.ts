import { describe, expect, test, vi } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteTurnHandlers, RemoteWallet } from "./chat-remote.contract";
import { companionSeed } from "./companion-roster";

// `unit` 계층(CP-U7 ~ U9): 서버 방의 엽전은 서버 지갑이 정본이다(ADR-0155) — 턴의 `done` 잔액이 곧바로 칩으로 가고, 체험이 남았거나
// 체험 수를 모르는 동안의 턴(체험은 인물을 가리지 않는 합산 — ADR-0164 D3) · 잔액을 모르는 턴 뒤에는 지갑(`companion_get_wallet`)을
// 다시 읽어 잔액과 체험 남은 수를 알린다. 서버 출처를 만들 때도 한 번 읽는다.

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

function setup(wallets: (RemoteWallet | null)[], options: { noWallet?: boolean } = {}) {
  const turns: RemoteTurnHandlers[] = [];
  const reads = [...wallets];
  const wallet = vi.fn(async () => (reads.length > 0 ? (reads.shift() ?? null) : null));
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages: [
        { id: `${A1}#0`, at: 1, kind: "text", from: "them", text: { ko: "안녕", en: "Hi" } },
      ],
      corrections: {},
      ideas: null,
    }),
    greet: async () => null,
    openTurn: (_request, handlers) => {
      turns.push(handlers);
      return { cancel: () => undefined };
    },
    ...(options.noWallet === true ? {} : { wallet }),
  };
  const balances: number[] = [];
  const trials: number[] = [];
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    unlocked: ["mina"],
    now: () => 1_000,
    timers: fakeTimers(),
    remote,
    mediaHooks: {
      onBalance: (balance) => balances.push(balance),
      onTrialRemaining: (remaining) => trials.push(remaining),
    },
  });
  /** 마지막 턴을 `done`(낸 값 · 잔액)으로 끝냅니다. */
  const finish = (creditsSpent: number, balance: number | null) => {
    const handlers = turns.at(-1);
    if (handlers === undefined) throw new Error("no turn");
    handlers.onOpen(200);
    handlers.onEvent(
      "start",
      JSON.stringify({ userMessageId: U1, assistantMessageId: A1, speechLevel: "polite" }),
    );
    handlers.onEvent("delta", JSON.stringify({ segment: 0, kind: "speech", text: "네" }));
    handlers.onEvent("done", JSON.stringify({ assistantMessageId: A1, creditsSpent, balance }));
    handlers.onEnd("complete", null);
  };
  return { source, wallet, balances, trials, finish };
}

describe("서버 지갑 (CP-U7 ~ U9)", () => {
  test("CP-U7 서버 출처를 만들면 지갑을 한 번 읽어 잔액 · 체험 남은 수를 알린다", async () => {
    const env = setup([{ balance: 120, trialRemaining: 18 }]);
    await flush();
    expect(env.wallet).toHaveBeenCalledTimes(1);
    expect(env.balances).toEqual([120]);
    expect(env.trials).toEqual([18]);
  });

  test("CP-U8 체험을 다 쓴 뒤의 턴은 done 잔액을 곧바로 알리고 지갑을 다시 읽지 않는다", async () => {
    const env = setup([{ balance: 100, trialRemaining: 0 }]);
    env.source.openRoom("mina");
    await flush();
    env.source.sendText("mina", "안녕하세요");
    env.finish(3, 97);
    await flush();
    expect(env.balances).toEqual([100, 97]);
    expect(env.wallet).toHaveBeenCalledTimes(1);
  });

  test("CP-U9 합산 체험이 남은 동안은 어느 인물의 턴 뒤에도 지갑을 다시 읽어 체험 남은 수를 알린다", async () => {
    const env = setup([
      { balance: 100, trialRemaining: 20 },
      { balance: 100, trialRemaining: 19 },
    ]);
    env.source.openRoom("mina");
    await flush();
    env.source.sendText("mina", "안녕하세요");
    env.finish(0, 100);
    await flush();
    expect(env.wallet).toHaveBeenCalledTimes(2);
    expect(env.trials).toEqual([20, 19]);
  });

  test("CP-U9 덕수쌤의 턴도 같다(체험 인물이 따로 없다)", async () => {
    const env = setup([
      { balance: 100, trialRemaining: 20 },
      { balance: 100, trialRemaining: 19 },
    ]);
    env.source.openRoom("duksu");
    await flush();
    env.source.sendText("duksu", "안녕하세요");
    env.finish(0, 100);
    await flush();
    expect(env.wallet).toHaveBeenCalledTimes(2);
    expect(env.trials).toEqual([20, 19]);
    expect(env.balances).toEqual([100, 100, 100]);
  });

  test("CP-U9 잔액을 모르는 턴(크레딧 없는 서버 · 실패)도 지갑을 다시 읽는다 · 지갑 포트가 없으면 아무것도 읽지 않는다", async () => {
    const env = setup([
      { balance: 50, trialRemaining: 0 },
      { balance: 47, trialRemaining: 0 },
    ]);
    env.source.openRoom("mina");
    await flush();
    env.source.sendText("mina", "안녕하세요");
    env.finish(3, null);
    await flush();
    expect(env.balances).toEqual([50, 47]);

    const none = setup([], { noWallet: true });
    await flush();
    expect(none.balances).toEqual([]);
    expect(none.trials).toEqual([]);
  });
});
