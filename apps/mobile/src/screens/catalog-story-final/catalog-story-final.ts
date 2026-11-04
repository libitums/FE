// 여정맵 이야기 파이널 화면의 순수 로직입니다 — 진행(리듀서) · 대답 글 · 타일 판정 · 따라 쓰기 문턱. UI를 import하지
// 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import { isTypedAnswerAccepted, normalizeAnswerText } from "../../lib/hangul-keyboard";
import type { HandwritingTraceOutcome } from "../../lib/handwriting-trace";
import type { AudioCue } from "../../lib/use-audio-cue";
import { STORY_FINAL_TRACE_THRESHOLD } from "./catalog-story-final.contract";
import type {
  StoryFinalAction,
  StoryFinalState,
  StoryFinalTilesTurn,
  StoryFinalTurn,
} from "./catalog-story-final.contract";

const BLANK = "___";

export const initialStoryFinalState: StoryFinalState = {
  turnIndex: 0,
  phase: "answering",
  picked: null,
  placed: [],
  written: [],
  results: [],
};

export function storyFinalReducer(
  state: StoryFinalState,
  action: StoryFinalAction,
): StoryFinalState {
  switch (action.type) {
    case "pick":
      if (state.phase !== "answering") return state;
      return {
        ...state,
        phase: "checked",
        picked: action.optionIndex,
        results: [...state.results, action.result],
      };
    case "toggleTile": {
      if (state.phase !== "answering") return state;
      const placed = state.placed.includes(action.tileIndex)
        ? state.placed.filter((index) => index !== action.tileIndex)
        : [...state.placed, action.tileIndex];
      return { ...state, placed };
    }
    case "check":
      if (state.phase !== "answering" || state.placed.length === 0) return state;
      return { ...state, phase: "checked", results: [...state.results, action.result] };
    case "writeSyllable": {
      if (state.phase !== "answering") return state;
      const written = [...state.written, action.passed];
      if (written.length < action.total) return { ...state, written };
      const result: AnswerResult = written.every(Boolean) ? "correct" : "incorrect";
      return { ...state, written, phase: "checked", results: [...state.results, result] };
    }
    case "nextTurn":
      if (state.phase !== "checked") return state;
      return { ...initialStoryFinalState, turnIndex: state.turnIndex + 1, results: state.results };
  }
}

/** 틀을 빈칸 앞 · 뒤로 가릅니다(앞뒤 공백은 걷습니다). 틀이 없으면 둘 다 비어 있습니다. */
export function storyTemplateParts(template: string | null): {
  readonly before: string;
  readonly after: string;
} {
  if (template === null) return { before: "", after: "" };
  const at = template.indexOf(BLANK);
  if (at === -1) return { before: template.trim(), after: "" };
  return { before: template.slice(0, at).trim(), after: template.slice(at + BLANK.length).trim() };
}

function filled(template: string | null, answer: string): string {
  return template === null || !template.includes(BLANK) ? answer : template.replace(BLANK, answer);
}

function tilesText(turn: StoryFinalTilesTurn, placed: readonly number[]): string {
  return placed.map((index) => turn.tiles[index]?.ko ?? "").join(turn.joiner);
}

/**
 * 내 대답 줄의 글입니다 — 틀이 있으면 빈칸 자리에 지금의 답(고른 보기 · 놓은 타일 · 쓴 음절)을 넣고, 답이 아직 없으면
 * 틀 그대로입니다.
 */
export function storyReplyText(turn: StoryFinalTurn, state: StoryFinalState): string {
  const answer =
    turn.kind === "choice"
      ? state.picked === null
        ? ""
        : (turn.options[state.picked]?.ko ?? "")
      : turn.kind === "tiles"
        ? tilesText(turn, state.placed)
        : turn.syllables.slice(0, state.written.length).join("");
  if (answer === "") return turn.template ?? "";
  return filled(turn.template, answer);
}

export function canCheckStoryTiles(placed: readonly number[]): boolean {
  return placed.length > 0;
}

/** 놓은 타일을 잇는 방식대로 이어 정답 목록과 견줍니다(공백 · 문장부호는 보지 않습니다). */
export function judgeStoryTiles(
  turn: StoryFinalTilesTurn,
  placed: readonly number[],
): AnswerResult {
  return isTypedAnswerAccepted(tilesText(turn, placed), turn.accepted) ? "correct" : "incorrect";
}

/**
 * 정답을 타일로 앞에서부터 남김없이 덮는 조합의 조각 길이(음절 수)입니다 — 공백 · 문장부호는 보지 않습니다. 정답이
 * 여럿이면 처음 덮이는 것. 못 덮으면 `null`.
 */
function coveringPieceLengths(turn: StoryFinalTilesTurn): readonly number[] | null {
  const pieces = turn.tiles.map((tile) => normalizeAnswerText(tile.ko));
  // 쓴 타일은 비트로 셉니다(타일은 몇 개뿐) — 재귀마다 배열을 만들지 않습니다.
  const cover = (rest: string, used: number): number[] | null => {
    if (rest === "") return [];
    for (const [index, piece] of pieces.entries()) {
      if ((used & (1 << index)) !== 0 || piece === "" || !rest.startsWith(piece)) continue;
      const tail = cover(rest.slice(piece.length), used | (1 << index));
      if (tail !== null) return [piece.length, ...tail];
    }
    return null;
  };
  for (const answer of turn.accepted) {
    const lengths = cover(normalizeAnswerText(answer), 0);
    if (lengths !== null && lengths.length > 0) return lengths;
  }
  return null;
}

/**
 * 대답 줄 밑줄마다의 음절 수입니다(정답 순서) — 밑줄 폭을 들어갈 조각 길이에 맞춥니다(2026-11-04 사용자 지적: 한 음절
 * 자리 밑줄이 너무 길다). 못 덮으면 타일 수만큼 0(크기 모름 — 기본 폭).
 */
export function storyBlankSizes(turn: StoryFinalTilesTurn): readonly number[] {
  return coveringPieceLengths(turn) ?? turn.tiles.map(() => 0);
}

/**
 * 정답에 들어가는 타일 수입니다 — 대답 줄에 그 수만큼 밑줄을 그어 「몇 개를 놓는지」 보이게 합니다(2026-11-03 사용자
 * 지적: 밑줄이 하나면 하나만 넣는 줄로 읽힌다). 못 덮으면 타일 전부입니다.
 */
export function storyTilesNeeded(turn: StoryFinalTilesTurn): number {
  return storyBlankSizes(turn).length;
}

/**
 * 따라 쓰기 한 음절의 통과입니다 — 덮음 · 머무름 둘 다 문턱 이상. 획이 없으면 실패이고, 모듈이 없거나 호스트가
 * 실패하면 학습자를 막지 않으려 통과로 봅니다.
 */
export function storyTracePassed(
  outcome: HandwritingTraceOutcome | { readonly status: "unavailable" },
): boolean {
  if (outcome.status === "compared") {
    return (
      outcome.coverage >= STORY_FINAL_TRACE_THRESHOLD && outcome.stay >= STORY_FINAL_TRACE_THRESHOLD
    );
  }
  return outcome.status !== "empty-strokes";
}

/** 지금 나야 할 소리 — 정답 판정 직후에만 내 줄, 그 밖에는 상대 줄입니다. 없으면 `null`. */
export function storyFinalAudioCueOf(
  turn: StoryFinalTurn,
  state: StoryFinalState,
): AudioCue | null {
  const { turnIndex } = state;
  if (
    state.phase === "checked" &&
    state.results[turnIndex] === "correct" &&
    turn.replyAudioSource !== undefined
  ) {
    return { key: `${turnIndex}:reply`, source: turn.replyAudioSource };
  }
  return turn.counterpartAudioSource === undefined
    ? null
    : { key: `${turnIndex}:counterpart`, source: turn.counterpartAudioSource };
}

export function storyFinalLineAccessibilityLabel(turn: StoryFinalTurn): string {
  return `${turn.speakerName}: ${turn.line.ko}${turn.line.en === null ? "" : ` ${turn.line.en}`}`;
}
