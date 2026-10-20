import { describe, expect, test } from "vitest";

import { fullTicketLedger, spendTicket, ticketRefillMs } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import { productJourneySeed } from "./journey-progress";
import {
  journeyProgressCovers,
  journeyProgressFrom,
  learningProgressSnapshotFrom,
  mergeJourneyProgress,
} from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

// `unit` 계층: 진행 스냅숏에 실린 학습 티켓 원장(선택 필드 `tickets`).

const T0 = 1_800_000_000_000;
const used = spendTicket(fullTicketLedger, T0) as TicketLedger;
const base: JourneyProgressState = {
  ...productJourneySeed,
  completedEpisodeIntroIds: [],
  catalogProgress: {},
};

function roundTrip(state: JourneyProgressState): JourneyProgressState | null {
  return journeyProgressFrom(JSON.parse(JSON.stringify(learningProgressSnapshotFrom(state))));
}

describe("LT1 스냅숏", () => {
  test("쓴 원장은 스냅숏 `tickets`로 실리고 다시 읽으면 같다", () => {
    const state = { ...base, tickets: used };
    expect(learningProgressSnapshotFrom(state).tickets).toEqual(used);
    expect(roundTrip(state)?.tickets).toEqual(used);
  });

  test("가득(기본값)이거나 없으면 싣지 않는다", () => {
    expect("tickets" in learningProgressSnapshotFrom({ ...base, tickets: fullTicketLedger })).toBe(
      false,
    );
    expect("tickets" in learningProgressSnapshotFrom(base)).toBe(false);
  });

  test("모양이 틀린 `tickets`는 가득으로 읽고 나머지 진행은 그대로", () => {
    const raw = { ...learningProgressSnapshotFrom(base), completedStepCount: 2, tickets: "x" };
    const state = journeyProgressFrom(raw);
    expect(state?.completedStepCount).toBe(2);
    expect(state?.tickets ?? fullTicketLedger).toEqual(fullTicketLedger);
  });
});

describe("LT2 합치기 · 덮음", () => {
  test("한쪽만 쓴 원장이면 그 원장이 남는다(없음 = 가득)", () => {
    expect(mergeJourneyProgress(base, { ...base, tickets: used }).tickets).toEqual(used);
    expect(mergeJourneyProgress({ ...base, tickets: used }, base).tickets).toEqual(used);
  });

  test("서버 원장이 기기 원장보다 뒤처지면 덮지 않는다", () => {
    const later = { ...used, refillAtMs: used.refillAtMs + ticketRefillMs };
    expect(journeyProgressCovers({ ...base, tickets: used }, { ...base, tickets: later })).toBe(
      false,
    );
    expect(journeyProgressCovers({ ...base, tickets: later }, { ...base, tickets: used })).toBe(
      true,
    );
    expect(journeyProgressCovers(base, base)).toBe(true);
  });
});
