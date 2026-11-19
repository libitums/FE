import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { friendProfileTestIds as ids } from "./friend-profile.contract";

import "./chat-overlays.css";

export type AdultAckDialogProps = {
  readonly name: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

// 성인 확인 창(ADR-0163 D4) — open 수위 친구를 생년상 성인이 처음 추가할 때 한 번. 확인은 동의를 남기고, 취소도 친구는 추가합니다
// (그 친구는 standard 수위로 대화). 앱의 확인 창(ui-lynx `Dialog`, [주 버튼, 취소] 순서)을 그대로 씁니다. 시스템 뒤로가기 = 취소.
export function AdultAckDialog({ name, onConfirm, onCancel }: AdultAckDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.suggested.profile.adult;
  useLayerBack(onCancel);
  const handleAction = (id: string) => {
    "background only";
    if (id === "confirm") onConfirm();
    else onCancel();
  };
  return (
    <view className="chat-dialog-centered" data-testid={ids.adultDialog}>
      <Dialog
        title={copy.title}
        description={copy.body(name)}
        actions={[
          { id: "confirm", label: copy.confirm },
          { id: "cancel", label: copy.cancel },
        ]}
        bindaction={handleAction}
      />
    </view>
  );
}
