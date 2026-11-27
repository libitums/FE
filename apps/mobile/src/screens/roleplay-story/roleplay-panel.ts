// 롤플레이 아래 패널의 순수 계산입니다(시안 R1 ~ R5). UI를 import하지 않습니다.

import { readingOf } from "../../lib/romanization-display";
import type { DiffPiece } from "../../lib/syllable-diff";
import { syllableDiff } from "../../lib/syllable-diff";
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

/** close 판정(허용 오차 안의 맞음)의 모범 정답 패널입니다. */
export type RoleplayClose = {
  /** 모범 정답 — 표시 없이 그대로(말하기 퀴즈 close와 같음). */
  readonly expected: string;
  /** 들은 말 — 모범 정답과 다른 음절만 표시합니다. 들은 글자가 비면 빈 열. */
  readonly heard: readonly DiffPiece[];
};

/**
 * 맞았지만 완벽하지 않으면(close) 모범 정답을 보입니다 — 말하기 퀴즈 close(ADR-0201 D6 적용 1)와 같은 규칙: 정답은 표시 없이, 들은
 * 말은 다른 음절에 밑줄(`syllableDiff`). perfect · 오답 · 판정 전에는 `null`(오답은 이미 정답이 주인공인 패널).
 */
export function roleplayCloseOf(state: RoleplayTalkState): RoleplayClose | null {
  const judgement = state.judgement;
  if (state.phase !== "heard" || state.verdict !== "correct" || judgement?.grade !== "close") {
    return null;
  }
  const heard =
    state.heard.trim() === "" ? [] : syllableDiff(state.heard, judgement.expected).heard;
  return { expected: judgement.expected, heard };
}

/** 맞힌 뒤 저절로 넘김을 가르는 조건입니다(ADR-0201 D6 적용 2 개정). */
export type RoleplayAutoAdvanceGate = {
  /** 맞힌 국면인가. */
  readonly correct: boolean;
  /** 맞힌 뒤 최소 시간(`ROLEPLAY_CORRECT_ADVANCE_MS`)이 지났는가. */
  readonly minElapsed: boolean;
  /** 내 문장 소리가 끝났는가(실패 · 상한 시간 포함). */
  readonly replyEnded: boolean;
  /** 내 문장 소리가 있어 그 끝을 기다리는가. */
  readonly waitsForReply: boolean;
  /** 이 턴에 앱이 뒤로 갔는가 — 그러면 저절로 넘기지 않고 누르기를 기다립니다. */
  readonly away: boolean;
};

/**
 * 한 번에 한 목소리 — 내 문장 소리가 끝나기 전에 다음 턴(상대의 다음 줄 소리)으로 넘기지 않습니다. 소리가 없으면 최소 시간만
 * 봅니다. 누르면(Next) 이 조건과 상관없이 바로 넘어갑니다(앞 소리는 화면이 멈춤).
 */
export function roleplayAutoAdvanceReady(gate: RoleplayAutoAdvanceGate): boolean {
  if (!gate.correct || gate.away || !gate.minElapsed) return false;
  return !gate.waitsForReply || gate.replyEnded;
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
