// 말하기 퀴즈 판정 뒤 조작 · 공용 마이크 국면입니다(순수, 시안 S1 ~ S4).

import type { SpeechMicState } from "../../components/speech-mic/speech-mic";
import type { PictureLoadState } from "../../lib/picture-load";
import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import type { SpeechAttemptPhase, SpeechControls } from "../../lib/speech-attempt";

/**
 * 판정 뒤 조작입니다 — 자동으로 넘어가지 않습니다(시안 S2 ~ S4). 맞으면 Continue 하나, 처음 오답이면 Try again + Next,
 * 두 번째 오답이면 Continue 하나. 주 버튼 `next`의 이름은 Continue, 보조 `next`는 Next입니다.
 */
export function speakWordJudgedControls(
  judgement: SpokenAnswerJudgement,
  attempt: number,
): SpeechControls {
  if (judgement.result === "incorrect" && attempt === 0) {
    return { primary: "retry", secondary: "next" };
  }
  return { primary: "next", secondary: null };
}

/** 공용 마이크의 국면 — 그림 로딩 · 쓸 수 없음은 꺼짐, 듣는 중에 멈춤을 눌렀으면 확인 중입니다. */
export function speakWordMicStateOf(
  phase: SpeechAttemptPhase,
  pictureState: PictureLoadState,
  stopping: boolean,
): SpeechMicState {
  if (pictureState === "loading") return "disabled";
  switch (phase.kind) {
    case "listening":
      return stopping ? "checking" : "listening";
    case "unavailable":
      return phase.reason === "dictation-off" ? "idle" : "disabled";
    default:
      return "idle";
  }
}
