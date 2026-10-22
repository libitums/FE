import type { ReactNode } from "@lynx-js/react";
import { Avatar } from "@libitums/ui-lynx/avatar";

import type { AnswerResult } from "../../lib/answer-result";
import type { ConversationCast } from "../../lib/conversation-cast";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { dialogueAvatarNameOf } from "./sentence-order-avatar";
import type { SentenceOrderInteraction } from "./sentence-order-layout";
import type { DialogueSpeaker } from "./sentence-order-questions";

import "./sentence-order-dialogue.css";

// 대화 조립(대화 순서 문항)의 카드 안입니다. 정답 길이만큼 칸이 위에서 아래로 서고, 칸마다 화자가
// 번갈아 — 짝수 칸은 상대(왼쪽 · 흰 면), 홀수 칸은 나(오른쪽 · 주황 면)입니다. 빈 칸은 그 화자 쪽에 자리표시
// 말풍선으로 서고, 창고의 조각을 누르면 다음 빈 칸에 그 칸 화자 모양으로 들어갑니다. 놓은 말풍선을
// 누르면 창고로 돌아갑니다 — 문장 순서의 「놓인 조각을 누르면 되돌린다」와 같은 규칙입니다.
//
// 줄마다 말풍선 바깥 아래쪽에 원형 아바타가 붙습니다 — 상대는 말풍선 왼쪽, 나는 오른쪽입니다. 아바타는
// 누가 말하는지를 눈으로만 보태는 장식이라 낭독 트리에서 빠지고, 칸의 낭독은 말풍선이 그대로 집니다.
//
// 상태가 없습니다. 놓인 조각 · 채점 여부는 화면(`SentenceOrderActivity`)의 세션 상태가 지고, 이
// 조각은 그것을 그리고 눌림을 올려 보냅니다.
export type SentenceOrderDialogueProps = {
  /** 칸마다 화자입니다 — 길이가 곧 칸 수(문항의 정답 길이)입니다. */
  readonly speakers: readonly DialogueSpeaker[];
  readonly chips: readonly string[];
  /** 놓인 조각의 `chips` 인덱스입니다. 배열 순서가 곧 칸 순서입니다. */
  readonly placedChipIndexes: readonly number[];
  /** 채점 전 칸별 판정입니다(`null`이면 아직 채점 전). 채점 뒤에는 칸 테두리가 판정 색을 냅니다. */
  readonly results: readonly (AnswerResult | null)[] | null;
  /** 채점 뒤에는 말풍선을 누를 수 없습니다. */
  readonly interaction: SentenceOrderInteraction;
  readonly onReturn: (chipIndex: number) => void;
  /** 아바타의 이름 · 그림입니다. 없으면 상대는 자리표시 그림, 나는 문구표 대체 이름입니다. */
  readonly cast?: ConversationCast | undefined;
};

/** 칸이 비어 있을 때 말풍선 안에 서는 표시입니다 — 낭독하지 않고 칸 이름이 대신 읽힙니다. */
const emptySlotMark = "----";

export function SentenceOrderDialogue({
  speakers,
  chips,
  placedChipIndexes,
  results,
  interaction,
  onReturn,
  cast,
}: SentenceOrderDialogueProps): ReactNode {
  const copy = useUiCopy();
  const locked = interaction === "locked";
  const names = { counterpart: cast?.counterpart.name, me: cast?.me.name };

  return (
    <view className="sentence-order-dialogue" data-testid="sentence-order-dialogue">
      {speakers.map((speaker, position) => {
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
        const avatar = (
          <view
            className={`sentence-order-dialogue-avatar sentence-order-dialogue-avatar-${speaker}`}
            data-testid={`sentence-order-dialogue-avatar-${position}`}
            accessibility-elements-hidden={true}
          >
            <Avatar
              name={dialogueAvatarNameOf(speaker, names, copy.sentenceOrder.dialogueSpeaker.me)}
              imageSource={cast?.[speaker].imageUrl}
              size="sm"
              accessibility="hidden"
            />
          </view>
        );
        const judged = results?.[position] ?? null;
        const bubble = (
          <view
            className={`sentence-order-dialogue-bubble sentence-order-dialogue-bubble-${speaker}${filled ? "" : " sentence-order-dialogue-bubble-empty"}${judged === null ? "" : ` sentence-order-dialogue-bubble-${judged}`}`}
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
        // 상대 줄은 아바타 · 말풍선, 내 줄은 말풍선 · 아바타 순서입니다 — 줄이 양 끝으로 붙여 줍니다.
        return (
          <view
            key={position}
            className={`sentence-order-dialogue-row sentence-order-dialogue-row-${speaker}`}
            data-testid={`sentence-order-dialogue-row-${position}`}
            data-speaker={speaker}
          >
            {speaker === "counterpart" ? avatar : bubble}
            {speaker === "counterpart" ? bubble : avatar}
          </view>
        );
      })}
    </view>
  );
}
