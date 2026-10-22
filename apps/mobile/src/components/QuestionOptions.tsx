import type { ReactNode } from "@lynx-js/react";

import { OptionSelector } from "@libitums/ui-lynx/option-selector";

import {
  questionOptionIndexOf,
  questionOptionSelectorPropsOf,
  type QuestionOptionsInput,
} from "./question-options";

import "./question-options.css";

export type {
  QuestionOption,
  QuestionOptionsInput,
  QuestionOptionsLayout,
  QuestionOptionsState,
} from "./question-options";

export type QuestionOptionsProps = QuestionOptionsInput & {
  readonly testId: string;
  readonly onSelect: (index: number) => void;
};

// 선택 상태는 판정이 대신하므로 OptionSelector의 선택 변경은 받아 두기만 합니다.
function ignoreChange(): void {}

/**
 * 문항 보기 부품입니다 — ui-lynx `OptionSelector`(outlined-subtle)를 문항 상태 갈래(열림 · 기다림 · 판정)대로 세웁니다.
 * 고르면 바로 확정되고, 판정 뒤에는 고를 수 없습니다. 기다림(그림을 받는 중)은 흐리게 두되 탭만 삼킵니다.
 */
export function QuestionOptions({ testId, onSelect, ...input }: QuestionOptionsProps): ReactNode {
  const open = input.state.kind === "open";

  function handleCommit(id: string): void {
    "background only";
    if (!open) return;
    const index = questionOptionIndexOf(id);
    if (index !== null) onSelect(index);
  }

  const selector = (
    <OptionSelector
      {...questionOptionSelectorPropsOf(input)}
      onChange={ignoreChange}
      onCommit={handleCommit}
    />
  );

  return (
    <view data-testid={testId}>
      {input.state.kind === "waiting" ? (
        <view className="question-options-waiting" data-testid="question-options-waiting">
          {selector}
        </view>
      ) : (
        selector
      )}
    </view>
  );
}
