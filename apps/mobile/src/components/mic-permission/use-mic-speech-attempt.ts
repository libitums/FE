// 말하기 결선(`useSpeechAttempt`)과 마이크 권한 안내(`useMicPermission`)를 함께 겁니다(ADR-0206) — 결선이 권한 거부를 만나면
// 거부 시트가 섭니다. 낱말 말하기는 건너뜀 · 결과 올리기까지 함께 지는 자기 결선(`SpeakWordMic`)을 씁니다.

import type { SpeechAttemptOutcome } from "../../lib/speech-attempt";
import { useSpeechAttempt } from "../use-speech-attempt";
import type { SpeechAttemptControl } from "../use-speech-attempt";
import { useMicPermission } from "./use-mic-permission";
import type { MicPermission, MicPermissionOptions } from "./use-mic-permission";

export function useMicSpeechAttempt(
  options: MicPermissionOptions,
  onOutcome: (outcome: SpeechAttemptOutcome) => void,
): { readonly attempt: SpeechAttemptControl; readonly permission: MicPermission } {
  const permission = useMicPermission(options);
  const attempt = useSpeechAttempt(onOutcome, permission.onDenied);
  return { attempt, permission };
}
