import type { ReactNode } from "@lynx-js/react";

export type SentenceOrderTextHeaderProps = {
  /** 영어 문장입니다(WORD_ORDER의 위 줄). */
  readonly prompt: string;
  /** 읽기 줄(정답 로마자)입니다. 아직 보이지 않으면 `null`입니다. */
  readonly romanization: string | null;
};

// 단어 순서(WORD_ORDER)의 위 줄 — 영어 문장과 Check 뒤 로마자입니다. 껍데기만 있는 단계입니다.
export function SentenceOrderTextHeader({ prompt }: SentenceOrderTextHeaderProps): ReactNode {
  return (
    <view data-testid="sentence-order-header">
      <text data-testid="sentence-order-screen-prompt">{prompt}</text>
    </view>
  );
}
