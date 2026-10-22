// 문항 보기(OptionSelector)로 가는 순수 변환입니다.

import type { OptionSelectorOption, OptionSelectorProps } from "@libitums/ui-lynx/option-selector";

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

const OPTION_ID_PREFIX = "choice-";

/** 보기 번호에서 OptionSelector 옵션 id를 짓습니다. */
export function questionOptionId(index: number): string {
  return `${OPTION_ID_PREFIX}${index}`;
}

/** 옵션 id에서 보기 번호를 되돌립니다. 모르는 id면 `null`입니다. */
export function questionOptionIndexOf(id: string): number | null {
  if (!id.startsWith(OPTION_ID_PREFIX)) return null;
  const digits = id.slice(OPTION_ID_PREFIX.length);
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

function optionOf(input: QuestionOptionsInput, index: number): OptionSelectorOption | null {
  const option = input.options[index];
  if (option === undefined) return null;
  return {
    id: questionOptionId(index),
    label: option.text,
    accessibilityLabel: input.accessibilityLabels[index] ?? option.text,
    ...(option.meaning === undefined ? {} : { meaning: option.meaning }),
  };
}

/**
 * 화면 상태를 OptionSelector props로 바꿉니다. 판정 뒤에는 확정(committed)으로 두고 고른 보기에만 판정을 싣습니다.
 * 접힘이면 고른 보기 하나만 남깁니다. 기다림은 열림과 같은 props입니다(흐림 · 탭 흡수는 컴포넌트 몫).
 */
export function questionOptionSelectorPropsOf(
  input: QuestionOptionsInput,
): Omit<OptionSelectorProps, "onChange" | "onCommit"> {
  const { state } = input;
  const judged = state.kind === "judged" ? state : null;
  const indexes =
    judged !== null && judged.rest === "collapsed"
      ? [judged.index]
      : input.options.map((_, index) => index);
  const options = indexes.flatMap((index): OptionSelectorOption[] => {
    const option = optionOf(input, index);
    if (option === null) return [];
    return [
      judged !== null && judged.index === index ? { ...option, feedback: judged.result } : option,
    ];
  });
  return {
    groupLabel: input.groupLabel,
    options,
    selectedIds: judged === null ? [] : [questionOptionId(judged.index)],
    ...(judged === null ? {} : { committed: true }),
    variant: "outlined-subtle",
    size: input.density === "compact" ? "s" : "m",
    selection: "single",
    commit: "immediate",
    layout: input.layout,
    contentLanguage: "learning",
    languageTag: "ko",
  };
}
