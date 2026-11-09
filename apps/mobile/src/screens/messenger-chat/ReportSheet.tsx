import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import tick from "@libitums/icons/lynx/tick";
import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";
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

type ReasonRowProps = {
  readonly id: ChatReportReasonId;
  readonly label: string;
  readonly checked: boolean;
  readonly spoken: string;
  readonly onToggle: (id: ChatReportReasonId) => void;
};

// 줄 전체가 체크 터치입니다. 체크 상태는 data-checked(시각)와 낭독 문장(「…, checked」) 둘 다에 싣습니다.
function ReasonRow({ id, label, checked, spoken, onToggle }: ReasonRowProps): ReactNode {
  const handleTap = () => {
    "background only";
    onToggle(id);
  };
  return (
    <view
      className="chat-check-row"
      data-testid={ids.reportReason(id)}
      data-checked={checked ? "true" : "false"}
      accessibility-element={true}
      accessibility-label={spoken}
      accessibility-traits="button"
      accessibility-role-description="checkbox"
      accessibility-enable-tap={true}
      bindtap={handleTap}
    >
      <view
        className={`chat-check-box${checked ? " chat-check-box-on" : ""}`}
        accessibility-elements-hidden={true}
      >
        {checked ? (
          <svg className="chat-check-icon" content={tick} current-color={color.white} />
        ) : null}
      </view>
      <text className="chat-check-label" accessibility-elements-hidden={true}>
        {label}
      </text>
    </view>
  );
}

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
              <ReasonRow
                key={id}
                id={id}
                label={label}
                checked={checked}
                spoken={copy.checked(label, checked)}
                onToggle={onToggle}
              />
            );
          })}
        </view>
      </BottomSheet>
    </view>
  );
}
