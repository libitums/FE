// 듣기 속도 어휘입니다(순수). 「천천히」를 켠 상태와 호스트에 넘기는 배율의 대응을 한 자리에서 정합니다.

import type { UiCopy } from "./ui-copy.contract";

export type ListenPace = "normal" | "slow";

export const NORMAL_PLAYBACK_RATE = 1;
// 「천천히」는 같은 소리를 1.43배로 늘립니다. 0.85(1.18배)는 호스트가 그대로 적용했는데도 「느려지지 않는다」로
// 들렸습니다(사용자 피드백 2026-11-22, ADR-0082 ⟨2026-11-24⟩). 0.5 아래는 음높이 유지 늘이기의 음질이 무너집니다.
export const SLOW_PLAYBACK_RATE = 0.7;
/** 대화 음성 메시지(컴패니언 · 앨범)의 배율입니다. 「천천히」 토글이 아니라 늘 이 값으로 들려 줍니다(ADR-0146). */
export const CHAT_VOICE_PLAYBACK_RATE = 0.85;
export type PlaybackRate =
  | typeof NORMAL_PLAYBACK_RATE
  | typeof SLOW_PLAYBACK_RATE
  | typeof CHAT_VOICE_PLAYBACK_RATE;

export const initialListenPace: ListenPace = "normal";

export function playbackRateOf(pace: ListenPace): PlaybackRate {
  return pace === "slow" ? SLOW_PLAYBACK_RATE : NORMAL_PLAYBACK_RATE;
}

export function toggledListenPace(pace: ListenPace): ListenPace {
  return pace === "slow" ? "normal" : "slow";
}

/** 토글의 접근성 이름입니다 — 보이는 글자 뒤에 상태를 붙입니다(`Slow, on` / `Slow, off`). */
export function listenPaceAccessibilityLabel(pace: ListenPace, copy: UiCopy): string {
  const state = pace === "slow" ? copy.settings.optionState.on : copy.settings.optionState.off;
  return `${copy.listening.slow}, ${state}`;
}
