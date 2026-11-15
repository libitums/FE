import type { ReactNode } from "@lynx-js/react";

import { AskMediaDialog } from "./AskMediaDialog";
import { needsSelfAsk } from "./chat-album-rules";
import { CHAT_COIN_PRICES } from "./chat-coins";
import { useChatEvents } from "./chat-events";
import type { ChatOverlay, ChatRoomAction } from "./chat-room-state";
import type {
  ChatMediaKind,
  ChatPreferences,
  ChatSource,
  ChatThread,
} from "./chat-source.contract";
import type { CoinSpendResult, CoinWallet } from "./coin-wallet";

export type AskMediaOverlayProps = {
  readonly media: ChatMediaKind;
  readonly dispatch: (action: ChatRoomAction) => void;
  readonly thread: ChatThread;
  readonly source: ChatSource;
  readonly wallet: CoinWallet;
  readonly coinBalance: number;
  readonly preferences: ChatPreferences;
};

/** 앱 지갑 차감의 모자란 수(쓴 경우 0). */
const spentShort = (spent: CoinSpendResult): number => (spent.kind === "short" ? spent.shortBy : 0);

const askShop = (media: ChatMediaKind): Extract<ChatOverlay, { kind: "coin-shop" }> => ({
  kind: "coin-shop",
  from: media === "photo" ? "ask-photo" : "ask-voice",
});

// 방의 사진 · 음성 요청 겹침입니다(ChatRoomOverlays에서 나눔). 첫 Snapshot이면 내 모습을 함께 묻고(ADR-0150 M5),
// 고른 값을 요청보다 먼저 저장합니다 — 서버가 그 값으로 그립니다.
export function AskMediaOverlay({
  media,
  dispatch,
  thread,
  source,
  wallet,
  coinBalance,
  preferences,
}: AskMediaOverlayProps): ReactNode {
  const { emit } = useChatEvents();
  const { roomId } = thread;
  const price = CHAT_COIN_PRICES[media];
  const toShop = () => {
    emit({
      name: "chat_coins_short",
      surface: "chat",
      reason: media,
      shortBy: String(Math.max(0, price - coinBalance)),
    });
    dispatch({ type: "open-overlay", overlay: askShop(media) });
  };
  return (
    <AskMediaDialog
      media={media}
      name={thread.counterpart.name}
      balance={coinBalance}
      price={price}
      selfAsk={needsSelfAsk(preferences, media)}
      onConfirm={(self) => {
        // 무제한이어도 요청은 엽전을 냅니다(턴과 별개). 모자라면(그 사이 잔액이 줄었으면) 요청 없이 상점으로 갑니다.
        // 서버 방은 서버가 예약 · 확정합니다(ADR-0146 「앱 연결」) — 앱 지갑에서 빼지 않고 잔액만 봅니다.
        const shortBy =
          thread.server !== null
            ? Math.max(0, price - coinBalance)
            : spentShort(wallet.spend(price, media));
        if (shortBy > 0) return toShop();
        if (self !== null) source.setPreferences({ snapshotSelf: self });
        emit({
          name: "chat_media_requested",
          surface: "chat",
          characterId: roomId,
          media,
          price: String(price),
        });
        source.requestMedia(roomId, media);
        dispatch({ type: "close-overlay" });
      }}
      onGetCoins={toShop}
      onCancel={() => {
        "background only";
        dispatch({ type: "close-overlay" });
      }}
    />
  );
}
