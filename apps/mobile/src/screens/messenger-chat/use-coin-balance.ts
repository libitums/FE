// 엽전 잔액 구독 훅입니다(messenger-chat-1-5 spec §5.2). use-chat-source와 같은 구독 꼴.

import { useEffect, useRef, useState } from "@lynx-js/react";

import type { CoinWallet } from "./coin-wallet";

export function useCoinBalance(wallet: CoinWallet): number {
  const current = wallet.balance();
  const seen = useRef(current);
  seen.current = current;
  const [, setVersion] = useState(0);
  useEffect(() => {
    const check = () => {
      if (wallet.balance() !== seen.current) setVersion((version) => version + 1);
    };
    // 첫 그림과 구독 사이에 바뀐 값을 놓치지 않도록 구독 직전에 한 번 맞춥니다.
    check();
    return wallet.subscribe(check);
  }, [wallet]);
  return current;
}
