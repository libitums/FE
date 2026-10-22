import { describe, expect, test, vi } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { fullTicketLedger, spendTicket, ticketStatusAt } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import type { JourneyProgressState } from "./learning-progress";
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

function setup(catalogProgress: Record<string, readonly string[]>) {
  let ledger = emptyLedger;
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
  const progress = {
    ...emptyContractState,
    catalogProgress,
  } as unknown as JourneyProgressState;
  const wired = withLearningTickets(base, tickets, progress, sections);
  return { wired, onStartCatalogUnit, onOutOfTickets, ledger: () => ledger };
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
