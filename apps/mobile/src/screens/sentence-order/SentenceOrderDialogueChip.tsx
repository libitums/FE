import type { ReactNode } from "@lynx-js/react";

import type { SentenceOrderInteraction } from "./sentence-order-layout";
import type { DialogueSpeaker } from "./sentence-order-questions";

export type SentenceOrderDialogueChipProps = {
  readonly index: number;
  readonly text: string;
  readonly meaning: string | undefined;
  readonly speaker: DialogueSpeaker;
  readonly interaction: SentenceOrderInteraction;
  readonly onTap: (index: number) => void;
};

// 창고의 대화 조각(화자 톤 · 한글 + 뜻 줄)입니다. 껍데기만 있는 단계입니다 — 모양 · 이름이 아직 없습니다.
export function SentenceOrderDialogueChip({
  index,
  text,
}: SentenceOrderDialogueChipProps): ReactNode {
  return <text data-testid={`sentence-order-dialogue-chip-${index}`}>{text}</text>;
}
