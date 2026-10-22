import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import tick from "@libitums/icons/lynx/tick";

import type { AnswerResult } from "../../lib/answer-result";

import "./sentence-order-result-mark.css";

export type SentenceOrderResultMarkProps = {
  readonly result: AnswerResult;
  /** 아이콘이 서는 자리 글자색입니다 — 면 위에서 읽히는 토큰 값을 부르는 쪽이 고릅니다. */
  readonly tint: string;
  readonly testId: string;
};

// 채점 뒤 조각 · 칸 옆에 서는 맞음(tick) · 틀림(cross) 모양입니다. 색이 아니라 모양이 정오를 말하게 해(WCAG 1.4.1)
// 적록 색각 이상 사용자도 어느 자리가 틀렸는지 압니다. 낭독은 조각 · 칸 이름의 접미사가 지므로 이 아이콘은 이름이 없습니다.
export function SentenceOrderResultMark({
  result,
  tint,
  testId,
}: SentenceOrderResultMarkProps): ReactNode {
  return (
    <svg
      className="sentence-order-result-mark"
      data-testid={testId}
      data-result={result}
      content={result === "correct" ? tick : cross}
      current-color={tint}
    />
  );
}
