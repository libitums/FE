// 듣기 학습 화면의 재생 상태 어휘를 소유합니다. 컴포넌트 안 삼항으로 두면
// `unit` 계층이 전이를 볼 수 없어 이 모듈로 뽑았습니다.

import type { AudioPlayOutcome } from "../../lib/audio";

// **CSS 클래스가 되지 않습니다.** ADR-0003 D7의 예약 상태어는 넷 그대로이고
// (selected · done · current · locked) 이 낱말은 하나도 더하지 않습니다 —
// 갈리는 것은 아이콘 모양 · current-color · 문구 셋입니다.
export type ListeningPlaybackState = "idle" | "playing";

// "started" → "playing" · "unavailable" → "idle".
// **모듈이 없으면 「재생 중」으로 보이지 않는다**가 이 축에서 가장 조용히
// 깨지는 판정이고, 이 함수가 그것을 자동 계층이 볼 수 있는 자리로
// 끌어냅니다.
export function playbackStateAfterPlay(outcome: AudioPlayOutcome): ListeningPlaybackState {
  // `switch`로 적습니다 — `AudioPlayOutcome`에 셋째 결과가 생기면 `tsc`가
  // 이 자리를 가리킵니다. `outcome === "started"` 삼항이면 새 결과가
  // 조용히 `idle`로 흡수됩니다.
  switch (outcome) {
    case "started":
      return "playing";
    case "unavailable":
      return "idle";
  }
}
