import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { lessonCounter } from "../learning/activity-finish";
import { LearningShell } from "../learning/LearningShell";
import type { SyllableBuildActivityProps } from "./syllable-build.contract";

// 음절 조립 활동의 껍데기입니다 — 셸만 서고 카드 안은 비어 있습니다.
export function SyllableBuildActivity({
  questions,
  gemCount,
  onExit,
  lesson,
}: SyllableBuildActivityProps): ReactNode {
  const copy = useUiCopy();
  const counter = lessonCounter(lesson, 0, questions.length);
  return (
    <LearningShell
      form="syllable-build"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      instruction={questions[0]?.instruction ?? copy.syllableBuild.instruction}
      onExit={onExit}
      card={<view data-testid="syllable-build-content" />}
    />
  );
}
