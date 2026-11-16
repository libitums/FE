import type { ReactNode } from "@lynx-js/react";

import { AssembledHintButton } from "../../components/assembled-hint/AssembledHint";
import { SentenceOrderDialogueBank } from "./SentenceOrderDialogueBank";
import { SentenceOrderLinesBank } from "./SentenceOrderLinesBank";
import { dialogueChipInteractionOf } from "./sentence-order-layout";
import type { SentenceOrderInteraction } from "./sentence-order-layout";
import type { SentenceOrderQuestion } from "./sentence-order-questions";
import type { SentenceOrderSessionState } from "./sentence-order";

export type SentenceOrderWorkspaceProps = {
  readonly question: SentenceOrderQuestion;
  readonly state: SentenceOrderSessionState;
  readonly layout: "lines" | "dialogue";
  readonly bankInteraction: SentenceOrderInteraction;
  /** 지금 보일 조각 로마자입니다(ADR-0153). 없으면 `null`. */
  readonly romanizations: readonly string[] | null;
  /** 힌트 버튼을 세울지 — 문장 조립이고 채점 전일 때만입니다. */
  readonly onHint: (() => void) | null;
  readonly onToggle: (chipIndex: number) => void;
  readonly onPlaceDialogueChip: (chipIndex: number) => void;
};

// 문장 만들기의 작업 영역(창고)입니다 — 줄 배치는 힌트 줄(있으면) 아래 조각 창고, 대화 배치는 화자별 창고입니다.
// 채점 뒤 대화 배치는 창고가 없습니다.
export function SentenceOrderWorkspace({
  question,
  state,
  layout,
  bankInteraction,
  romanizations,
  onHint,
  onToggle,
  onPlaceDialogueChip,
}: SentenceOrderWorkspaceProps): ReactNode {
  if (layout === "dialogue") {
    return state.phase === "checked" ? undefined : (
      <SentenceOrderDialogueBank
        chips={question.chips}
        meanings={question.chipMeanings}
        speakers={question.dialogue?.chipSpeakers ?? []}
        placedChipIndexes={state.placedChipIndexes}
        interactionOf={(chipIndex) => dialogueChipInteractionOf(question, state, chipIndex)}
        onTap={onPlaceDialogueChip}
      />
    );
  }
  return (
    <view className="sentence-order-workspace">
      {onHint === null ? null : <AssembledHintButton onOpen={onHint} />}
      <SentenceOrderLinesBank
        chips={question.chips}
        placedChipIndexes={state.placedChipIndexes}
        interaction={bankInteraction}
        romanizations={romanizations}
        onTap={onToggle}
      />
    </view>
  );
}
