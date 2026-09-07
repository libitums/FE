import type { ReactNode } from "@lynx-js/react";

import type { JourneyStepId } from "../journey-map/journey-map";

import "./culture-quiz-screen.css";

// LIB-244 (ui-scaffold): 계약(.agent-harness/work/lib-244/spec.md §4.2 props ·
// §4.3 골격 · §4.4 `data-testid`)의 props 타입만 고정한다. import·최소 렌더만
// 가능하고, 3분할 골격 · `data-testid` 아홉 형태 · 세션 상태(`culture-quiz.ts`의
// 리듀서·조회 함수) · 접근성 속성은 다음 단계(ui-implementation)의 몫이다 — 여기서
// 채우면 그 단계의 red가 서지 않는다.

export type CultureQuizScreenProps = {
  stepId: JourneyStepId;
  stepOrdinal: number;
  onExit: () => void;
};

export function CultureQuizScreen(_props: CultureQuizScreenProps): ReactNode {
  return <view className="culture-quiz-screen" />;
}
