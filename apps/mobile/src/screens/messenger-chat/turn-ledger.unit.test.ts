import { describe, expect, test, vi } from "vitest";

import { parseTurnRecord, type TurnRecord } from "./free-turns";
import { createTurnLedger, memoryTurnRecordStore, type TurnRecordStore } from "./turn-ledger";

// `unit` 계층(MC2-U23): 무료 수 원장 — 저장 · 시계 주입 · 구독(messenger-chat-1-5 spec §5.3).
// 저장은 메모리 · 가짜 now 로만 돌린다(기기 저장은 chat-local-stores 몫).

const at = (y: number, m: number, d: number, h = 0, mi = 0): number =>
  new Date(y, m - 1, d, h, mi).getTime();

function setup(initial: TurnRecord | null = null, start = at(2026, 11, 10, 9, 0)) {
  let clock = start;
  let stored: TurnRecord | null = initial;
  const writes: TurnRecord[] = [];
  const store: TurnRecordStore = {
    read: () => stored,
    write: (record) => {
      writes.push(record);
      stored = record;
    },
  };
  const ledger = createTurnLedger({ store, now: () => clock });
  return {
    ledger,
    writes,
    stored: () => stored,
    setClock: (ms: number) => {
      clock = ms;
    },
  };
}

describe("createTurnLedger 세기 (MC2-U23)", () => {
  test("MC2-U23. 처음엔 오늘 3 남고 판 표시는 due 다", () => {
    const { ledger } = setup();
    expect(ledger.usage()).toEqual({
      day: "2026-11-10",
      used: 0,
      remaining: 3,
      outPanel: "due",
    });
  });

  test("MC2-U23. recordFreeSend 를 세 번 하면 남은 수가 3 → 2 → 1 → 0 이다", () => {
    const { ledger } = setup();
    const left: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      ledger.recordFreeSend();
      left.push(ledger.usage().remaining);
    }
    expect(left).toEqual([2, 1, 0]);
    expect(ledger.usage().used).toBe(3);
  });

  test("MC2-U23. recordOutPanelShown 은 판 표시를 shown 으로 바꾸고 사용 수는 그대로다", () => {
    const { ledger } = setup();
    ledger.recordFreeSend();
    ledger.recordOutPanelShown();
    expect(ledger.usage()).toMatchObject({ used: 1, outPanel: "shown" });
  });

  test("MC2-U23. 하루 수를 주입할 수 있다", () => {
    let stored: TurnRecord | null = null;
    const ledger = createTurnLedger({
      store: { read: () => stored, write: (record) => void (stored = record) },
      now: () => at(2026, 11, 10, 9, 0),
      perDay: 5,
    });
    expect(ledger.usage().remaining).toBe(5);
    ledger.recordFreeSend();
    expect(ledger.usage().remaining).toBe(4);
  });
});

describe("createTurnLedger 저장 (MC2-U23)", () => {
  test("MC2-U23. 쓴 값은 parseTurnRecord 로 읽을 수 있다", () => {
    const { ledger, writes, stored } = setup();
    ledger.recordFreeSend();
    ledger.recordOutPanelShown();
    expect(writes.length).toBeGreaterThanOrEqual(2);
    for (const record of writes) expect(parseTurnRecord(record)).toEqual(record);
    expect(stored()).toEqual({ day: "2026-11-10", used: 1, outPanel: "shown" });
  });

  test("MC2-U23. 저장소에 오늘 기록이 있으면 이어서 센다(재시작 뒤에도 남은 수 유지)", () => {
    const { ledger } = setup({ day: "2026-11-10", used: 2, outPanel: "shown" });
    expect(ledger.usage()).toEqual({
      day: "2026-11-10",
      used: 2,
      remaining: 1,
      outPanel: "shown",
    });
  });

  test("MC2-U23. 저장소의 옛 날 기록은 오늘 3 으로 친다", () => {
    const { ledger } = setup({ day: "2026-11-09", used: 3, outPanel: "shown" });
    expect(ledger.usage()).toMatchObject({
      day: "2026-11-10",
      used: 0,
      remaining: 3,
      outPanel: "due",
    });
  });

  test("MC2-U23. memoryTurnRecordStore: 처음 값을 읽고, 쓴 값을 다시 읽는다", () => {
    const seed: TurnRecord = { day: "2026-11-10", used: 1, outPanel: "due" };
    const store = memoryTurnRecordStore(seed);
    expect(store.read()).toEqual(seed);
    const next: TurnRecord = { day: "2026-11-10", used: 2, outPanel: "due" };
    store.write(next);
    expect(store.read()).toEqual(next);
    expect(memoryTurnRecordStore().read()).toBeNull();
  });

  test("MC2-U23. 메모리 저장소 위에서 원장이 센다", () => {
    const ledger = createTurnLedger({
      store: memoryTurnRecordStore(),
      now: () => at(2026, 11, 10, 9, 0),
    });
    ledger.recordFreeSend();
    ledger.recordFreeSend();
    expect(ledger.usage().remaining).toBe(1);
  });
});

describe("createTurnLedger 시계 (MC2-U23)", () => {
  test("MC2-U23. 시계를 다음 날 00:00 으로 옮기면 새 날 3 · due 다(저장 기록은 옛 날 그대로)", () => {
    const { ledger, setClock, stored } = setup();
    ledger.recordFreeSend();
    ledger.recordFreeSend();
    ledger.recordFreeSend();
    ledger.recordOutPanelShown();
    expect(ledger.usage().remaining).toBe(0);

    setClock(at(2026, 11, 11, 0, 0));

    expect(ledger.usage()).toEqual({
      day: "2026-11-11",
      used: 0,
      remaining: 3,
      outPanel: "due",
    });
    expect(stored()?.day).toBe("2026-11-10");
  });

  test("MC2-U23. 자정 1 ms 전까지는 아직 그날이다", () => {
    const { ledger, setClock } = setup();
    ledger.recordFreeSend();
    setClock(at(2026, 11, 11, 0, 0) - 1);
    expect(ledger.usage()).toMatchObject({ day: "2026-11-10", remaining: 2 });
  });

  test("MC2-U23. 새 날에 보내면 그날 used 1 부터 다시 센다", () => {
    const { ledger, setClock, stored } = setup();
    ledger.recordFreeSend();
    ledger.recordFreeSend();
    setClock(at(2026, 11, 11, 8, 0));
    ledger.recordFreeSend();
    expect(ledger.usage()).toMatchObject({ day: "2026-11-11", used: 1, remaining: 2 });
    expect(stored()).toEqual({ day: "2026-11-11", used: 1, outPanel: "due" });
  });
});

describe("createTurnLedger 참조 · 구독 (MC2-U23)", () => {
  test("MC2-U23. 상태가 같으면 usage() 는 같은 참조다", () => {
    const { ledger } = setup();
    expect(ledger.usage()).toBe(ledger.usage());
    ledger.recordFreeSend();
    const afterSend = ledger.usage();
    expect(ledger.usage()).toBe(afterSend);
  });

  test("MC2-U23. 상태가 바뀌면 다른 참조다", () => {
    const { ledger } = setup();
    const before = ledger.usage();
    ledger.recordFreeSend();
    expect(ledger.usage()).not.toBe(before);
  });

  test("MC2-U23. 기록할 때 구독자에게 알리고, 해제하면 알리지 않는다", () => {
    const { ledger } = setup();
    const listener = vi.fn();
    const unsubscribe = ledger.subscribe(listener);
    ledger.recordFreeSend();
    expect(listener).toHaveBeenCalledTimes(1);
    ledger.recordOutPanelShown();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    ledger.recordFreeSend();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("createTurnLedger 저장 실패 (MC2-U23)", () => {
  test("MC2-U23. 읽기가 던져도 던지지 않고 메모리로 계속한다", () => {
    const store: TurnRecordStore = {
      read: () => {
        throw new Error("storage unavailable");
      },
      write: () => undefined,
    };
    const ledger = createTurnLedger({ store, now: () => at(2026, 11, 10, 9, 0) });
    expect(() => ledger.usage()).not.toThrow();
    expect(ledger.usage().remaining).toBe(3);
    ledger.recordFreeSend();
    expect(ledger.usage().remaining).toBe(2);
  });

  test("MC2-U23. 쓰기가 던져도 던지지 않고 이번 실행은 센다", () => {
    const store: TurnRecordStore = {
      read: () => null,
      write: () => {
        throw new Error("quota");
      },
    };
    const ledger = createTurnLedger({ store, now: () => at(2026, 11, 10, 9, 0) });
    expect(() => ledger.recordFreeSend()).not.toThrow();
    expect(() => ledger.recordOutPanelShown()).not.toThrow();
    expect(ledger.usage()).toMatchObject({ used: 1, remaining: 2, outPanel: "shown" });
  });
});
