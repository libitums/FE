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
  /** 조각마다 조작 상태입니다 — 칸이 다 찼거나 다음 빈 칸의 화자와 다른 조각은 `locked`입니다. */
  readonly interactionOf: (chipIndex: number) => SentenceOrderInteraction;
  readonly onTap: (index: number) => void;
};

// 대화 조립의 창고입니다. 쓴 자리는 폭을 지키는 빈칸(낭독 제외)이라 창고 배치가 흔들리지 않습니다. 채점 뒤에는 화면이 이
// 창고를 통째로 접습니다. 조각의 조작 상태는 조각마다 다릅니다 — 다음 빈 칸이 상대 칸이면 내 조각은 잠기고, 내 칸이면
// 상대 조각이 잠깁니다(화면이 `dialogueChipInteractionOf`로 정합니다).
export function SentenceOrderDialogueBank({
  chips,
  meanings,
  speakers,
  placedChipIndexes,
  interactionOf,
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
            interaction={interactionOf(chipIndex)}
            onTap={onTap}
          />
        ),
      )}
    </view>
  );
}
