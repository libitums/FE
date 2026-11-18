import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { useUiCopy } from "../../lib/ui-copy";
import { friendsTestIds as ids } from "./chat-friends.contract";

import "./chat-overlays.css";

export type FriendAdultDialogProps = {
  readonly name: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

// 성인 확인 한 번(추천 친구 open 등급) — 생년상 성인이고 아직 확인하지 않은 학습자가 open 등급 친구를 추가할 때만 섭니다. 확인이면 서버에
// 적고(`companion_ack_adult`), 취소여도 친구는 추가됩니다(서버가 보통 한도를 지킵니다). 나이 모름 · 미성년자에게는 서지 않습니다.
export function FriendAdultDialog({
  name,
  onConfirm,
  onCancel,
}: FriendAdultDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.friends;
  const handleAction = (id: string) => {
    "background only";
    if (id === "confirm") onConfirm();
    else onCancel();
  };
  return (
    <view className="chat-dialog-centered" data-testid={ids.adultDialog}>
      <Dialog
        title={copy.adultTitle}
        description={copy.adultBody(name)}
        actions={[
          { id: "confirm", label: copy.adultConfirm },
          { id: "cancel", label: copy.adultCancel },
        ]}
        bindaction={handleAction}
      />
    </view>
  );
}
