import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { AlbumPhotoViewer } from "./AlbumPhotoViewer";
import { albumDayOf, chatPhotoTile, remakePrice } from "./chat-album-rules";
import type { ChatRoomAction } from "./chat-room-state";
import type { ChatSource, ChatThread } from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";
import { RemakeDialog } from "./RemakeDialog";

export type ChatPhotoLayerProps = {
  readonly step: "view" | "redraw";
  /** 누른 사진 줄 id입니다. */
  readonly messageId: string;
  readonly thread: ChatThread;
  readonly source: ChatSource;
  readonly wallet: CoinWallet;
  readonly coinBalance: number;
  readonly dispatch: (action: ChatRoomAction) => void;
  readonly now?: () => number;
  readonly offsetMinutes?: number;
};

// 방의 사진 보기입니다(ADR-0150 2026-11-17 추가) — 앨범과 같은 사진 보기 · 다시 그리기 확인을 방 위에 겹칩니다.
// 칸은 방 로그의 사진 줄로 만듭니다(`chatPhotoTile`). 다시 그리기는 앨범과 같은 출처 호출이라 결과 · 거절은 방에 줄로 섭니다.
// 가짜 방은 앱 지갑에서 내고, 서버 방은 서버가 냅니다. 사진이 사라지면(대화를 지움) 겹침도 그리지 않습니다.
export function ChatPhotoLayer({
  step,
  messageId,
  thread,
  source,
  wallet,
  coinBalance,
  dispatch,
  now = Date.now,
  offsetMinutes = -new Date().getTimezoneOffset(),
}: ChatPhotoLayerProps): ReactNode {
  const copy = useUiCopy().messengerChat.album;
  const tile = chatPhotoTile(thread.messages, messageId);
  if (tile === null) return null;
  const name = thread.counterpart.name;
  const price = remakePrice("photo", true);
  const close = () => {
    "background only";
    dispatch({ type: "close-overlay" });
  };
  if (step === "view")
    return (
      <AlbumPhotoViewer
        tile={tile}
        name={name}
        dayLabel={copy.day(albumDayOf(tile.item.createdAt, now(), offsetMinutes))}
        onClose={close}
        onRedraw={() =>
          dispatch({ type: "open-overlay", overlay: { kind: "photo-redraw", messageId } })
        }
      />
    );
  const confirm = () => {
    "background only";
    if (thread.server === null && wallet.spend(price, "photo").kind === "short") {
      dispatch({ type: "open-overlay", overlay: { kind: "coin-shop", from: "photo" } });
      return;
    }
    close();
    void source.album.remake(thread.roomId, tile.item);
  };
  return (
    <RemakeDialog
      media="photo"
      name={name}
      price={price}
      balance={coinBalance}
      onConfirm={confirm}
      onGetCoins={() =>
        dispatch({ type: "open-overlay", overlay: { kind: "coin-shop", from: "photo" } })
      }
      onCancel={close}
    />
  );
}
