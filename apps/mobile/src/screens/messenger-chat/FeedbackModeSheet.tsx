import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";
import type { ChatFeedbackMode } from "./chat-source.contract";
import { ChoiceRow } from "./ChoiceRow";
import { chatSettingsTestIds as ids } from "./chat-settings.contract";

import "./chat-settings.css";

export type FeedbackModeSheetProps = {
  readonly name: string;
  readonly selected: ChatFeedbackMode;
  readonly onSelect: (mode: ChatFeedbackMode) => void;
  readonly onSave: () => void;
  readonly onClose: () => void;
};

const modes: readonly ChatFeedbackMode[] = ["separate", "natural", "prefix"];

// 교정 방식 시트입니다(ADR-0126). 계정 하나의 값이라 모든 캐릭터에 적용된다고 알립니다.
export function FeedbackModeSheet({
  name,
  selected,
  onSelect,
  onSave,
  onClose,
}: FeedbackModeSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.chatSettings.feedback;
  return (
    <view data-testid={ids.feedbackSheet}>
      <BottomSheet
        title={copy.title}
        closeAccessibilityLabel={copy.close}
        actions={[{ id: "save", label: copy.save, bindtap: onSave }]}
        ondismiss={onClose}
      >
        <view className="chat-settings-sheet">
          <text className="chat-settings-sheet-body" flatten={false} accessibility-element={true}>
            {copy.body(name)}
          </text>
          <view className="chat-settings-choices">
            {modes.map((mode) => (
              <ChoiceRow
                key={mode}
                testId={ids.feedbackMode(mode)}
                title={copy.modes[mode].title}
                body={copy.modes[mode].body(name)}
                tag={mode === "separate" ? copy.defaultTag : undefined}
                selected={mode === selected}
                onSelect={() => onSelect(mode)}
              />
            ))}
          </view>
          <text className="chat-settings-sheet-note" flatten={false} accessibility-element={true}>
            {copy.note}
          </text>
        </view>
      </BottomSheet>
    </view>
  );
}
