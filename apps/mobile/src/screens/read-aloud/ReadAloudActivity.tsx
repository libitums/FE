import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { lessonCounter } from "../learning/activity-finish";
import { LearningShell } from "../learning/LearningShell";
import { readAloudInstructionOf } from "./read-aloud";
import type { ReadAloudActivityProps } from "./read-aloud.contract";

// 글을 보고 소리 내어 읽는 활동입니다(카탈로그 SHADOW). 채점하지 않습니다. 스캐폴드: 셸과 앵커만
// 서고, 국면 · 조작 · 마이크 · 문장은 구현 단계에서 채웁니다.
export function ReadAloudActivity({
  questions,
  gemCount,
  onExit,
  lesson,
}: ReadAloudActivityProps): ReactNode {
  const copy = useUiCopy();
  const counter = lessonCounter(lesson, 0, questions.length);

  return (
    <LearningShell
      form="read-aloud"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      instruction={readAloudInstructionOf({ kind: "ready" }, copy)}
      onExit={onExit}
      scrollCard
      card={<view data-testid="read-aloud-content" data-questionIndex={0} data-phase="ready" />}
    />
  );
}
