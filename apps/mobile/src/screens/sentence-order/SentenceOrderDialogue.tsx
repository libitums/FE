import type { ReactNode } from "@lynx-js/react";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { dialogueSpeakerAt } from "./sentence-order";

import "./sentence-order-dialogue.css";

// 대화 조립(대화 순서 문항)의 카드 안입니다. 정답 길이만큼 칸이 위에서 아래로 서고, 칸마다 화자가
// 번갈아 — 짝수 칸은 상대(왼쪽 · 회색), 홀수 칸은 나(오른쪽 · 주황)입니다. 빈 칸은 그 화자 쪽에 자리표시
// 말풍선으로 서고, 창고의 조각을 누르면 다음 빈 칸에 그 칸 화자 모양으로 들어갑니다. 놓은 말풍선을
// 누르면 창고로 돌아갑니다 — 문장 순서의 「놓인 조각을 누르면 되돌린다」와 같은 규칙입니다.
//
// 상태가 없습니다. 놓인 조각 · 채점 여부는 화면(`SentenceOrderActivity`)의 세션 상태가 지고, 이
// 조각은 그것을 그리고 눌림을 올려 보냅니다.
export type SentenceOrderDialogueProps = {
  /** 칸 수 — 문항의 정답 길이입니다. */
  readonly slotCount: number;
  readonly chips: readonly string[];
  /** 놓인 조각의 `chips` 인덱스입니다. 배열 순서가 곧 칸 순서입니다. */
  readonly placedChipIndexes: readonly number[];
  /** 채점 뒤에는 말풍선을 누를 수 없습니다. */
  readonly locked: boolean;
  readonly onReturn: (chipIndex: number) => void;
};

/** 칸이 비어 있을 때 말풍선 안에 서는 표시입니다 — 낭독하지 않고 칸 이름이 대신 읽힙니다. */
const emptySlotMark = "----";

export function SentenceOrderDialogue({
  slotCount,
  chips,
  placedChipIndexes,
  locked,
  onReturn,
}: SentenceOrderDialogueProps): ReactNode {
  const copy = useUiCopy();
  const slots = Array.from({ length: slotCount }, (_, position) => position);

  return (
    <view className="sentence-order-dialogue" data-testid="sentence-order-dialogue">
      {slots.map((position) => {
        const speaker = dialogueSpeakerAt(position);
        const speakerName = copy.sentenceOrder.dialogueSpeaker[speaker];
        const chipIndex = placedChipIndexes[position];
        const text = chipIndex === undefined ? undefined : chips[chipIndex];
        const filled = chipIndex !== undefined && text !== undefined;
        const handleTap = () => {
          "background only";
          if (!filled) return;
          playSound("button");
          onReturn(chipIndex);
        };
        return (
          <view
            key={position}
            className={`sentence-order-dialogue-bubble sentence-order-dialogue-bubble-${speaker}${filled ? "" : " sentence-order-dialogue-bubble-empty"}`}
            data-testid={`sentence-order-dialogue-slot-${position}`}
            data-speaker={speaker}
            data-filled={filled ? "true" : "false"}
            accessibility-element={true}
            accessibility-label={
              filled
                ? copy.sentenceOrder.dialogueTurn(speakerName, position + 1, text)
                : copy.sentenceOrder.dialogueEmptyTurn(speakerName, position + 1)
            }
            accessibility-traits={filled ? (locked ? "disabled" : "button") : "text"}
            bindtap={filled && !locked ? handleTap : undefined}
          >
            <text
              className={`sentence-order-dialogue-text sentence-order-dialogue-text-${speaker}`}
            >
              {filled ? text : emptySlotMark}
            </text>
          </view>
        );
      })}
    </view>
  );
}
