// 말하기 한 번의 결선입니다 — 권한 확인(미요청만 묻기) → 인식 시작 → 결말.
//
// 스캐폴드: `start` · `stop`이 아무것도 하지 않는 자리표시자입니다.

import type { SpeechAttemptOutcome } from "../lib/speech-attempt";

export type SpeechAttemptControl = {
  /** 권한 확인(미요청만 묻기) → 들을 수 있으면 인식 시작. 결말은 `onOutcome`으로 정확히 한 번. */
  readonly start: () => void;
  /** 녹음을 멈춥니다(결말은 `start`의 콜백이 싣습니다). */
  readonly stop: () => void;
};

const noop = (): void => undefined;

export function useSpeechAttempt(
  _onOutcome: (outcome: SpeechAttemptOutcome) => void,
): SpeechAttemptControl {
  return { start: noop, stop: noop };
}
