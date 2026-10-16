// 말하기 한 번의 결선입니다 — 권한 확인(미요청만 묻기) → 인식 시작 → 결말.
//
// 화면이 떠 있는 동안에만 결말을 올립니다. 권한 조회 · 인식은 호스트를 거쳐 늦게 돌아오므로, 떠난 뒤에
// 돌아온 콜백이 인식을 새로 시작하거나(마이크가 켜진 채 남습니다) 상태를 바꾸지 않게 막습니다.

import { useEffect, useRef } from "@lynx-js/react";

import {
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../lib/speech-recognition";
import type { SpeechResult } from "../lib/speech-recognition";
import { canListen } from "../lib/speaking-judge";
import { speechAttemptOutcomeOf, speechBlocked } from "../lib/speech-attempt";
import type { SpeechAttemptOutcome } from "../lib/speech-attempt";

export type SpeechAttemptControl = {
  /** 권한 확인(미요청만 묻기) → 들을 수 있으면 인식 시작. 결말은 `onOutcome`으로 정확히 한 번. */
  readonly start: () => void;
  /** 녹음을 멈춥니다(결말은 `start`의 콜백이 싣습니다). */
  readonly stop: () => void;
};

export function useSpeechAttempt(
  onOutcome: (outcome: SpeechAttemptOutcome) => void,
): SpeechAttemptControl {
  const mounted = useRef(true);
  // 렌더마다 최신 함수를 둡니다 — 늦게 온 콜백이 앞 렌더의 함수를 부르지 않습니다.
  const latest = useRef(onOutcome);
  latest.current = onOutcome;
  // 시도 번호입니다. 새로 시작한 뒤에는 앞 시도의 늦은 콜백을 버립니다.
  const attempt = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopSpeechRecognition();
    };
  }, []);

  const start = (): void => {
    attempt.current += 1;
    const mine = attempt.current;
    const emit = (outcome: SpeechAttemptOutcome): void => {
      if (!mounted.current || attempt.current !== mine) {
        return;
      }
      latest.current(outcome);
    };
    const requested = requestSpeechPermissions((status) => {
      if (!mounted.current || attempt.current !== mine) {
        return;
      }
      if (!canListen(status)) {
        emit(speechBlocked);
        return;
      }
      const started = startSpeechRecognition({}, (result: SpeechResult) =>
        emit(speechAttemptOutcomeOf(result)),
      );
      if (started === "unavailable") {
        emit(speechBlocked);
      }
    });
    if (requested === "unavailable") {
      emit(speechBlocked);
    }
  };

  const stop = (): void => {
    stopSpeechRecognition();
  };

  return { start, stop };
}
