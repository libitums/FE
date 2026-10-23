import type { ReactNode } from "@lynx-js/react";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { dialogueChipAccessibilityLabel } from "./sentence-order-layout";
import type { SentenceOrderInteraction } from "./sentence-order-layout";
import type { DialogueSpeaker } from "./sentence-order-questions";

import "./sentence-order-dialogue-chip.css";

export type SentenceOrderDialogueChipProps = {
  readonly index: number;
  readonly text: string;
  readonly meaning: string | undefined;
  readonly speaker: DialogueSpeaker;
  readonly interaction: SentenceOrderInteraction;
  readonly onTap: (index: number) => void;
};

// 창고의 대화 조각입니다 — 화자 톤(내 조각은 주황 면 · 흰 글자, 상대 조각은 흰 면 · 연한 테두리)에 한글 한 줄과 그 아래
// 영어 뜻 줄이 섭니다. 이름은 화자 + 글 + 뜻이라 눈으로 보는 정보와 같습니다. 칸에 놓은 조각은 창고에 빈칸을 남깁니다.
export function SentenceOrderDialogueChip({
  index,
  text,
  meaning,
  speaker,
  interaction,
  onTap,
}: SentenceOrderDialogueChipProps): ReactNode {
  const copy = useUiCopy();
  const locked = interaction === "locked";
  const handleTap = () => {
    "background only";
    playSound("button");
    onTap(index);
  };
  return (
    <view
      className={`sentence-order-dialogue-chip sentence-order-dialogue-chip-${speaker}`}
      data-testid={`sentence-order-dialogue-chip-${index}`}
      data-speaker={speaker}
      accessibility-element={true}
      accessibility-label={dialogueChipAccessibilityLabel(speaker, text, meaning, copy)}
      accessibility-traits={locked ? "disabled" : "button"}
      bindtap={locked ? undefined : handleTap}
    >
      <text className="sentence-order-dialogue-chip-text">{text}</text>
      {meaning === undefined ? null : (
        <text
          className="sentence-order-dialogue-chip-meaning"
          data-testid={`sentence-order-dialogue-chip-${index}-meaning`}
        >
          {meaning}
        </text>
      )}
    </view>
  );
}
