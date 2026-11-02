import { afterEach, describe, expect, test, vi } from "vitest";
import { screen, within } from "@lynx-js/react/testing-library";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { StoryFinalTurn } from "../screens/catalog-story-final/catalog-story-final.contract";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { catalogStoryFinalPlanOf } from "./catalog-story-final-model";
import {
  boot,
  flush,
  resetApp,
  savedUnits,
  status,
  tapButtonIn,
  tapId,
  tapNode,
  title,
  u01,
} from "./test-helpers/episode-format-harness";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";

vi.mock("../lib/episode-bundled", () => import("../lib/episode-bundled.balance.test-support"));

// `integration` 계층: 내장 balance u01(level-3)로 여정맵 → 이야기 파이널 → 결과 · 진도(RP)까지. S8은 레슨 노드에서
// 빠지고, 파이널 노드가 S8 문항을 턴으로 풉니다. 턴 답은 같은 계획 함수로 미리 구해 둡니다(화면이 섞은 그대로).

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const entry = catalog.find((candidate) => candidate.id === u01);
if (entry === undefined || entry.status !== "ready") throw new Error("u01 not ready");
const section = catalogMapSectionsOf(catalog).find((candidate) => candidate.episodeId === u01);
const plan = catalogStoryFinalPlanOf(
  entry,
  1,
  "S8",
  (text, script) => fillPlaceholders(text, {}, script),
  () => null,
);

// S8 밖 학습 유닛을 모두 끝낸 진행입니다 — 파이널이 열립니다.
const beforeFinal = ["intro", ...(section?.kind === "catalog-ready" ? section.lessonKeys : [])];

function solve(turn: StoryFinalTurn, right: boolean): void {
  if (turn.kind === "choice") {
    const wrong = turn.correctIndex === 0 ? 1 : 0;
    tapId(`catalog-story-final-option-${right ? turn.correctIndex : wrong}`);
  } else if (turn.kind === "tiles") {
    const order = turn.tiles.map((_, index) => index);
    const target = turn.accepted[0].replace(/\s/g, "");
    // 정답 문장을 앞에서부터 덮는 타일을 고릅니다(같은 글자 타일이 있어도 순서대로 하나씩).
    const picked: number[] = [];
    let rest = target;
    while (rest.length > 0) {
      const next = order.find(
        (index) =>
          !picked.includes(index) &&
          rest.startsWith(turn.tiles[index]?.ko.replace(/\s/g, "") ?? "\u0000"),
      );
      if (next === undefined) break;
      picked.push(next);
      rest = rest.slice(turn.tiles[next]?.ko.replace(/\s/g, "").length ?? 0);
    }
    for (const index of right ? picked : [...picked].reverse())
      tapId(`sentence-order-chip-${index}`);
    tapButtonIn("catalog-story-final-action");
  } else {
    // 이 시험 환경에는 손글씨 모듈이 없어 음절마다 Next letter / Check가 막지 않고 넘어갑니다.
    for (let index = 0; index < turn.syllables.length; index += 1)
      tapButtonIn("catalog-story-final-action");
  }
  tapButtonIn("catalog-story-final-action");
}

afterEach(resetApp);

describe("SFI. 여정맵 이야기 파이널", () => {
  test("SFI1. balance u01은 S8 레슨 노드가 없고 파이널 노드가 S8 문항 수의 턴을 연다", async () => {
    expect(section?.kind === "catalog-ready" ? section.storyFinalKey : null).toBe("S8");
    await boot({ [u01]: beforeFinal });
    expect(screen.queryByTestId(catalogNodeTestId(u01, "S8"))).not.toBeInTheDocument();
    expect(status(u01, "RP")).toBe("available");
    tapNode(u01, "RP");
    expect(screen.getByTestId("catalog-story-final")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-story-final-progress")).toHaveTextContent(
      `Turn 1 of ${plan.turns.length}`,
    );
  });

  test("SFI2. 모든 턴을 맞히면 통과 결과가 서고 진도에 RP가 찍힌다", async () => {
    const { rpcs } = await boot({ [u01]: beforeFinal });
    tapNode(u01, "RP");
    for (const turn of plan.turns) solve(turn, true);
    expect(title()).toHaveTextContent(/COMPLETE|PERFECT/);
    await flush();
    expect(savedUnits(rpcs, u01)).toContain("RP");
  });

  test("SFI3. 모두 틀리면 미통과이고 RP가 찍히지 않는다", async () => {
    const { rpcs } = await boot({ [u01]: beforeFinal });
    tapNode(u01, "RP");
    for (const turn of plan.turns) solve(turn, turn.kind === "write");
    expect(title()).not.toHaveTextContent(/COMPLETE|PERFECT/);
    await flush();
    expect(savedUnits(rpcs, u01)).not.toContain("RP");
    expect(
      within(screen.getByTestId("lesson-complete-screen")).getByTestId(
        "lesson-complete-screen-retry",
      ),
    ).toBeInTheDocument();
  });
});
