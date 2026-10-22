import type { ReactNode } from "@lynx-js/react";

import { SentenceOrderChipPlaceholder } from "./SentenceOrderChip";
import { SentenceOrderDialogueChip } from "./SentenceOrderDialogueChip";
import type { SentenceOrderInteraction } from "./sentence-order-layout";
import type { DialogueSpeaker } from "./sentence-order-questions";

import "./sentence-order-screen.css";

export type SentenceOrderDialogueBankProps = {
  readonly chips: readonly string[];
  readonly meanings: readonly string[] | undefined;
  readonly speakers: readonly DialogueSpeaker[];
  readonly placedChipIndexes: readonly number[];
  readonly interaction: SentenceOrderInteraction;
  readonly onTap: (index: number) => void;
};

// 대화 조립의 창고입니다. 쓴 자리는 폭을 지키는 빈칸(낭독 제외)이라 창고 배치가 흔들리지 않습니다. 채점 뒤에는 화면이 이
// 창고를 통째로 접습니다.
export function SentenceOrderDialogueBank({
  chips,
  meanings,
  speakers,
  placedChipIndexes,
  interaction,
  onTap,
}: SentenceOrderDialogueBankProps): ReactNode {
  return (
    <view
      className="sentence-order-screen-bank sentence-order-dialogue-bank"
      data-testid="sentence-order-dialogue-bank"
    >
      {chips.map((text, chipIndex) =>
        placedChipIndexes.includes(chipIndex) ? (
          <SentenceOrderChipPlaceholder key={chipIndex} index={chipIndex} text={text} />
        ) : (
          <SentenceOrderDialogueChip
            key={chipIndex}
            index={chipIndex}
            text={text}
            meaning={meanings?.[chipIndex]}
            speaker={speakers[chipIndex] ?? "counterpart"}
            interaction={interaction}
            onTap={onTap}
          />
        ),
      )}
    </view>
  );
}
