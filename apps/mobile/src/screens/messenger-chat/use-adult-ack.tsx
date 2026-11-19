// 「Get closer」 시트의 흐름(ADR-0164 D4) — 추가 전에 물을지 판정하고(`shouldAskAdultAck`), 시트의 두 단추를 동의 · 추가로 잇습니다.
// - Sounds good: 물었다고 적고 `companion_ack_adult()`를 부른 뒤 추가합니다. 동의가 실패해도 추가합니다(standard로 대화, 오류 화면 없음).
// - Just friends for now: 물었다고 적고 동의 없이 추가합니다(서버가 standard 수위로 대화).
// - 막 탭 · 뒤로가기: 닫기만 — 추가하지 않고, 물었다고 적지 않습니다.

import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AdultAckSheet } from "./AdultAckSheet";
import { shouldAskAdultAck } from "./companion-friends";
import type { AdultAckPort, FriendProfile } from "./friend-catalog.contract";

type Pending = {
  readonly character: FriendProfile;
  readonly avatarUrl: string | null;
  readonly proceed: () => void;
};

export type AdultAckFlow = {
  /**
   * 추가하기 전에 부릅니다 — 물을 필요가 없으면 `proceed`를 곧바로(또는 프로필을 읽은 뒤) 부릅니다.
   * `onShow`는 시트가 실제로 설 때만 불립니다 — 프로필을 읽는 동안 앞 화면(프로필 시트)을 닫지 않게(빈 화면 없음).
   */
  readonly begin: (
    character: FriendProfile,
    avatarUrl: string | null,
    proceed: () => void,
    onShow?: () => void,
  ) => void;
  readonly layer: ReactNode;
  readonly open: boolean;
};

export function useAdultAck(port: AdultAckPort | undefined): AdultAckFlow {
  const [pending, setPending] = useState<Pending | null>(null);

  function begin(
    character: FriendProfile,
    avatarUrl: string | null,
    proceed: () => void,
    onShow?: () => void,
  ): void {
    "background only";
    // 수위 open 인물이 아니거나 이미 물은 계정은 프로필을 읽지 않고 곧바로 추가합니다.
    if (port === undefined || character.romanceTier !== "open" || port.asked()) return proceed();
    void port
      .state()
      .catch(() => null)
      .then((state) => {
        if (!shouldAskAdultAck({ romanceTier: character.romanceTier, state, asked: port.asked() }))
          return proceed();
        onShow?.();
        return setPending({ character, avatarUrl, proceed });
      });
  }

  function handleConfirm() {
    "background only";
    if (pending === null || port === undefined) return;
    const { proceed } = pending;
    port.markAsked();
    setPending(null);
    void port
      .confirm()
      .catch(() => false)
      .then((ok) => {
        // 동의가 남지 않았어도 대화는 엽니다 — 서버가 standard로 답합니다.
        if (!ok) console.warn("[companion] companion_ack_adult failed; continuing with standard");
        proceed();
      });
  }

  function handleDecline() {
    "background only";
    if (pending === null || port === undefined) return;
    port.markAsked();
    setPending(null);
    pending.proceed();
  }

  const gender = pending?.character.gender ?? null;
  return {
    begin,
    open: pending !== null,
    layer:
      pending === null ? null : (
        <AdultAckSheet
          name={pending.character.name}
          avatarUrl={pending.avatarUrl}
          gender={gender}
          onConfirm={handleConfirm}
          onDecline={handleDecline}
          onClose={() => setPending(null)}
        />
      ),
  };
}
