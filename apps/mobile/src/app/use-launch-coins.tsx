// 엽전 출시 안내 결선(ADR-0140) — 로그인한 사용자가 튜토리얼을 끝냈고 지도가 한가하면 서버 지급(한 번)을 부르고,
// 처음 받은 보너스면 엽전 모달 → (메신저를 쓸 수 있으면) 채팅 모달. 머리 엽전 칩은 엽전 모달을 닫은 뒤 서버 잔액을 보입니다
// (닫을 때 칩이 오르게). 새로 깬 레슨은 진행이 바뀔 때 다시 불러 서버에 더합니다(사용자 · 유닛마다 한 번).

import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef, useState } from "@lynx-js/react";

import type { CatalogProgress } from "../lib/catalog-progress";
import { coinClient, type CoinClaim } from "../lib/coin-wallet-api";
import { COMPANION_CHARACTERS } from "../screens/messenger-chat/companion-roster";
import { ChatIntroModal, LaunchCoinsModal } from "../screens/launch/LaunchModals";
import type { LaunchCastMember } from "../screens/launch/launch.contract";
import { useChatSnapshot } from "../screens/messenger-chat/use-chat-source";
import {
  deviceLaunchStore,
  launchStep,
  tutorialDone,
  type LaunchRecord,
  type LaunchStore,
} from "./launch-coins";
import { messengerAccessFor } from "./render-messenger-chat";
import type { ScreenWiring } from "./screen-wiring";

export type LaunchCoinsInput = {
  readonly wiring: ScreenWiring;
  readonly catalogProgress: CatalogProgress;
  /** 기기에서 센 엽전(서버 잔액을 받기 전 · 엽전 모달을 닫기 전에 칩이 보이는 값). */
  readonly localCoins: number | null;
  /** 지도 루트이고 다른 겹침 · 안내가 없음. */
  readonly idle: boolean;
  readonly onStartChatting: () => void;
  /** 테스트 주입 — 기본은 앱 서버 · 기기 저장소. */
  readonly claim?: () => Promise<CoinClaim | null>;
  readonly store?: LaunchStore;
};

export type LaunchCoins = {
  readonly coinCount: number | null;
  /** 모달이 떠 있음 — 다른 지도 안내(업데이트 안내 등)를 미룹니다. */
  readonly open: boolean;
  readonly layer: ReactNode;
};

const unitCount = (progress: CatalogProgress): number =>
  Object.values(progress).reduce((sum, keys) => sum + keys.length, 0);

export function useLaunchCoins(input: LaunchCoinsInput): LaunchCoins {
  const { wiring, catalogProgress, localCoins, idle, onStartChatting } = input;
  const store = input.store ?? deviceLaunchStore;
  const claim = input.claim ?? (() => coinClient().claim());
  const signedIn = wiring.accountState === "signed-in";
  const access = messengerAccessFor(wiring);
  const snapshot = useChatSnapshot(wiring.messengerChat.source);
  const [record, setRecord] = useState<LaunchRecord | null>(() => store.read());
  const [balance, setBalance] = useState<number | null>(null);
  const claimedFor = useRef<number | null>(null);
  const eligible = signedIn && tutorialDone(catalogProgress, wiring.legacyTutorialPassed);
  const units = unitCount(catalogProgress);

  useEffect(() => {
    if (!eligible || !idle || claimedFor.current === units) return;
    claimedFor.current = units;
    void claim().then((result) => {
      if (result === null) {
        claimedFor.current = null; // 다음에 다시
        return;
      }
      setBalance(result.balance);
      if (result.bonus > 0 && store.read() === null) {
        const next = {
          learning: result.learning,
          bonus: result.bonus,
          coinsShown: false,
          chatShown: false,
        };
        store.write(next);
        setRecord(next);
      }
    });
  }, [eligible, idle, units]);

  const save = (next: LaunchRecord) => {
    store.write(next);
    setRecord(next);
  };
  const step = launchStep({ record, chatOpen: access === "open", idle: idle && signedIn });
  const coinsPending = record !== null && !record.coinsShown;

  const cast: readonly LaunchCastMember[] = COMPANION_CHARACTERS.map((character) => {
    const room = snapshot.rooms.find((r) => r.roomId === character.id);
    return {
      name: character.name,
      avatarUrl:
        room?.counterpart.avatarUrl ?? wiring.episodeContent.imageUrlOf(character.avatarPath ?? ""),
      met: room === undefined ? character.unlockEpisode === null : room.access.kind === "open",
      episode: character.unlockEpisode,
    };
  });

  const layer =
    step === "coins" && record !== null ? (
      <LaunchCoinsModal
        learning={record.learning}
        bonus={record.bonus}
        balance={balance ?? record.learning + record.bonus}
        onDone={() => save({ ...record, coinsShown: true })}
      />
    ) : step === "chat" && record !== null ? (
      <ChatIntroModal
        cast={cast}
        onLater={() => save({ ...record, chatShown: true })}
        onStart={() => {
          save({ ...record, chatShown: true });
          onStartChatting();
        }}
      />
    ) : null;

  return {
    coinCount: coinsPending || balance === null ? localCoins : balance,
    open: step !== null,
    layer,
  };
}
