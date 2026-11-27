// 롤플레이 아래 패널의 순수 계산입니다(시안 R1 ~ R5). UI를 import하지 않습니다.

import { readingOf } from "../../lib/romanization-display";
import type { ChoiceRomanization } from "../../lib/session-options";
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

/** 대사 상자 아래 줄 — `VisualNovelDialog`의 `romanization` · `translation`에 그대로 넘깁니다. */
export type RoleplayDialogLines = {
  readonly romanization: string | undefined;
  readonly translation: string | undefined;
};

/**
 * 롤플레이 대사 상자(상대 줄 · 내 말풍선 · 반응)의 아래 줄입니다 — 컷 대사(ADR-0188 개정 D7)와 같은 규칙. 로마자는 스위치가 켜졌을
 * 때만(콘텐츠 로마자, 없으면 변환), 뜻은 사용자 언어 뜻만입니다. 뜻이 없다고 로마자로 떨어지지 않습니다(스위치를 끈 사람에게 로마자가 서지 않게).
 */
export function roleplayDialogLinesOf(
  line: { readonly ko: string; readonly roman: string | null; readonly en: string | null },
  display: ChoiceRomanization,
): RoleplayDialogLines {
  return {
    romanization: display === "shown" ? (readingOf(line.ko, line.roman) ?? undefined) : undefined,
    translation: line.en ?? undefined,
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
