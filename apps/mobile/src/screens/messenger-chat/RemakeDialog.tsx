import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { chatAlbumTestIds as ids } from "./chat-album.contract";
import { ChatModalFrame } from "./ChatModalFrame";
import type { ChatMediaKind } from "./chat-source.contract";

import "./chat-overlays.css";

export type RemakeDialogProps = {
  readonly media: ChatMediaKind;
  readonly name: string;
  readonly price: number;
  readonly balance: number;
  readonly onConfirm: () => void;
  readonly onGetCoins: () => void;
  readonly onCancel: () => void;
};

// 다시 그리기 · 다시 녹음 확인입니다(ADR-0150 M6). 값은 주 버튼에 글자로 — 모자라면 주 버튼이 「Get Yeopjeon」이 됩니다.
export function RemakeDialog({
  media,
  name,
  price,
  balance,
  onConfirm,
  onGetCoins,
  onCancel,
}: RemakeDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.album;
  const photo = media === "photo";
  const short = balance < price;
  const label = short
    ? copy.getCoins
    : photo
      ? copy.confirmRedraw(price)
      : copy.confirmRecord(price);
  return (
    <view data-testid={ids.confirm} data-media={media}>
      <ChatModalFrame
        testId={`${ids.confirm}-frame`}
        title={photo ? copy.redrawTitle : copy.recordTitle}
        description={photo ? copy.redrawBody(name) : copy.recordBody(name)}
        actions={
          <>
            <view className="chat-modal-action" data-testid={ids.confirmCancel}>
              <Button
                label={copy.cancel}
                variant="outline"
                size="xl"
                width="fill"
                bindtap={onCancel}
              />
            </view>
            <view className="chat-modal-action" data-testid={ids.confirmGo}>
              <Button
                label={label}
                variant="brand"
                size="xl"
                width="fill"
                bindtap={short ? onGetCoins : onConfirm}
              />
            </view>
          </>
        }
      >
        <text className="chat-ask-balance">{copy.balance(balance)}</text>
      </ChatModalFrame>
    </view>
  );
}
