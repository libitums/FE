import { learningPassCriterionForStep } from "./learning-assessment";
// 한 스텝의 학습 세션 콜백 넷을 만듭니다 — 시작 · 중도 이탈 · 활동 끝 · 평가 나가기.
// `special-unit-wiring.ts`와 같은 갈래이고, 그쪽이 특별 유닛의 「연 순간 · 끝낸 순간」을
// 지듯 이쪽은 **활동 여럿을 잇는 한 세션**을 집니다.
//
// **세션이 드는 것이 둘입니다** — 지나온 활동의 정오(`pendingResults`)와 사용자가 건너뛴
// 문항 수(`pendingSkippedCount`). 둘은 같은 순간에 함께 만들어지고 함께 버려집니다.
// 한쪽만 리셋하는 자리가 생기면 지난 세션의 값이 다음으로 조용히 샙니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import { assessmentCompletesStep, judgeAssessment } from "../screens/assessment/assessment";
import type { AnswerResult } from "../lib/answer-result";
import {
  completeStep,
  learningFormAt,
  learningFormsForStep,
  type JourneyStepId,
} from "../screens/journey-map/journey-map";
import type { NavAction } from "./nav-state";
import { learningScreenFor } from "./screen-routing";

export type LearningSessionWiringArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly setCompletedStepCount: Dispatch<SetStateAction<number>>;
  readonly pendingResults: readonly AnswerResult[];
  readonly setPendingResults: Dispatch<SetStateAction<readonly AnswerResult[]>>;
  readonly pendingSkippedCount: number;
  readonly setPendingSkippedCount: Dispatch<SetStateAction<number>>;
};

export function learningSessionWiring(args: LearningSessionWiringArgs) {
  const {
    dispatch,
    setCompletedStepCount,
    pendingResults,
    setPendingResults,
    pendingSkippedCount,
    setPendingSkippedCount,
  } = args;

  // 세션이 드는 둘을 한 자리에서 비웁니다 — 부르는 곳 셋이 짝을 빠뜨릴 수 없습니다.
  const clearSession = () => {
    setPendingResults([]);
    setPendingSkippedCount(0);
  };

  return {
    // 시트의 `시작`이 여기로 옵니다. 목적지는 `learningFormsForStep`의 **첫 활동**이고
    // `learningScreenFor`가 화면으로 옮깁니다 — 학습형 이름을 리터럴로 쓰지 않습니다.
    // 목록이 비지 않는 것은 타입이 지므로 첫 항목 접근에 방어 분기가 없습니다.
    onStartStep: (id: JourneyStepId) => {
      clearSession();
      dispatch({ type: "push", screen: learningScreenFor(learningFormsForStep(id)[0], id, 0) });
    },
    // 중도 이탈입니다. **진행을 갱신하지 않습니다.** `onFinishLearning`과 합치지
    // 않는 이유가 이 한 줄의 차이입니다. 쌓아 둔 결과는 버립니다 — 다음에 이 스텝을
    // 다시 열면 첫 활동부터이므로 남겨 두면 지난 세션의 정오가 섞입니다.
    onExitLearning: () => {
      clearSession();
      dispatch({ type: "backToRoot" });
    },
    onFinishLearning: (
      id: JourneyStepId,
      activityIndex: number,
      results: readonly AnswerResult[],
      // 이 **활동 하나**에서 사용자가 건너뛴 문항 수입니다(D8). `results`와 **같은
      // 자리에 같은 모양으로** 쌓습니다 — 활동은 유닛마다 자유롭게 섞이고 별도 규칙이
      // 없으므로, 건너뛰기가 있는 활동이 스텝의 어느 자리에 오든 수가 새면 안 됩니다.
      // 마지막 활동이 낸 값만 쓰면 그 활동을 가운데로 옮기는 순간 건너뛴 수가 조용히
      // 0이 되고, 타입도 테스트도 그것을 안 잡습니다.
      activitySkippedCount: number,
    ) => {
      const gathered = [...pendingResults, ...results];
      const skippedCount = pendingSkippedCount + activitySkippedCount;
      const next = learningFormAt(id, activityIndex + 1);
      // 활동이 남았으면 평가로 가지 않습니다 — 다음 활동으로 갈아탑니다. 판정은 스텝
      // 전체를 놓고 한 번만 내립니다.
      if (next !== undefined) {
        setPendingResults(gathered);
        setPendingSkippedCount(skippedCount);
        dispatch({ type: "replace", screen: learningScreenFor(next, id, activityIndex + 1) });
        return;
      }
      clearSession();
      // 판정은 평가가 집니다 — `judgeAssessment` → `assessmentCompletesStep`. 셸에
      // `verdict === "passed"` 리터럴을 쓰지 않습니다.
      const verdict = judgeAssessment(gathered, learningPassCriterionForStep(id));
      if (assessmentCompletesStep(verdict)) {
        setCompletedStepCount((count) => completeStep(count, id));
      }
      // `replace`이지 `push`가 아닙니다 — 끝난 학습 세션은 스택에 남길 자리가
      // 아닙니다. 출구는 진입 동작이 무엇이든 활성 스택의 루트로 곧장 갑니다
      // (ADR-0007 D6).
      dispatch({
        type: "replace",
        screen: { name: "assessment", stepId: id, results: gathered, skippedCount },
      });
    },
    // 평가의 `맵으로`입니다. 중도 이탈과 마찬가지로 진행을 갱신하지 않습니다 —
    // 판정은 이미 `onFinishLearning`에서 끝났습니다.
    onExitAssessment: () => dispatch({ type: "backToRoot" }),
  };
}
