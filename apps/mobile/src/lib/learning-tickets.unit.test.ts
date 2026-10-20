import { describe, expect, test } from "vitest";

import {
  fullTicketLedger,
  grantFreeTicket,
  isFullTicketLedger,
  mergeTicketLedgers,
  spendTicket,
  ticketClock,
  ticketLedgerCovers,
  ticketLedgerFrom,
  ticketRefillMs,
  ticketStatusAt,
} from "./learning-tickets";
import type { TicketLedger } from "./learning-tickets";

// `unit` 계층: 학습 티켓 원장(최대 3장 · 1장당 1시간 충전).

const H = ticketRefillMs;
const MIN = 60_000;
const T0 = 1_800_000_000_000;

function spent(ledger: TicketLedger, nowMs: number): TicketLedger {
  const next = spendTicket(ledger, nowMs);
  if (next === null) throw new Error("쓸 수 없음");
  return next;
}

describe("ticketStatusAt · spendTicket", () => {
  test("TK1. 가득(기본값)은 3장 · 다음 충전 없음 · 칸 셋 모두 찬 칸", () => {
    expect(ticketStatusAt(fullTicketLedger, T0)).toEqual({
      available: 3,
      nextInMs: null,
      slots: [{ kind: "ready" }, { kind: "ready" }, { kind: "ready" }],
    });
  });

  test("TK2. 가득에서 쓰면 2장 · 다음 60분, 30분 뒤 또 쓰면 1장 · 다음 30분, 그 30분 뒤 2장 · 다음 60분", () => {
    const once = spent(fullTicketLedger, T0);
    expect(ticketStatusAt(once, T0)).toMatchObject({ available: 2, nextInMs: H });
    const twice = spent(once, T0 + 30 * MIN);
    expect(ticketStatusAt(twice, T0 + 30 * MIN)).toMatchObject({
      available: 1,
      nextInMs: 30 * MIN,
    });
    expect(ticketStatusAt(twice, T0 + 60 * MIN)).toMatchObject({ available: 2, nextInMs: H });
  });

  test("TK3. 0장에서는 쓸 수 없고, 3시간 뒤에는 다시 가득", () => {
    const empty = spent(spent(spent(fullTicketLedger, T0), T0), T0);
    expect(ticketStatusAt(empty, T0).available).toBe(0);
    expect(spendTicket(empty, T0)).toBeNull();
    expect(ticketStatusAt(empty, T0 + 3 * H)).toMatchObject({ available: 3, nextInMs: null });
  });

  test("TK4. 오래 비워 둔 뒤 쓰면 지금부터 60분", () => {
    const old = spent(fullTicketLedger, T0);
    const later = spent(old, T0 + 10 * H);
    expect(ticketStatusAt(later, T0 + 10 * H)).toMatchObject({ available: 2, nextInMs: H });
  });
});

describe("칸", () => {
  test("TK5. 2장이면 [충전 중, 찬, 찬] — 진행률 = 1 − 남은/60분", () => {
    const ledger = spent(fullTicketLedger, T0);
    expect(ticketStatusAt(ledger, T0 + 18 * MIN).slots).toEqual([
      { kind: "charging", progress: 0.3, readyInMs: 42 * MIN },
      { kind: "ready" },
      { kind: "ready" },
    ]);
  });

  test("TK6. 0장이면 [충전 중, 기다림, 기다림] — 기다리는 칸은 앞 칸 + 60분씩", () => {
    const empty = spent(spent(spent(fullTicketLedger, T0), T0), T0);
    expect(ticketStatusAt(empty, T0 + 18 * MIN).slots).toEqual([
      { kind: "charging", progress: 0.3, readyInMs: 42 * MIN },
      { kind: "waiting", readyInMs: 42 * MIN + H },
      { kind: "waiting", readyInMs: 42 * MIN + 2 * H },
    ]);
  });
});

describe("grantFreeTicket", () => {
  test("TK7. 가득이 아니고 그날 처음이면 1장이 차고, 같은 날 두 번째는 null", () => {
    const empty = spent(spent(spent(fullTicketLedger, T0), T0), T0);
    const granted = grantFreeTicket(empty, T0, "2027-01-15");
    expect(granted).not.toBeNull();
    expect(ticketStatusAt(granted as TicketLedger, T0).available).toBe(1);
    expect(grantFreeTicket(granted as TicketLedger, T0, "2027-01-15")).toBeNull();
    expect(grantFreeTicket(granted as TicketLedger, T0, "2027-01-16")).not.toBeNull();
  });

  test("TK8. 가득이면 null", () => {
    expect(grantFreeTicket(fullTicketLedger, T0, "2027-01-15")).toBeNull();
  });

  test("TK9. 받은 1장을 쓰면 다시 0장", () => {
    const empty = spent(spent(spent(fullTicketLedger, T0), T0), T0);
    const granted = grantFreeTicket(empty, T0, "2027-01-15") as TicketLedger;
    expect(ticketStatusAt(spent(granted, T0), T0).available).toBe(0);
  });
});

describe("mergeTicketLedgers · ticketLedgerCovers", () => {
  test("TK10. 한쪽이 쓰고 다른 쪽이 가득이면 쓴 쪽 — 순서를 바꿔도 같다", () => {
    const used = spent(fullTicketLedger, T0);
    expect(mergeTicketLedgers(used, fullTicketLedger)).toEqual(used);
    expect(mergeTicketLedgers(fullTicketLedger, used)).toEqual(used);
  });

  test("TK11. 한쪽이 무료 1장을 받고 다른 쪽이 그 전 상태면 받은 것이 남는다", () => {
    const empty = spent(spent(spent(fullTicketLedger, T0), T0), T0);
    const granted = grantFreeTicket(empty, T0, "2027-01-15") as TicketLedger;
    const merged = mergeTicketLedgers(empty, granted);
    expect(merged).toEqual(mergeTicketLedgers(granted, empty));
    expect(ticketStatusAt(merged, T0).available).toBe(1);
  });

  test("TK12. 남은 장수가 적은 쪽을 따른다", () => {
    const one = spent(fullTicketLedger, T0);
    const two = spent(one, T0);
    expect(ticketStatusAt(mergeTicketLedgers(one, two), T0).available).toBe(1);
  });

  test("TK13. covers — 서버가 필드마다 같거나 크면 참", () => {
    const used = spent(fullTicketLedger, T0);
    expect(ticketLedgerCovers(used, fullTicketLedger)).toBe(true);
    expect(ticketLedgerCovers(fullTicketLedger, used)).toBe(false);
    expect(ticketLedgerCovers(used, used)).toBe(true);
  });
});

describe("ticketLedgerFrom · isFullTicketLedger · ticketClock", () => {
  test("TK14. 맞는 모양은 그대로, 틀린 모양 · 없음은 가득", () => {
    const raw = { refillAtMs: T0, grantedMs: H, grantDay: "2027-01-15" };
    expect(ticketLedgerFrom(raw)).toEqual(raw);
    expect(ticketLedgerFrom(undefined)).toEqual(fullTicketLedger);
    expect(ticketLedgerFrom({ refillAtMs: -1, grantedMs: 0, grantDay: "" })).toEqual(
      fullTicketLedger,
    );
    expect(ticketLedgerFrom({ refillAtMs: "1", grantedMs: 0, grantDay: "" })).toEqual(
      fullTicketLedger,
    );
    expect(ticketLedgerFrom({ refillAtMs: 1.5, grantedMs: 0, grantDay: "" })).toEqual(
      fullTicketLedger,
    );
    expect(ticketLedgerFrom({ refillAtMs: T0, grantedMs: 0, grantDay: "어제" })).toEqual(
      fullTicketLedger,
    );
  });

  test("TK15. 기본값만 가득으로 친다", () => {
    expect(isFullTicketLedger(fullTicketLedger)).toBe(true);
    expect(isFullTicketLedger({ ...fullTicketLedger })).toBe(true);
    expect(isFullTicketLedger(spent(fullTicketLedger, T0))).toBe(false);
  });

  test("TK16. 시계는 초 단위 올림 — h:mm:ss · h:mm", () => {
    expect(ticketClock(42 * MIN + 8_000, true)).toBe("0:42:08");
    expect(ticketClock(42 * MIN + 7_100, true)).toBe("0:42:08");
    expect(ticketClock(42 * MIN, false)).toBe("0:42");
    expect(ticketClock(41 * MIN + 1_000, false)).toBe("0:42");
    expect(ticketClock(2 * H + 5 * MIN, false)).toBe("2:05");
    expect(ticketClock(500, false)).toBe("0:01");
  });
});
