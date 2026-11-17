import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { useUiCopy } from "../../lib/ui-copy";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

import "./chat-overlays.css";

export type ClearChatDialogProps = {
  readonly name: string;
  /** 지난 시도가 못 비운 까닭 — 답을 기다리는 중(busy) · 연결 실패(failed). 없으면 null. */
  readonly failure: "busy" | "failed" | null;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

// 대화 비우기 확인입니다(ADR-0156). 주 버튼(Clear) 면은 위험 색 덧씌움(`chat-delete-dialog`)이 칠합니다. 못 비웠으면 설명 자리에
// 까닭이 서고, 같은 Clear로 다시 시도합니다.
export function ClearChatDialog({
  name,
  failure,
  onConfirm,
  onCancel,
}: ClearChatDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.clearChat;
  const handleAction = (id: string) => {
    "background only";
    if (id === "clear") onConfirm();
    else onCancel();
  };
  const description =
    failure === null ? copy.description(name) : failure === "busy" ? copy.busy : copy.failed;
  return (
    <view className="chat-dialog-centered chat-delete-dialog" data-testid={ids.clearDialog}>
      <Dialog
        title={copy.title}
        description={description}
        actions={[
          { id: "clear", label: copy.confirm },
          { id: "cancel", label: copy.cancel },
        ]}
        bindaction={handleAction}
      />
    </view>
  );
}
