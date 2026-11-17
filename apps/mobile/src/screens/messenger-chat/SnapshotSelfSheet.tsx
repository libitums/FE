import type { ReactNode } from "@lynx-js/react";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { useUiCopy } from "../../lib/ui-copy";
import {
  chatAlbumTestIds as ids,
  SNAPSHOT_SELVES,
  type ChatSnapshotSelf,
} from "./chat-album.contract";
import { ChoiceRow } from "./ChoiceRow";

import "./chat-settings.css";

export type SnapshotSelfSheetProps = {
  readonly selected: ChatSnapshotSelf;
  readonly onSelect: (self: ChatSnapshotSelf) => void;
  readonly onSave: () => void;
  readonly onClose: () => void;
};

// 사진 속 내 모습 시트입니다(ADR-0150 M4). 계정 하나의 값이라 모든 인물의 사진에 적용됩니다 — 얼굴은 늘 그리지 않습니다.
export function SnapshotSelfSheet({
  selected,
  onSelect,
  onSave,
  onClose,
}: SnapshotSelfSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.album;
  const close = useUiCopy().messengerChat.chatSettings.feedback.close;
  return (
    <view data-testid={ids.selfSheet}>
      <AppBottomSheet
        title={copy.selfTitle}
        closeAccessibilityLabel={close}
        actions={[{ id: "save", label: copy.save, bindtap: onSave }]}
        ondismiss={onClose}
      >
        <view className="chat-settings-sheet">
          <text className="chat-settings-sheet-body" flatten={false} accessibility-element={true}>
            {copy.selfBody}
          </text>
          <view className="chat-settings-choices">
            {SNAPSHOT_SELVES.map((self) => (
              <ChoiceRow
                key={self}
                testId={ids.selfOption(self)}
                title={copy.selfOptions[self].title}
                body={copy.selfOptions[self].body}
                selected={self === selected}
                onSelect={() => onSelect(self)}
              />
            ))}
          </view>
        </view>
      </AppBottomSheet>
    </view>
  );
}
