import type { ReactNode } from "@lynx-js/react";

import { writingBlank, writingPromptLabel, type WritingQuestion } from "../lib/writing-session";

import "./writing-prompt.css";

// 빈칸 문장입니다(Figma 79-6378의 `찾아 _ _ _.`). 빈칸 앞은 회색, 빈칸과 그 뒤는 주색입니다 —
// 학습자의 눈이 「어디를 채우나」로 가게 합니다. 쓰기 학습형과 최종 테스트가 함께 씁니다(ADR-0008).

export type WritingPromptProps = {
  readonly question: WritingQuestion;
};

export function WritingPrompt({ question }: WritingPromptProps): ReactNode {
  const before = question.before.trimEnd();
  return (
    <text
      className="writing-prompt"
      data-testid="writing-prompt"
      // 밑줄을 그대로 읽으면 「밑줄 밑줄 밑줄」이 되므로 「빈칸」으로 읽힙니다.
      accessibility-label={writingPromptLabel(question)}
    >
      {/* Lynx에서 안쪽 `<text>`는 바깥 글꼴을 물려받지 않아(기기 확인) 조각마다 글꼴을 줍니다. */}
      {before === "" ? null : <text className="writing-prompt-before">{`${before} `}</text>}
      <text className="writing-prompt-blank">{`${writingBlank(question)}${question.after}`}</text>
    </text>
  );
}
