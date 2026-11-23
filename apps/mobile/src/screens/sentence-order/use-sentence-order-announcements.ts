import { useEffect } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import { announce, announceCompletion } from "../../lib/accessibility";
import type { UiCopy } from "../../lib/ui-copy.contract";
import {
  sentenceOrderAnnouncement,
  sentenceOrderCompletionAnnouncement,
  type SentenceOrderPhase,
} from "./sentence-order";

/**
 * 문장 만들기의 낭독입니다 — 채점 전이마다 판정을 한 번, 활동이 끝나면 완료를 한 번 냅니다. `SentenceOrderActivity`에서
 * 떼어 둔 것입니다(파일 길이).
 */
export function useSentenceOrderAnnouncements(
  result: AnswerResult | null,
  questionIndex: number,
  phase: SentenceOrderPhase,
  complete: boolean,
  copy: UiCopy,
): void {
  useEffect(() => {
    if (result === null) {
      return;
    }
    announce(sentenceOrderAnnouncement(result, copy));
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — `result`는 그 둘에서 파생하므로 넣지 않습니다(넣으면 같은 채점을 다시
    // 낭독할 수 있습니다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, phase]);

  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(sentenceOrderCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);
}
