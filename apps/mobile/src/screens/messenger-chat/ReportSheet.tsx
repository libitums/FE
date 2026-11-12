import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";
import { CheckRow } from "./CheckRow";
import { canSendReport } from "./chat-rules";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatReportReasonId } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-overlays.css";

export type ReportSheetProps = {
  readonly reasons: readonly ChatReportReasonId[];
  readonly onToggle: (id: ChatReportReasonId) => void;
  readonly onSend: () => void;
  readonly onClose: () => void;
};

// 신고 시트(O1)입니다. 사유 다섯 줄을 여러 개 체크하고, 하나 이상 체크해야 「Send report」가 켜집니다.
export function ReportSheet({ reasons, onToggle, onSend, onClose }: ReportSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.report;
  return (
    <view data-testid={ids.reportSheet}>
      <BottomSheet
        title={copy.title}
        description={copy.description}
        closeAccessibilityLabel={copy.close}
        actions={[
          { id: "send", label: copy.send, disabled: !canSendReport(reasons), bindtap: onSend },
          { id: "cancel", label: copy.cancel, bindtap: onClose },
        ]}
        ondismiss={onClose}
      >
        <view className="chat-check-list">
          {CHAT_PLACEHOLDERS.reportReasons.map((id) => {
            const checked = reasons.includes(id);
            const label = copy.reasons[id];
            return (
              <CheckRow
                key={id}
                testId={ids.reportReason(id)}
                label={label}
                checked={checked}
                spoken={copy.checked(label, checked)}
                onToggle={() => onToggle(id)}
              />
            );
          })}
        </view>
      </BottomSheet>
    </view>
  );
}
