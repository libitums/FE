// 프로필 시트 목소리 견본의 판정입니다(ADR-0198 D2) — 단추 상태(듣기 · 일시정지 · 이어 듣기 · 못 읽음)와 첫 말 칸에 설 줄. 순수.

import type { AudioPlayOutcome } from "../../lib/audio";
import { bubbleLinesOf } from "../../lib/romanization-display";
import type { BubbleLines } from "../../lib/romanization-display";
import type { ChoiceRomanization } from "../../lib/session-options";
import type { FriendProfile } from "./friend-catalog.contract";
import { localizedLine } from "./suggested-friends";

/** 단추의 자리 — 처음(Hear voice) · 재생 중(Pause) · 멈춰 둠(Resume). */
export type VoicePhase = "idle" | "playing" | "paused";

export type VoiceSampleState = {
  readonly phase: VoicePhase;
  /** 마지막으로 틀려다 못 읽었는가 — 단추 아래 조용한 한 줄. 다시 누르면 지웁니다. */
  readonly unavailable: boolean;
  /** 마지막으로 누름이 받아들여진 시각(epoch ms) — 연타 막기. 처음엔 null. */
  readonly tappedAt: number | null;
};

/** 받아들인 누름 뒤 이만큼은 다음 누름을 버립니다 — 한 번 누름이 두 번 와 바로 일시정지로 바뀌지 않게(ADR-0198 시제품). */
export const VOICE_TAP_GUARD_MS = 400;

export const initialVoiceSample: VoiceSampleState = {
  phase: "idle",
  unavailable: false,
  tappedAt: null,
};

/** 누름이 부를 재생 모듈 동작 — `ignore`는 연타라 아무것도 하지 않음. */
export type VoiceTapAction = "play" | "pause" | "resume" | "ignore";

const NEXT: Readonly<Record<VoicePhase, readonly [VoicePhase, VoiceTapAction]>> = {
  idle: ["playing", "play"],
  playing: ["paused", "pause"],
  paused: ["playing", "resume"],
};

export function voiceSampleTap(
  state: VoiceSampleState,
  now: number,
): { readonly next: VoiceSampleState; readonly action: VoiceTapAction } {
  if (state.tappedAt !== null && now - state.tappedAt < VOICE_TAP_GUARD_MS) {
    return { next: state, action: "ignore" };
  }
  const [phase, action] = NEXT[state.phase];
  return { next: { phase, unavailable: false, tappedAt: now }, action };
}

/** `play`를 부른 결과 — 못 틀었으면 처음 자리 + 못 읽음 줄. */
export function voiceSampleStarted(
  state: VoiceSampleState,
  outcome: AudioPlayOutcome,
): VoiceSampleState {
  return outcome === "started" ? state : { ...state, phase: "idle", unavailable: true };
}

/** 끝까지 들었음 — 처음 자리로. */
export function voiceSampleFinished(state: VoiceSampleState): VoiceSampleState {
  return { ...state, phase: "idle", unavailable: false };
}

/** 시트가 닫힐 때 재생 모듈을 멈춰야 하는가(재생 중 · 멈춰 둠). */
export function voiceSampleNeedsStop(state: VoiceSampleState): boolean {
  return state.phase !== "idle";
}

/** 첫 말 칸 — 한글 한 줄과 그 아래 줄(로마자 · 구분선 · 뜻, 또는 뜻 한 줄). 대본도 첫 말도 없으면 null. */
export type SheetLine = { readonly ko: string; readonly lines: BubbleLines };

/**
 * 견본 대본이 있으면 대본(로마자는 스위치를 따르고 원천은 정본 `roman`, ADR-0198 D2 · ADR-0188), 없으면 지금처럼 첫 말 + 뜻 한 줄.
 * 첫 말에는 손으로 적은 로마자가 없어 스위치와 무관하게 뜻 한 줄입니다(변환 함수를 쓰지 않음).
 */
export function sheetLineOf(
  character: FriendProfile,
  language: string,
  romanization: ChoiceRomanization,
  pronunciation: (romanization: string) => string,
): SheetLine | null {
  const script = character.voiceSampleScript ?? null;
  if (script !== null) {
    const meaning = localizedLine(script, language);
    const line = { ko: script.ko, roman: script.roman, meaning };
    return { ko: script.ko, lines: bubbleLinesOf(line, romanization, pronunciation) };
  }
  const opening = character.sheetOpening;
  if (opening === null) return null;
  return { ko: opening.ko, lines: { translation: localizedLine(opening, language) } };
}
