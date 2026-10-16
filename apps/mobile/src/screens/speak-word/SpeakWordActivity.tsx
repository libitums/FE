import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { lessonCounter } from "../learning/activity-finish";
import { LearningShell } from "../learning/LearningShell";
import type { SpeakWordActivityProps } from "./speak-word.contract";

// 그림을 보고 낱말을 말하는 활동입니다(카탈로그 SPEAK_WORD). 스캐폴드: 셸과 앵커만 서고, 그림 ·
// 국면 · 조작 · 마이크 · 판정은 구현 단계에서 채웁니다.
export function SpeakWordActivity({
  questions,
  gemCount,
  onExit,
  lesson,
}: SpeakWordActivityProps): ReactNode {
  const copy = useUiCopy();
  const counter = lessonCounter(lesson, 0, questions.length);

  return (
    <LearningShell
      form="speak-word"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      instruction={copy.speakWord.instruction}
      onExit={onExit}
      scrollCard
      card={<view data-testid="speak-word-content" data-questionIndex={0} data-phase="ready" />}
    />
  );
}
