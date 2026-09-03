import { useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { JourneyStepNode } from "./JourneyStepNode";
import { StepSheet } from "./StepSheet";
import {
  completedStepCount,
  findStep,
  initialStepSheetState,
  journeySteps,
  stepSheetReducer,
  stepStatusAt,
} from "./journey-map";

import "./journey-map-screen.css";

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 시트 열림 상태는 이 화면이 소유한다 — `useReducer`로 순수 함수 `stepSheetReducer`를
// 소비한다(계약 §1.5 「useState가 아니라 useReducer인 이유」). `Nav`는 관여하지 않는다.
export function JourneyMapScreen(): ReactNode {
  const [sheetState, dispatch] = useReducer(stepSheetReducer, initialStepSheetState);

  const openStep =
    sheetState.openStepId === null ? undefined : findStep(journeySteps, sheetState.openStepId);

  return (
    <view className="journey-map-screen">
      <text
        data-testid="journey-map-screen-title"
        className="journey-map-screen-title"
        accessibility-traits="header"
      >
        여정 맵
      </text>
      <view
        className="journey-map-screen-map"
        data-testid="journey-map-screen-map"
        accessibility-elements-hidden={openStep !== undefined}
      >
        {journeySteps.map((step, index) => (
          <JourneyStepNode
            key={step.id}
            id={step.id}
            title={step.title}
            status={stepStatusAt(index, completedStepCount)}
            onSelect={(id) => dispatch({ type: "openStep", stepId: id })}
          />
        ))}
      </view>
      {openStep === undefined ? null : (
        <StepSheet
          title={openStep.title}
          description={openStep.description}
          onClose={() => dispatch({ type: "closeSheet" })}
        />
      )}
    </view>
  );
}
