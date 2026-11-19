// 친구 추가 앞의 성인 확인(ADR-0163 D4) — 판정은 순수 `adult-ack.ts`, 여기는 동의 읽기 · 창 · 동의 남기기만 잇습니다.
// 확인 · 취소 모두 추가를 이어 갑니다. 나이 모름 학습자에게는 창도 안내도 없습니다.

import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AdultAckDialog } from "./AdultAckDialog";
import { adultAckStepOf } from "./adult-ack";
import type { ChatBirthYear } from "./chat-source.contract";
import type { FriendProfile, RomanceTier, SuggestedFriendsPort } from "./friend-catalog.contract";

type Pending = { readonly name: string; readonly proceed: () => void };

export type AdultAckGate = {
  /** 이 인물을 추가하기 전에 부릅니다 — 창이 필요 없으면 곧바로, 있으면 확인 · 취소 뒤에 `proceed`. */
  readonly request: (character: FriendProfile, proceed: () => void) => void;
  readonly dialog: ReactNode;
  readonly open: boolean;
};

export function useAdultAck({
  port,
  birthYear,
  tierOf,
}: {
  readonly port: SuggestedFriendsPort | undefined;
  readonly birthYear: ChatBirthYear;
  readonly tierOf: (characterId: string) => RomanceTier | null;
}): AdultAckGate {
  const [pending, setPending] = useState<Pending | null>(null);
  // 이번 실행에서 확인했으면 서버 읽기가 늦거나 실패해도 다시 묻지 않습니다(한 번만).
  const acked = useRef(false);

  const request = (character: FriendProfile, proceed: () => void): void => {
    "background only";
    const input = {
      kind: character.kind,
      romanceTier: tierOf(character.id),
      birthYear,
      now: Date.now(),
    };
    if (acked.current || adultAckStepOf({ ...input, adultAck: undefined }) === "skip") {
      return proceed();
    }
    const read = port?.adultAck ?? null;
    void (read === null ? Promise.resolve(null) : read())
      .catch(() => null)
      .then((adultAck) => {
        if (adultAckStepOf({ ...input, adultAck }) === "skip") return proceed();
        return setPending({ name: character.name, proceed });
      });
  };

  const settle = (confirmed: boolean): void => {
    "background only";
    if (pending === null) return;
    setPending(null);
    if (confirmed) {
      acked.current = true;
      // 동의 남기기는 추가를 막지 않습니다 — 실패하면 그 친구는 standard로 대화하고, 다음 추가 때 다시 묻습니다(다음 실행).
      void port?.ackAdult?.().catch(() => false);
    }
    pending.proceed();
  };

  return {
    request,
    open: pending !== null,
    dialog:
      pending === null ? null : (
        <AdultAckDialog
          name={pending.name}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      ),
  };
}
