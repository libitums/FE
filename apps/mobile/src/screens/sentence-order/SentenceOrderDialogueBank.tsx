import type { ReactNode } from "@lynx-js/react";

import type { SentenceOrderInteraction } from "./sentence-order-layout";
import type { DialogueSpeaker } from "./sentence-order-questions";

export type SentenceOrderDialogueBankProps = {
  readonly chips: readonly string[];
  readonly meanings: readonly string[] | undefined;
  readonly speakers: readonly DialogueSpeaker[];
  readonly placedChipIndexes: readonly number[];
  readonly interaction: SentenceOrderInteraction;
  readonly onTap: (index: number) => void;
};

// 대화 조립의 창고(쓴 자리는 폭을 지키는 빈칸)입니다. 껍데기만 있는 단계입니다 — 조각을 그리지 않습니다.
export function SentenceOrderDialogueBank(_props: SentenceOrderDialogueBankProps): ReactNode {
  return <view data-testid="sentence-order-dialogue-bank" />;
}
