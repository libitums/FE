import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";

import "./culture-quiz-option.css";

// LIB-244 (ui-scaffold): 계약(.agent-harness/work/lib-244/spec.md §4.2 props ·
// §4.5 골격)의 props 타입만 고정한다. import·최소 렌더만 가능하고, §4.5가 요구하는
// data-testid·accessibility-*·표식 채널·`bindtap` 결선은 다음 단계(ui-implementation)의
// 몫이다 — 여기서 채우면 그 단계의 red가 서지 않는다.

export type CultureQuizOptionProps = {
  index: number;
  text: string;
  result: AnswerResult | null;
  onSelect: (index: number) => void;
};

export function CultureQuizOption(_props: CultureQuizOptionProps): ReactNode {
  return <view className="culture-quiz-option" />;
}
