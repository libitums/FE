import type { ReactNode } from "@lynx-js/react";

import type { ListeningAnswerResult } from "../listening/listening";

import "./assessment-screen.css";

// LIB-227 (ui-scaffold): import·렌더만 가능하게 하는 무동작 껍데기다. 계약
// (.agent-harness/work/lib-227/spec.md §1.2 · §1.7)이 고정한 경로 · export ·
// props 시그니처를 글자 그대로 세운다. 화면 골격(§1.9의 슬롯 셋 · scroll-view ·
// data-testid · data-verdict) · announce 호출 · 나가는 수단 결선은 다음 계층
// (`ui`)의 몫이다 — 여기서 미리 채우면 `ui` 계층의 red가 red가 아니게 된다.
export type AssessmentScreenProps = {
  stepOrdinal: number;
  results: readonly ListeningAnswerResult[];
  onExit: () => void;
};

export function AssessmentScreen(_props: AssessmentScreenProps): ReactNode {
  return <view className="assessment-screen" />;
}
