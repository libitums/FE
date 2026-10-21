// 듣기 속도 어휘입니다(순수). 「천천히」를 켠 상태와 호스트에 넘기는 배율의 대응을 한 자리에서 정합니다.

import type { UiCopy } from "./ui-copy.contract";

export type ListenPace = "normal" | "slow";

export const NORMAL_PLAYBACK_RATE = 1;
export const SLOW_PLAYBACK_RATE = 0.85;
export type PlaybackRate = typeof NORMAL_PLAYBACK_RATE | typeof SLOW_PLAYBACK_RATE;

export const initialListenPace: ListenPace = "normal";

export function playbackRateOf(_pace: ListenPace): PlaybackRate {
  return NORMAL_PLAYBACK_RATE;
}

export function toggledListenPace(pace: ListenPace): ListenPace {
  return pace;
}

export function listenPaceAccessibilityLabel(_pace: ListenPace, _copy: UiCopy): string {
  return "";
}
