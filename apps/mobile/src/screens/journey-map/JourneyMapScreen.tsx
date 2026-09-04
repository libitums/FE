import { useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { JourneyStepNode } from "./JourneyStepNode";
import { StepSheet } from "./StepSheet";
import {
  findStep,
  initialStepSheetState,
  journeySteps,
  stepSheetReducer,
  stepStatusAt,
  type JourneyStepId,
} from "./journey-map";

import "./journey-map-screen.css";

// LIB-223: 계약(.agent-harness/work/lib-223/spec.md §1.6)이 고정한 props 타입이다.
// 셸 결선(W7)이 `App.tsx`의 호출부를 함께 고쳤으므로 이제 시그니처에 적용한다.
// 진행은 더 이상 모듈 상수에서 오지 않는다 — `App`이 소유하고 props로 내린다.
export type JourneyMapScreenProps = {
  completedStepCount: number;
  onStartStep: (id: JourneyStepId) => void;
};

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 시트 열림 상태는 이 화면이 소유한다 — `useReducer`로 순수 함수 `stepSheetReducer`를
// 소비한다(계약 §1.5 「useState가 아니라 useReducer인 이유」). `Nav`는 관여하지 않는다.
export function JourneyMapScreen({
  completedStepCount,
  onStartStep,
}: JourneyMapScreenProps): ReactNode {
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
      {/* [흐름] 내용 슬롯 — LIB-226 계약 §1.4. 스크롤 컨테이너 하나가 맵 컨테이너를
          감싼다. 가림 속성(`accessibility-elements-hidden`)은 맵 컨테이너에 그대로
          남는다 — 스크롤 컨테이너로 올리면 가리는 범위가 넓어진다(계약 §1.4).
          prop을 적지 않는다(계약 R5). accessibility-*를 붙이지 않는다(계약 R6). */}
      <scroll-view className="journey-map-screen-scroll" data-testid="journey-map-screen-scroll">
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
      </scroll-view>
      {/* [겹침 레이어] 스크롤 밖, 화면 루트의 직계 자식이다(계약 R9). */}
      {openStep === undefined ? null : (
        <StepSheet
          title={openStep.title}
          description={openStep.description}
          /* `시작`의 목적지는 이 화면이 정하지 않는다 — 열린 스텝의 id를 그대로
             위로 올린다(계약 §1.7 · §0.2). 화면 전환은 `App`의 것이다. */
          onStart={() => onStartStep(openStep.id)}
          onClose={() => dispatch({ type: "closeSheet" })}
        />
      )}
    </view>
  );
}
