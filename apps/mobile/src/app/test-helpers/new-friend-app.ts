// 테스트 지원 — 새 친구 시트(MC2-I1~I4)의 도우미입니다. 막간(INT) 이야기를 끝내거나 건너뛰어 맵으로 돌아오는 길과, 최종
// 테스트(RP)를 풀어 결과 화면까지 가는 길(이제 시트가 없음을 보는 데 씁니다)을 둡니다.
// 제품 코드는 import하지 않습니다. 정답은 계약 함수(`catalogFinalPlanOf`)가 내는 계획에서 읽어 탭합니다.
// 부팅은 내장 콘텐츠 그대로(`episode-format-harness.boot`)이고, 결과 화면 이후의 시간을 `vi.useFakeTimers()`로 직접 흘립니다.

import { expect, vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

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

/** 막간(INT) 앞까지 끝낸 키입니다 — u03의 INT는 S4 다음입니다. */
export const BEFORE_INTERLUDE = ["intro", "S1", "S2", "S3", "S4"];

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

/** u01 · u02를 모두 끝내고 u03은 막간(INT) 앞까지 끝낸 설치로 부팅합니다(맵의 INT 「Story」 노드가 열려 있음). */
export async function bootBeforeInterlude(): Promise<void> {
  const done = [...BEFORE_FINAL, "RP"];
  await boot({ [u01]: done, [u02]: done, [u03]: BEFORE_INTERLUDE });
}

const tapStoryButton = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});

/** 맵의 u03 막간 노드를 눌러 시작 화면을 엽니다. 가짜 타이머는 여기서 켭니다 — 맵이 돌아온 뒤 시트의 타이머가 걸려야 합니다. */
export function openInterlude(): void {
  vi.useFakeTimers();
  fireEvent.tap(screen.getByTestId(`ui-lynx-special-unit-catalog-unit-${u03}-INT`), {});
  expect(screen.getByTestId("story-intro-screen")).toBeInTheDocument();
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

/** 막간을 Start로 끝까지 보고 「To be continued…」 배너를 닫아 맵으로 돌아옵니다. */
export async function finishInterlude(): Promise<void> {
  openInterlude();
  tapStoryButton("story-intro-start");
  // 컷 수만큼 넘깁니다 — 타자기가 진행 중이면 첫 탭이 글을 다 보이게 합니다.
  for (let guard = 0; screen.queryByTestId("episode-banner-screen") === null; guard += 1) {
    if (guard > 40) throw new Error("interlude did not reach the banner");
    const dialog = screen.queryByTestId("ui-lynx-visual-novel-dialog");
    if (dialog?.getAttribute("data-status") === "revealing")
      tapStoryButton("catalog-cover-screen-next");
    tapStoryButton("catalog-cover-screen-next");
  }
  fireEvent.tap(screen.getByTestId("episode-banner-screen"), {});
  await settle();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
}

/** 막간 시작 화면에서 Skip → 확인으로 배너 없이 맵으로 돌아옵니다. */
export async function skipInterlude(): Promise<void> {
  openInterlude();
  tapStoryButton("story-intro-skip");
  fireEvent.tap(
    within(screen.getByTestId("story-intro-confirm"))
      .getAllByText("Skip")
      .slice(-1)[0] as HTMLElement,
    {},
  );
  await settle();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
}

/** 막간 시작 화면에서 뒤로 — 기록 없이 맵으로 돌아옵니다(맵이 다시 마운트됨). */
export async function exitInterludeIntro(): Promise<void> {
  if (!vi.isFakeTimers()) vi.useFakeTimers();
  fireEvent.tap(screen.getByTestId(`ui-lynx-special-unit-catalog-unit-${u03}-INT`), {});
  fireEvent.tap(
    within(screen.getByTestId("story-intro-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
  await settle();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
}
