// 롤플레이 아래 패널의 순수 계산입니다(시안 R1 ~ R5). UI를 import하지 않습니다.

import type { RoleplayTalkState, RoleplayTurnReport } from "./roleplay-story.contract";

export type { RoleplayTurnReport } from "./roleplay-story.contract";

export type RoleplayProgressSegment = "done" | "current" | "todo";

/** 넘김(`next`) · 건너뜀(`skip`) 순간의 턴 보고입니다. */
export function roleplayTurnReportOf(
  state: RoleplayTalkState,
  how: "next" | "skip",
): RoleplayTurnReport {
  const turn = state.turnIndex + 1;
  const hint = state.hintUsed === null ? {} : { hintUsed: state.hintUsed };
  if (how === "skip" || state.verdict === null) return { turn, result: "skipped", ...hint };
  return {
    turn,
    result: state.verdict,
    ...(state.judgement === null ? {} : { grade: state.judgement.grade }),
    ...hint,
  };
}

/** 머리의 에피소드 이름표 — 문구표의 「Episode 1.」 끝 마침표(· 미얀마 「။」)를 뗍니다(시안 R1). */
export function roleplayHeaderLabel(label: string): string {
  return label.replace(/[.。။]+$/, "");
}

/** 칸 막대 — 지난 턴은 done, 지금 턴은 맞혀 넘길 차례면 done, 아니면 current, 나머지 todo입니다. */
export function roleplayProgressSegments(
  turnIndex: number,
  total: number,
  answered: boolean,
): readonly RoleplayProgressSegment[] {
  return Array.from({ length: total }, (_, index) => {
    if (index < turnIndex || (index === turnIndex && answered)) return "done";
    return index === turnIndex ? "current" : "todo";
  });
}
