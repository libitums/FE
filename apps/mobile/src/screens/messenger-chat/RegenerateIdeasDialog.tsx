import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { useUiCopy } from "../../lib/ui-copy";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-overlays.css";

export type RegenerateIdeasDialogProps = {
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

// 새 답장 보기 만들기 확인(O3)입니다. 아이콘 없음. ui-lynx `Dialog`는 첫 액션이 주 버튼이고 마지막 액션이
// 뒤로가기 취소 경로라, [confirm, cancel] 순서로 둡니다.
export function RegenerateIdeasDialog({
  onConfirm,
  onCancel,
}: RegenerateIdeasDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.regen;
  const handleAction = (id: string) => {
    "background only";
    if (id === "confirm") onConfirm();
    else onCancel();
  };
  return (
    <view className="chat-dialog-centered" data-testid={ids.regenDialog}>
      <Dialog
        title={copy.title}
        description={copy.description}
        actions={[
          { id: "confirm", label: copy.confirm },
          { id: "cancel", label: copy.cancel },
        ]}
        bindaction={handleAction}
      />
    </view>
  );
}
