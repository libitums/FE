import { useState } from "@lynx-js/react";
import type { AnswerResult } from "../lib/answer-result";
import { initialSessionOptions } from "../lib/session-options";
import { learningPassCriterionForStep } from "../app/learning-assessment";
import { judgeAssessment } from "../screens/assessment/assessment";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import {
  completeStep,
  learningFormsForStep,
  type JourneyStepId,
} from "../screens/journey-map/journey-map";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import { ListeningScreen } from "../screens/listening/ListeningScreen";
import { SentenceOrderScreen } from "../screens/sentence-order/SentenceOrderScreen";
import { SpeakingScreen } from "../screens/speaking/SpeakingScreen";
import { WritingScreen } from "../screens/writing/WritingScreen";

const noop = () => undefined;

// 제품 문항과 결과 화면을 사용합니다. 이 진행은 미리보기 안에서만 유지됩니다.
export function TutorialPracticeModesFixture({ onFinal }: { onFinal: () => void }) {
  const [stepId, setStepId] = useState<JourneyStepId | null>("tutorial-listening");
  const [completed, setCompleted] = useState(5);
  if (stepId !== null)
    return (
      <TutorialPracticeFixture
        key={stepId}
        stepId={stepId}
        onExit={() => setStepId(null)}
        onPass={() => {
          setCompleted((count) => completeStep(count, stepId));
        }}
      />
    );
  return (
    <JourneyMapScreen
      completedStepCount={completed}
      onStartStep={setStepId}
      completedEpisodeIntroIds={["tutorial-intro"]}
      onStartEpisodeIntroUnit={noop}
      completedMessengerUnitIds={["appointment-confirmation"]}
      onStartMessengerUnit={noop}
      completedPhoneCallUnitIds={["appointment-confirmation-phone-call"]}
      onStartPhoneCallUnit={noop}
      completedVisualNovelUnitIds={["cafe-arrival-visual-novel"]}
      onStartVisualNovelUnit={noop}
      completedEpisodeFinalIds={[]}
      onStartEpisodeFinal={onFinal}
    />
  );
}

export function TutorialPracticeFixture({
  stepId,
  onExit,
  onPass = noop,
}: {
  stepId: JourneyStepId;
  onExit: () => void;
  onPass?: () => void;
}) {
  const [result, setResult] = useState<{
    answers: readonly AnswerResult[];
    skipped: number;
  } | null>(null);
  const finish = (_id: JourneyStepId, answers: readonly AnswerResult[], skipped = 0) => {
    "background only";
    setResult({ answers, skipped });
    if (judgeAssessment(answers, learningPassCriterionForStep(stepId)) === "passed") onPass();
  };
  if (result !== null)
    return (
      <LessonCompleteScreen
        results={result.answers}
        skippedCount={result.skipped}
        verdict={judgeAssessment(result.answers, learningPassCriterionForStep(stepId))}
        streakDays={0}
        trophyCount={0}
        reward={lessonRewardPlaceholder}
        onExit={onExit}
        onRetry={() => setResult(null)}
      />
    );
  const props = { stepId, onExit, onFinish: finish };
  switch (learningFormsForStep(stepId)[0]) {
    case "listening":
      return <ListeningScreen {...props} sessionOptions={initialSessionOptions} />;
    case "speaking":
      return <SpeakingScreen {...props} />;
    case "writing":
      return <WritingScreen {...props} />;
    default:
      return <SentenceOrderScreen {...props} />;
  }
}
