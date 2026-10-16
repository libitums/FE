import type { ReactNode } from "@lynx-js/react";

import { speakingChunks } from "../../lib/speaking-judge";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { ReadAloudQuestion } from "./read-aloud.contract";

import "./read-aloud-activity.css";

export type ReadAloudSentenceProps = {
  readonly question: ReadAloudQuestion;
  /** 앞에서부터 맞은 낱말 수입니다. */
  readonly matchedCount: number;
  readonly copy: UiCopy;
};

// 따라 읽을 문장 묶음(한국어 문장 + 로마자)과 영어 줄입니다. 문장은 공백으로만 자른 조각(부호가 붙은 채)으로
// 그리고, 앞에서부터 맞은 조각만 칠합니다 — 안 맞은 조각은 물러나지 않으니 색만으로 가르지 않습니다.
// 문장 요소의 낭독 이름은 문장 전체입니다(칠은 보이는 채널). 없는 로마자 · 영어 줄은 그리지 않습니다.
export function ReadAloudSentence({
  question,
  matchedCount,
  copy,
}: ReadAloudSentenceProps): ReactNode {
  const chunks = speakingChunks(question.sentence, matchedCount);

  return (
    <>
      <view className="read-aloud-activity-group">
        <text
          className="read-aloud-activity-sentence"
          data-testid="read-aloud-sentence"
          data-matched={String(matchedCount)}
          accessibility-label={question.sentence}
        >
          {chunks.map((chunk, index) => (
            <text
              key={index}
              className={
                chunk.matched
                  ? "read-aloud-activity-chunk read-aloud-activity-chunk-matched"
                  : "read-aloud-activity-chunk"
              }
              data-testid={`read-aloud-chunk-${index}`}
              data-matched={chunk.matched ? "true" : "false"}
            >
              {index === 0 ? chunk.text : ` ${chunk.text}`}
            </text>
          ))}
        </text>
        {question.romanization === null ? null : (
          <text
            className="read-aloud-activity-romanization"
            data-testid="read-aloud-romanization"
            accessibility-label={copy.readAloud.pronunciation(question.romanization)}
          >
            {question.romanization}
          </text>
        )}
      </view>
      {question.translation === null ? null : (
        <text className="read-aloud-activity-translation" data-testid="read-aloud-translation">
          {question.translation}
        </text>
      )}
    </>
  );
}
