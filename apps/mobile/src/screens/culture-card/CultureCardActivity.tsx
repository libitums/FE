import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { lessonCounter } from "../learning/activity-finish";
import { LearningShell } from "../learning/LearningShell";
import type { CultureCardActivityProps } from "./culture-card.contract";

// 문화 카드 활동의 껍데기입니다 — 셸만 서고 카드 안은 비어 있습니다.
export function CultureCardActivity({
  questions,
  gemCount,
  onExit,
  lesson,
}: CultureCardActivityProps): ReactNode {
  const copy = useUiCopy();
  const counter = lessonCounter(lesson, 0, questions.length);
  return (
    <LearningShell
      form="culture-card"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      instruction={copy.cultureCard.instruction}
      onExit={onExit}
      scrollCard
      card={<view data-testid="culture-card-content" data-cardIndex={0} />}
    />
  );
}
