// 롤플레이 안의 초점 이동입니다. 누른 버튼이 다음 상태에서 숨으면 초점이 body로 빠지므로,
// 전이마다 그다음 조작(또는 새로 드러난 글)로 옮깁니다. 단계 · 컷 전환은 trial-dom이 맡습니다.

import { byTestId } from "./trial-dom-util";
import { currentTurnOf } from "./trial-dom-turn";
import type { TrialState } from "./trial-machine.contract";

/** 같은 롤플레이 단계 안 전이에서 초점을 둘 요소. 옮길 것이 없으면 null. */
function turnFocusTarget(
  article: HTMLElement,
  prev: TrialState,
  next: TrialState,
): HTMLElement | null {
  const before = prev.roleplay.turn;
  const turn = next.roleplay.turn;
  if (before.index !== turn.index) return byTestId(article, "trial-turn-progress");
  if (before.mode !== turn.mode && turn.mode === "tiles") {
    return article.querySelector<HTMLElement>('[data-testid="trial-tile"][data-tile-index="0"]');
  }
  if (turn.phase === "judged" && before.phase !== "judged") {
    const retry = turn.mode === "speech" && turn.verdict === "incorrect";
    return byTestId(article, retry ? "trial-turn-retry" : "trial-turn-next");
  }
  if (before.phase === "judged" && turn.phase === "ready")
    return byTestId(article, "trial-turn-speak");
  if (turn.hintShown && !before.hintShown) return byTestId(article, "trial-turn-hint");
  return null;
}

/** 롤플레이 안 전이면 상태별 대상으로 초점을 옮깁니다. */
export function moveTurnFocus(root: HTMLElement, prev: TrialState, next: TrialState): void {
  if (prev.step !== "roleplay" || next.step !== "roleplay") return;
  const article = currentTurnOf(root, next);
  if (article === null) return;
  const target = turnFocusTarget(article, prev, next);
  if (target !== null && target !== target.ownerDocument.activeElement) target.focus();
}
