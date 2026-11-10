import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { useUiCopy } from "../../lib/ui-copy";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-overlays.css";

export type DeleteChatDialogProps = {
  readonly name: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

// 대화 지우기 확인입니다. 주 버튼(Delete) 면은 위험 색 덧씌움(`chat-delete-dialog`)이 칠합니다.
export function DeleteChatDialog({ name, onConfirm, onCancel }: DeleteChatDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.deleteChat;
  const handleAction = (id: string) => {
    "background only";
    if (id === "delete") onConfirm();
    else onCancel();
  };
  return (
    <view className="chat-dialog-centered chat-delete-dialog" data-testid={ids.deleteDialog}>
      <Dialog
        title={copy.title}
        description={copy.description(name)}
        actions={[
          { id: "delete", label: copy.confirm },
          { id: "cancel", label: copy.cancel },
        ]}
        bindaction={handleAction}
      />
    </view>
  );
}
