import { describe, expect, test } from "vitest";

import { catalogUnitTicketCost } from "./catalog-ticket-cost";
import { TUTORIAL_EPISODE_ID } from "./tutorial-episode";

// `unit` 계층: 유닛을 시작할 때 쓰는 티켓 수 — 튜토리얼 · 이미 끝낸 유닛 · 티켓으로 연 유닛이면 0, 아니면 1.

describe("catalogUnitTicketCost", () => {
  test("TK1. u00의 어떤 유닛이든(끝냄 · 안 끝냄 · 최종 RP) 0이다", () => {
    const progress = { [TUTORIAL_EPISODE_ID]: ["intro", "S1"] };
    expect(catalogUnitTicketCost(progress, TUTORIAL_EPISODE_ID, "S1")).toBe(0);
    expect(catalogUnitTicketCost(progress, TUTORIAL_EPISODE_ID, "S2")).toBe(0);
    expect(catalogUnitTicketCost(progress, TUTORIAL_EPISODE_ID, "RP")).toBe(0);
    expect(catalogUnitTicketCost({}, TUTORIAL_EPISODE_ID, "S5")).toBe(0);
  });

  test("TK1. u01은 안 끝낸 유닛이 1, 끝낸 유닛이 0이다", () => {
    const progress = { "u01-water": ["intro", "S1"] };
    expect(catalogUnitTicketCost(progress, "u01-water", "S2")).toBe(1);
    expect(catalogUnitTicketCost(progress, "u01-water", "RP")).toBe(1);
    expect(catalogUnitTicketCost(progress, "u01-water", "S1")).toBe(0);
    expect(catalogUnitTicketCost({}, "u02-checkin", "S1")).toBe(1);
  });

  test("TK1. 티켓으로 연 유닛(ticketUnits)은 안 끝냈어도 0이고, 다른 유닛 · 다른 에피소드는 그대로 1이다", () => {
    const progress = { "u01-water": ["intro"] };
    const ticketUnits = { "u01-water": ["S1"] };
    expect(catalogUnitTicketCost(progress, "u01-water", "S1", ticketUnits)).toBe(0);
    expect(catalogUnitTicketCost(progress, "u01-water", "S2", ticketUnits)).toBe(1);
    expect(catalogUnitTicketCost(progress, "u02-checkin", "S1", ticketUnits)).toBe(1);
  });
});
