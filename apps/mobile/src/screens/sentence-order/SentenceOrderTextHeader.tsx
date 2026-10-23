import type { ReactNode } from "@lynx-js/react";

import { TextRoles } from "../../components/TextRoles";
import { romanizationSegmentsOf } from "../../lib/romanization-segments";

import "./sentence-order-lines.css";

export type SentenceOrderTextHeaderProps = {
  /** 영어 문장입니다(WORD_ORDER의 위 줄). */
  readonly prompt: string;
  /** 읽기 줄(정답 로마자)입니다. 아직 보이지 않으면 `null`입니다. */
  readonly romanization: string | null;
};

// 단어 순서(WORD_ORDER)의 위 줄 — 영어 문장이고, Check 뒤에는 그 아래 정답 로마자가 붙습니다. 로마자는 정답을 알려 주므로
// 판정 전에는 문서에 없습니다.
export function SentenceOrderTextHeader({
  prompt,
  romanization,
}: SentenceOrderTextHeaderProps): ReactNode {
  return (
    <view className="sentence-order-header" data-testid="sentence-order-header">
      <text className="sentence-order-prompt" data-testid="sentence-order-screen-prompt">
        {prompt}
      </text>
      {romanization === null ? null : (
        <TextRoles.Romanization
          segments={romanizationSegmentsOf(romanization, undefined)}
          size="m"
          testId="sentence-order-reading"
        />
      )}
    </view>
  );
}
