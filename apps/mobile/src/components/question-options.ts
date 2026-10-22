// 문항 보기(OptionSelector)로 가는 순수 변환입니다. 껍데기만 있는 단계입니다.

import type { OptionSelectorProps } from "@libitums/ui-lynx/option-selector";

import type { AnswerResult } from "../lib/answer-result";
import type { LearningDensity } from "../lib/learning-density";

export type QuestionOption = { readonly text: string; readonly meaning?: string };

export type QuestionOptionsState =
  | { readonly kind: "open" }
  | { readonly kind: "waiting" }
  | {
      readonly kind: "judged";
      readonly index: number;
      readonly result: AnswerResult;
      readonly rest: "disabled" | "collapsed";
    };

export type QuestionOptionsLayout = "stack" | "grid";

export type QuestionOptionsInput = {
  readonly groupLabel: string;
  readonly options: readonly QuestionOption[];
  readonly accessibilityLabels: readonly string[];
  readonly layout: QuestionOptionsLayout;
  readonly density: LearningDensity;
  readonly state: QuestionOptionsState;
};

/** 보기 번호에서 OptionSelector 옵션 id를 짓습니다. */
export function questionOptionId(_index: number): string {
  return "";
}

/** 옵션 id에서 보기 번호를 되돌립니다. 모르는 id면 `null`입니다. */
export function questionOptionIndexOf(_id: string): number | null {
  return null;
}

export function questionOptionSelectorPropsOf(
  input: QuestionOptionsInput,
): Omit<OptionSelectorProps, "onChange" | "onCommit"> {
  return {
    groupLabel: input.groupLabel,
    options: [],
    selectedIds: [],
  };
}
