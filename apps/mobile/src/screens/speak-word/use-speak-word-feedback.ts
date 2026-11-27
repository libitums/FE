// 판정 · 불가 안내가 서는 순간 한 번 — 알림(live region 몫) · 판정음 · 측정 보고입니다. 듣는 중에는 알리지 않습니다
// (화면 낭독이 인식기에 그대로 들어갑니다). 측정은 문항의 **처음** 판정만 보고합니다(다시 말하기 뒤는 보고하지 않음).

import { useEffect } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import type { ItemAnswerOutcome } from "../../lib/item-answer";
import type { SpokenGrade } from "../../lib/speaking-judge";
import { playSound } from "../../lib/sound-effects";
import type { UiCopy } from "../../lib/ui-copy.contract";
import { speakWordResultAnnouncement } from "./speak-word";
import type { SpeakWordQuestion, SpeakWordSessionState } from "./speak-word.contract";

export type SpeakWordFeedback = {
  readonly question: SpeakWordQuestion | null | undefined;
  readonly state: SpeakWordSessionState;
  readonly copy: UiCopy;
  /** 안내 줄(불가 · 못 알아들음) — 받아쓰기 꺼짐이면 지시문을 대신 알립니다. */
  readonly hint: string | null;
  readonly report: (outcome: ItemAnswerOutcome, grade?: SpokenGrade) => void;
};

export function useSpeakWordFeedback({
  question,
  state,
  copy,
  hint,
  report,
}: SpeakWordFeedback): void {
  const { phase, judgement } = state;
  useEffect(() => {
    if (phase.kind === "heard" && judgement !== null && question != null) {
      if (state.attempt === 0) report(judgement.result, judgement.grade);
      playSound(judgement.result === "correct" ? "correct_answer" : "wrong_answer");
      announce(speakWordResultAnnouncement(question, judgement, phase.text, copy));
    } else if (phase.kind === "unavailable" || phase.kind === "missed") {
      const dictationOff = phase.kind === "unavailable" && phase.reason === "dictation-off";
      const content = dictationOff ? copy.speaking.dictationDisabled : hint;
      if (content !== null) announce(content);
    }
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — 안내는 그 둘에서 파생합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, phase]);
}
