import { describe, expect, test, vi } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { fullTicketLedger, spendTicket, ticketStatusAt } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import type { ScreenWiring } from "./screen-wiring";
import { createTicketStart } from "./ticket-gate";
import { withLearningTickets } from "./ticket-wiring";
import type { LearningTickets } from "./use-learning-tickets";
import { emptyContractState } from "./test-helpers/progress-state-api";
import { tutorialCoverDoneProgress, tutorialDoneProgress } from "./test-helpers/progress-seed";

// `unit` 계층: 레슨 시작 문지기 결선 — 가드 → 티켓 → 열기. 튜토리얼(u00)은 티켓을 쓰지 않는다.

const T0 = 1_800_000_000_000;
const sections = catalogMapSectionsOf(
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } }),
);
const emptyLedger = [0, 0, 0].reduce<TicketLedger>(
  (ledger) => spendTicket(ledger, T0) as TicketLedger,
  fullTicketLedger,
);

function setup(
  catalogProgress: Record<string, readonly string[]>,
  options: { ledger?: TicketLedger; ticketUnits?: Record<string, readonly string[]> } = {},
) {
  let ledger = options.ledger ?? emptyLedger;
  const onOutOfTickets = vi.fn();
  const startWithTicket = createTicketStart({
    ledger: () => ledger,
    setLedger: (next) => {
      ledger = next;
    },
    now: () => T0,
    onOutOfTickets,
  });
  const onStartCatalogUnit = vi.fn();
  const base = { onStartCatalogUnit, onStartStep: vi.fn() } as unknown as ScreenWiring;
  const tickets = {
    startWithTicket,
    status: ticketStatusAt(ledger, T0),
  } as Pick<LearningTickets, "startWithTicket" | "status">;
  const markTicketUnit = vi.fn();
  const progress = {
    ...emptyContractState,
    catalogProgress,
    ...(options.ticketUnits === undefined ? {} : { ticketUnits: options.ticketUnits }),
    markTicketUnit,
  } as unknown as Parameters<typeof withLearningTickets>[2];
  const wired = withLearningTickets(base, tickets, progress, sections);
  return { wired, onStartCatalogUnit, onOutOfTickets, markTicketUnit, ledger: () => ledger };
}

describe("withLearningTickets — 카탈로그 시작", () => {
  test("TK2. 0장인 빈 원장에서 u00 S1을 시작하면 열리고 원장은 그대로이며 막힘 콜백은 0이다", () => {
    const s = setup(tutorialCoverDoneProgress());
    s.wired.onStartCatalogUnit(TUTORIAL_EPISODE_ID, "S1");
    expect(s.onStartCatalogUnit).toHaveBeenCalledTimes(1);
    expect(s.onStartCatalogUnit).toHaveBeenCalledWith(TUTORIAL_EPISODE_ID, "S1");
    expect(s.ledger()).toEqual(emptyLedger);
    expect(s.onOutOfTickets).not.toHaveBeenCalled();
  });

  test("TK2. 같은 원장에서 u01 S1을 시작하면 막히고 열리지 않는다", () => {
    const s = setup({ ...tutorialDoneProgress(), "u01-water": ["intro"] });
    s.wired.onStartCatalogUnit("u01-water", "S1");
    expect(s.onStartCatalogUnit).not.toHaveBeenCalled();
    expect(s.onOutOfTickets).toHaveBeenCalledTimes(1);
  });

  test("TK2. 잠긴 u00 유닛은 가드가 먼저 막아 열리지 않고 티켓 콜백도 부르지 않는다", () => {
    const s = setup({});
    s.wired.onStartCatalogUnit(TUTORIAL_EPISODE_ID, "S3");
    expect(s.onStartCatalogUnit).not.toHaveBeenCalled();
    expect(s.onOutOfTickets).not.toHaveBeenCalled();
    expect(s.ledger()).toEqual(emptyLedger);
  });
});

describe("withLearningTickets — 티켓으로 연 유닛", () => {
  const opened = { ...tutorialDoneProgress(), "u01-water": ["intro"] };

  test("TK7. 한 장을 쓰고 u01 S1을 열면 그 유닛을 티켓으로 연 유닛으로 적고 연다", () => {
    const s = setup(opened, { ledger: fullTicketLedger });
    s.wired.onStartCatalogUnit("u01-water", "S1");
    expect(s.markTicketUnit).toHaveBeenCalledWith("u01-water", "S1");
    expect(s.onStartCatalogUnit).toHaveBeenCalledWith("u01-water", "S1");
    expect(ticketStatusAt(s.ledger(), T0).available).toBe(2);
  });

  test("TK7. 이미 티켓으로 연 유닛은 0장이어도 티켓 없이 열리고 다시 적지 않는다", () => {
    const s = setup(opened, { ticketUnits: { "u01-water": ["S1"] } });
    s.wired.onStartCatalogUnit("u01-water", "S1");
    expect(s.onStartCatalogUnit).toHaveBeenCalledWith("u01-water", "S1");
    expect(s.onOutOfTickets).not.toHaveBeenCalled();
    expect(s.markTicketUnit).not.toHaveBeenCalled();
    expect(s.ledger()).toEqual(emptyLedger);
  });

  test("TK7. 막혀 열리지 않은 유닛은 적지 않는다", () => {
    const s = setup(opened);
    s.wired.onStartCatalogUnit("u01-water", "S1");
    expect(s.markTicketUnit).not.toHaveBeenCalled();
  });

  test("TK7. 튜토리얼 유닛은 티켓을 쓰지 않으므로 적지 않는다", () => {
    const s = setup(tutorialCoverDoneProgress(), { ledger: fullTicketLedger });
    s.wired.onStartCatalogUnit(TUTORIAL_EPISODE_ID, "S1");
    expect(s.markTicketUnit).not.toHaveBeenCalled();
    expect(s.ledger()).toEqual(fullTicketLedger);
  });

  test("TK7. 결선은 티켓으로 연 유닛을 맵에 내린다", () => {
    const s = setup(opened, { ticketUnits: { "u01-water": ["S1"] } });
    expect(s.wired.catalogTicketUnits).toEqual({ "u01-water": ["S1"] });
  });
});
