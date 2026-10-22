// 말한 문장을 채점하는 순수 규칙입니다. UI를 import하지 않습니다.
//
// ⟨2026-09-28⟩ 말하기 화면(`screens/speaking`)의 것이었다가 여기로 올라왔습니다 — 에피소드
// 최종 테스트도 같은 규칙으로 채점합니다. 화면 폴더끼리는 값을 import하지 않으므로(ADR-0008:
// 화면 둘 이상이 쓰면 공용) 두 화면이 모두 여기를 봅니다.

import type { SpeechStatus } from "./speech-recognition";

// 채점 규칙(낱말 · 연속 맞힘 · 조각)은 `@libitums/episode-core/judge`가 정본입니다 — 랜딩 체험판도
// 같은 규칙으로 채점합니다. 권한 판정(`canListen`)만 앱의 말하기 상태에 기대어 여기 남습니다.
export {
  judgeSpeaking,
  matchedWordCount,
  speakingChunks,
  speakingWords,
  type SpeakingChunk,
} from "@libitums/episode-core/judge";

/** 마이크 · 음성 인식 권한이 둘 다 있고 인식기가 서 있어야 들을 수 있습니다. */
export function canListen(status: SpeechStatus): boolean {
  return (
    status.microphone === "granted" &&
    status.speechRecognition === "granted" &&
    status.recognizerAvailable
  );
}
