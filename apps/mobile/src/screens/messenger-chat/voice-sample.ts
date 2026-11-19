// 목소리 견본 단추의 상태 기계입니다(ADR-0162 2026-11-19 추가). 순수 — 재생은 훅이 `lib/audio.ts`(말풍선 음성과 같은 호스트
// 모듈, ADR-0017 D3 · ADR-0146)로 하고, 여기는 상태와 「무엇을 부를지」만 정합니다. 저절로 틀지 않습니다(누를 때만).
//
// idle ─tap→ loading ─started→ playing ─tap→ paused ─tap→ playing
//                    └unavailable→ error          └finished→ ended ─tap→ loading
// close(시트 닫힘) · interrupted(다른 소리가 대신함)는 어디서든 idle — 재생 중이었으면 멈춥니다.

export type VoiceSampleState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export type VoiceSampleEvent =
  | "tap"
  | "started"
  | "unavailable"
  | "finished"
  | "close"
  | "interrupted";

/** 훅이 부를 재생 함수 — play(처음부터) · pause · resume · stop. null은 부를 것 없음. */
export type VoiceSampleEffect = "play" | "pause" | "resume" | "stop" | null;

export type VoiceSampleStep = {
  readonly state: VoiceSampleState;
  readonly effect: VoiceSampleEffect;
};

const stay = (state: VoiceSampleState): VoiceSampleStep => ({ state, effect: null });

/** 소리가 나고 있거나 멈춰 둔 상태 — 닫힐 때 호스트를 멈춰야 합니다. */
export function holdsAudio(state: VoiceSampleState): boolean {
  return state === "playing" || state === "paused" || state === "loading";
}

function onTap(state: VoiceSampleState): VoiceSampleStep {
  switch (state) {
    case "idle":
    case "ended":
    case "error":
      // 못 읽었던 견본도 다시 누르면 한 번 더 시도합니다(오프라인에서 돌아온 경우).
      return { state: "loading", effect: "play" };
    case "playing":
      return { state: "paused", effect: "pause" };
    case "paused":
      return { state: "playing", effect: "resume" };
    case "loading":
      return stay(state);
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

export function voiceSampleStep(state: VoiceSampleState, event: VoiceSampleEvent): VoiceSampleStep {
  switch (event) {
    case "tap":
      return onTap(state);
    case "started":
      return state === "loading" ? stay("playing") : stay(state);
    case "unavailable":
      return state === "loading" ? stay("error") : stay(state);
    case "finished":
      return state === "playing" ? stay("ended") : stay(state);
    case "close":
      return { state: "idle", effect: holdsAudio(state) ? "stop" : null };
    case "interrupted":
      // 다른 소리가 호스트를 가져갔습니다 — 그 소리를 멈추지 않습니다(새 재생이 이전 것을 대체, ADR-0017 D3).
      return stay(holdsAudio(state) ? "idle" : state);
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}

/** 이 걸음이 새 재생의 시작인가 — 분석 `friend_voice_sample_played`(이어 듣기 · 다시 시도 실패는 아님). */
export function startedPlayback(before: VoiceSampleState, after: VoiceSampleState): boolean {
  return before === "loading" && after === "playing";
}
