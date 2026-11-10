// 메신저 지갑의 번 엽전을 앱의 보유 엽전에 맞춥니다(messenger-chat-1-5 spec §8). 렌더 중이 아니라 효과에서 합니다.

import { useEffect } from "@lynx-js/react";

import { messengerChatWallet, resetMessengerChatWallet } from "./messenger-chat-wiring";

export function useMessengerWalletSync(coinCount: number | undefined): void {
  // 세션이 내려갈 때 한 번 — 쓴 양은 계정에 묶입니다(리뷰 P2-2).
  useEffect(() => resetMessengerChatWallet, []);
  useEffect(() => {
    if (coinCount !== undefined) messengerChatWallet(coinCount).syncEarned(coinCount);
  }, [coinCount]);
}
