import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { TextField } from "@libitums/ui-lynx/text-field";

import { useUiCopy } from "../../lib/ui-copy";
import { CheckRow } from "./CheckRow";
import type { ChatRatingReason } from "./chat-feedback.contract";
import { chatFeedbackTestIds as ids } from "./chat-feedback.contract";
import { canSendRating, RATING_NOTE_MAX, RATING_REASONS } from "./chat-feedback-rules";

import "./chat-overlays.css";
import "./chat-feedback.css";

export type RatingSheetProps = {
  readonly name: string;
  readonly reasons: readonly ChatRatingReason[];
  readonly note: string;
  readonly onToggle: (reason: ChatRatingReason) => void;
  readonly onNote: (value: string) => void;
  readonly onSend: () => void;
  /** 「Made me uncomfortable」을 골랐을 때만 보이는 신고 길 — 평가를 저장하고 신고 시트로 갑니다. */
  readonly onReport: () => void;
  readonly onClose: () => void;
};

// 👎 이유 시트(ADR-0129) — 이유 다섯 줄을 여럿 고르고(하나 이상이면 Send), 메모는 선택 200자입니다. 닫기 · 뒤로는 저장하지 않습니다.
export function RatingSheet({
  name,
  reasons,
  note,
  onToggle,
  onNote,
  onSend,
  onReport,
  onClose,
}: RatingSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.feedback.sheet;
  const checkedCopy = useUiCopy().messengerChat.report.checked;
  return (
    <view data-testid={ids.sheet}>
      <BottomSheet
        title={copy.title}
        description={copy.body(name)}
        closeAccessibilityLabel={copy.close}
        actions={[
          { id: "send", label: copy.send, disabled: !canSendRating(reasons), bindtap: onSend },
        ]}
        ondismiss={onClose}
      >
        <view className="chat-check-list">
          {RATING_REASONS.map((reason) => {
            const checked = reasons.includes(reason);
            const label = copy.reasons[reason](name);
            return (
              <CheckRow
                key={reason}
                testId={ids.sheetReason(reason)}
                label={label}
                checked={checked}
                spoken={checkedCopy(label, checked)}
                onToggle={() => onToggle(reason)}
              />
            );
          })}
        </view>
        {reasons.includes("uncomfortable") ? (
          <view className="chat-rating-report" data-testid={ids.sheetReport}>
            <text className="chat-rating-report-text">{copy.reportPrompt}</text>
            <Button label={copy.report} variant="outline" size="s" bindtap={onReport} />
          </view>
        ) : null}
        <view className="chat-rating-note" data-testid={ids.sheetNote}>
          <TextField
            label={copy.noteLabel}
            placeholder={copy.notePlaceholder}
            defaultValue={note}
            counter={{ maxLength: RATING_NOTE_MAX }}
            bindinput={onNote}
          />
        </view>
      </BottomSheet>
    </view>
  );
}
