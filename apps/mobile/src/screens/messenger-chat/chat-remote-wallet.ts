// 서버 방의 엽전은 서버 지갑이 정본입니다(ADR-0155). 앱 지갑에서 빼지 않고, 서버가 알려 준 잔액 · 체험 남은 수를 바깥 알림으로 내보냅니다.
// - 서버 출처를 만들 때 지갑(`companion_get_wallet`)을 한 번 읽습니다(앱을 켠 뒤 칩 · 체험 수).
// - 턴이 끝나면 `done`의 잔액을 곧바로 알리고, 엽전을 쓰지 않은 턴(공용 체험 한 통 — 인물과 상관없음)이나 잔액을 모르는 턴(실패 ·
//   크레딧 없는 서버) 뒤에는 지갑을 다시 읽어 체험 남은 수를 맞춥니다(서버가 모든 인물의 체험 통을 함께 셉니다).

import type { ChatMediaHooks } from "./chat-media.contract";
import type { ChatRemote } from "./chat-remote.contract";
import type { TurnWallet } from "./companion-turn";

export function remoteWalletSync(remote: ChatRemote, hooks: ChatMediaHooks | undefined) {
  const read = () => {
    if (remote.wallet === undefined || hooks === undefined) return;
    // 못 읽으면 지금 칩 · 체험 수를 그대로 둡니다 — 다음 턴 뒤에 다시 읽습니다.
    void remote
      .wallet()
      .then((wallet) => {
        if (wallet === null) return;
        hooks.onBalance?.(wallet.balance);
        if (wallet.trialRemaining !== null) hooks.onTrialRemaining?.(wallet.trialRemaining);
      })
      .catch(() => undefined);
  };
  read();
  return {
    /** 턴 하나가 끝났습니다(성공 · 실패 모두). */
    afterTurn: (wallet: TurnWallet | null) => {
      const balance = wallet?.balance ?? null;
      if (balance !== null) hooks?.onBalance?.(balance);
      if (balance === null || wallet?.creditsSpent === 0) read();
    },
  };
}
