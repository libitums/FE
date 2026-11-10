// 테스트 지원 — 최종 테스트(RP)를 풀어 결과 화면까지 가는 도우미입니다(MC2-I1~I4: 새 친구 시트).
// 제품 코드는 import하지 않습니다. 정답은 계약 함수(`catalogFinalPlanOf`)가 내는 계획에서 읽어 탭합니다.
// 부팅은 내장 콘텐츠 그대로(`episode-format-harness.boot`)이고, 결과 화면 이후의 시간을 `vi.useFakeTimers()`로 직접 흘립니다.

import { vi } from "vitest";
import { act, screen } from "@lynx-js/react/testing-library";

import { catalogFinalPlanOf, type CatalogRoleplayTurn } from "../catalog-final-model";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import { isTypedAnswerCorrect } from "../../lib/hangul-keyboard";
import { fillPlaceholders } from "../../lib/placeholder-fill";
import {
  boot,
  exitResult,
  tapButtonIn,
  tapId,
  tapNode,
  tapRoundIn,
  u01,
  u02,
  u03,
} from "./episode-format-harness";

export { u01, u02, u03 };

/** 한 에피소드의 학습 유닛을 모두 끝낸 키입니다(최종 RP만 남김). */
export const BEFORE_FINAL = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"];

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

function finalTurnsOf(episodeId: string, ordinal: number): readonly CatalogRoleplayTurn[] {
  const entry = catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`not ready: ${episodeId}`);
  return catalogFinalPlanOf(
    entry,
    ordinal,
    (text, script) => fillPlaceholders(text, {}, script),
    (path) => path,
  ).turns;
}

function correctPlacement(turn: CatalogRoleplayTurn): number[] {
  const count = turn.tiles.length;
  const search = (placed: number[]): number[] | null => {
    if (placed.length === count) {
      const typed = placed.map((index) => turn.tiles[index]?.ko ?? "").join(" ");
      return turn.accepted.some((answer) => isTypedAnswerCorrect(typed, answer)) ? placed : null;
    }
    for (let index = 0; index < count; index += 1) {
      if (placed.includes(index)) continue;
      const found = search([...placed, index]);
      if (found !== null) return found;
    }
    return null;
  };
  const found = search([]);
  if (found === null) throw new Error(`no placement: ${turn.id}`);
  return found;
}

/** u01 · u02를 모두 끝내고 `episodeId`의 최종만 남긴 설치로 부팅합니다(맵이 서고 RP 노드가 열려 있음). */
export async function bootBeforeFinal(episodeId: string): Promise<void> {
  const done = [...BEFORE_FINAL, "RP"];
  await boot({
    [u01]: episodeId === u01 ? BEFORE_FINAL : done,
    [u02]: episodeId === u02 ? BEFORE_FINAL : episodeId === u01 ? ["intro"] : done,
    ...(episodeId === u03 ? { [u03]: BEFORE_FINAL } : {}),
  });
}

/**
 * 최종 테스트를 풉니다. `right=false`면 모든 턴을 거꾸로 놓아 틀립니다.
 * 가짜 타이머는 **결과 화면이 서기 전에** 켭니다 — 시트의 2초 타이머가 가짜 시계에 걸려야 합니다.
 */
export function playFinal(episodeId: string, ordinal: number, right: boolean): void {
  vi.useFakeTimers();
  tapNode(episodeId, "RP");
  for (const turn of finalTurnsOf(episodeId, ordinal)) {
    const order = correctPlacement(turn);
    for (const tile of right ? order : [...order].reverse()) tapId(`sentence-order-chip-${tile}`);
    tapButtonIn("catalog-final-screen-action");
    tapButtonIn("catalog-final-screen-action");
  }
}

/**
 * 결과 화면의 나가기를 눌러 여정 맵(바텀 네비게이션이 있는 곳)까지 갑니다. 통과한 최종이면 나가기가 표지(통과 뒤 컷)로
 * 이어지므로 표지의 뒤로를 한 번 더 누릅니다. 가짜 타이머 아래라 `flush` 대신 마이크로태스크만 비웁니다.
 */
export async function exitToMap(): Promise<void> {
  exitResult();
  if (screen.queryByTestId("catalog-cover-screen") !== null)
    tapRoundIn("catalog-cover-screen-back");
  await act(async () => {
    await Promise.resolve();
  });
}
