import type { ReactNode } from "@lynx-js/react";

import { chatAlbumTestIds as ids } from "./chat-album.contract";
import type { ChatSource } from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";

export type ChatAlbumScreenProps = {
  readonly source: ChatSource;
  readonly roomId: string;
  readonly name: string;
  readonly wallet: CoinWallet;
  readonly now?: () => number;
  /** 기기 시간대(UTC 기준 +분) — 날짜 묶음. 없으면 기기 값. */
  readonly offsetMinutes?: number;
  readonly onBack: () => void;
};

export function ChatAlbumScreen(_props: ChatAlbumScreenProps): ReactNode {
  return <view data-testid={ids.screen} />;
}
