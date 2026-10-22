// 롤플레이 턴의 상태 → DOM 반영입니다. 말하기 · 타일 조작은 둘 다 마크업에 있고 지금 모드가 아닌 쪽을 숨깁니다.

import { canCheckTiles, composeTileReply } from "@libitums/episode-core/judge";

import type { TrialScriptCopy } from "../components/trial/trial-components.contract";
import type { TrialState, TurnNotice } from "./trial-machine.contract";
import { byTestId, setAttr as attr, setHidden as hide, setText as text } from "./trial-dom-util";
import type { TrialModel } from "./trial-model.contract";

const NOTICE_COPY = {
  unsupported: "noticeUnsupported",
  denied: "noticeDenied",
  unavailable: "noticeUnavailable",
} as const satisfies Record<Exclude<TurnNotice, null>, keyof TrialScriptCopy>;

export const noticeCopyOf = (copy: TrialScriptCopy, notice: TurnNotice) =>
  notice === null ? "" : copy[NOTICE_COPY[notice]];

/** 지금 턴의 article. */
export function currentTurnOf(root: ParentNode, state: TrialState): HTMLElement | null {
  const index = String(state.roleplay.turn.index);
  return root.querySelector<HTMLElement>(`[data-testid="trial-turn"][data-turn-index="${index}"]`);
}

/** 판정에 쓴 문장 — 말하기는 들은 말(없으면 못 들음 문구), 타일은 놓은 순서의 글. */
export function heardTextOf(model: TrialModel, copy: TrialScriptCopy, state: TrialState): string {
  const { turn } = state.roleplay;
  const item = model.roleplay.turns[turn.index];
  if (item === undefined) return "";
  if (turn.mode === "tiles") return composeTileReply(item.tiles, turn.placed);
  return turn.heard === "" ? copy.heardNothing : turn.heard;
}

export function applyTurn(
  root: HTMLElement,
  model: TrialModel,
  copy: TrialScriptCopy,
  state: TrialState,
): void {
  const { turn } = state.roleplay;
  const item = model.roleplay.turns[turn.index];
  for (const article of root.querySelectorAll('[data-testid="trial-turn"]')) {
    hide(article, article.getAttribute("data-turn-index") !== String(turn.index));
  }
  const article = currentTurnOf(root, state);
  if (article === null || item === undefined) return;
  const speech = turn.mode === "speech";
  const judged = turn.phase === "judged";
  attr(article, "data-mode", turn.mode);
  attr(article, "data-phase", turn.phase);
  if (turn.phase !== "listening") article.removeAttribute("data-judging");

  const reply = byTestId(article, "trial-turn-reply");
  hide(reply, !judged);
  attr(reply, "data-verdict", judged ? (turn.verdict ?? "") : "");
  const heard = byTestId(article, "trial-turn-heard");
  text(heard, judged ? heardTextOf(model, copy, state) : "");
  // 못 들음 문구는 UI 언어라 lang=ko를 걷고 페이지 언어를 따릅니다.
  if (speech && judged && turn.heard === "") heard?.removeAttribute("lang");
  else attr(heard, "lang", "ko");

  const notice = byTestId(article, "trial-turn-notice");
  hide(notice, turn.notice === null);
  attr(notice, "data-notice", turn.notice ?? "");
  text(notice, noticeCopyOf(copy, turn.notice));

  hide(article.querySelector(".trial-speak"), !speech);
  hide(article.querySelector(".trial-tiles"), speech);

  const listening = turn.phase === "listening";
  const speak = byTestId(article, "trial-turn-speak");
  attr(speak, "aria-label", listening ? copy.stop : copy.speak);
  hide(byTestId(article, "trial-turn-hint"), !turn.hintShown);
  hide(byTestId(article, "trial-turn-hint-button"), turn.hintShown);
  hide(byTestId(article, "trial-turn-retry"), !(speech && judged && turn.verdict === "incorrect"));

  const placed = new Set(turn.placed);
  for (const tile of article.querySelectorAll('[data-testid="trial-tile"]')) {
    attr(tile, "aria-pressed", String(placed.has(Number(tile.getAttribute("data-tile-index")))));
    if (judged) attr(tile, "aria-disabled", "true");
    else tile.removeAttribute("aria-disabled");
  }
  const composed = byTestId(article, "trial-turn-composed");
  const composedText = composeTileReply(item.tiles, turn.placed);
  text(composed, composedText);
  // 비었을 때는 자리표시(UI 언어)가 보이므로 lang=ko를 채워졌을 때만 둡니다.
  if (composedText === "") composed?.removeAttribute("lang");
  else attr(composed, "lang", "ko");
  const check = byTestId(article, "trial-turn-check");
  attr(check, "aria-disabled", String(judged || !canCheckTiles(item.tiles, turn.placed)));
  hide(check, judged);

  const canNext = judged && (!speech || turn.verdict === "correct");
  hide(byTestId(article, "trial-turn-next"), !canNext);
}
