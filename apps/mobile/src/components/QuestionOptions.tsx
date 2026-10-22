import type { ReactNode } from "@lynx-js/react";

import type { QuestionOptionsInput } from "./question-options";

export type QuestionOptionsProps = QuestionOptionsInput & {
  readonly testId: string;
  readonly onSelect: (index: number) => void;
};

// 문항 보기 부품입니다(OptionSelector 위의 얇은 껍데기). 껍데기만 있는 단계입니다 — 보기를 그리지 않습니다.
export function QuestionOptions({ testId }: QuestionOptionsProps): ReactNode {
  return <view data-testid={testId} />;
}
