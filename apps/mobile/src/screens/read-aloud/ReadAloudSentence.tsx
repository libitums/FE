import type { ReactNode } from "@lynx-js/react";

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { ReadAloudQuestion } from "./read-aloud.contract";

export type ReadAloudSentenceProps = {
  readonly question: ReadAloudQuestion;
  /** 앞에서부터 맞은 낱말 수입니다. */
  readonly matchedCount: number;
  readonly copy: UiCopy;
};

// 따라 읽을 문장 묶음(한국어 문장 → 로마자 → 영어)입니다. 스캐폴드: 앵커만 서고 조각 · 칠 · 줄은
// 구현 단계에서 채웁니다.
export function ReadAloudSentence({ matchedCount }: ReadAloudSentenceProps): ReactNode {
  return <view data-testid="read-aloud-sentence" data-matched={matchedCount} />;
}
