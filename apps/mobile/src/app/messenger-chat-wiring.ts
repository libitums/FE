// 메신저 탭의 결선입니다(messenger-chat-ui spec §7.1 · §11). 대화 출처는 앱 프로세스 싱글턴이고(1단계 가짜 —
// 로그아웃 · 계정 삭제와 무관), 이동 콜백은 `dispatch`를 화면 밖에 둡니다. 배경 전용 라이브러리를 값으로 가져오지 않습니다.

import type { Dispatch } from "@lynx-js/react";

import {
  createFixtureChatSource,
  type FixtureChatSource,
} from "../screens/messenger-chat/chat-fixture-source";
import { isTesterAccessActive } from "../lib/tester-access";
import type { ChatFixtureSeed, ChatSource } from "../screens/messenger-chat/chat-source.contract";
import {
  deviceTurnRecordStore,
  deviceUnlockStore,
  type UnlockStore,
} from "../screens/messenger-chat/chat-local-stores";
import { createCoinWallet, type SyncedCoinWallet } from "../screens/messenger-chat/coin-wallet";
import type { ChatTier } from "../screens/messenger-chat/free-turns";
import {
  createTurnLedger,
  type TurnLedger,
  type TurnRecordStore,
} from "../screens/messenger-chat/turn-ledger";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

export type MessengerChatWiring = {
  readonly source: ChatSource;
  /** 엽전 지갑입니다 — 번 엽전(앱의 coinCount)을 따라가고 쓴 양은 메모리입니다(spec §5.2). */
  readonly wallet: SyncedCoinWallet;
  /** 하루 무료 수 원장입니다(모든 인물 합 · 기기 저장 — spec §5.3). */
  readonly turns: TurnLedger;
  /** 시험 계정(무제한)이면 unlimited. */
  readonly tier: ChatTier;
  readonly now: () => number;
  readonly onOpenChatRoom: (roomId: string) => void;
  readonly onExitChatRoom: () => void;
  /** 새 친구 시트의 Reply — 메신저 탭 루트로 옮겨 그 방을 엽니다(키보드 닫힘 — 방의 1단계 규칙 그대로). */
  readonly onOpenChatRoomFromNewFriend: (roomId: string) => void;
  readonly onGoToJourney: () => void;
};

type ImageUrlOf = (relativePath: string) => string | null;

let singleton: FixtureChatSource | null = null;
let latestImageUrlOf: ImageUrlOf | null = null;
let walletSingleton: SyncedCoinWallet | null = null;
let ledgerSingleton: TurnLedger | null = null;
/** 테스트가 끼우는 메모리 저장 · 가짜 시계입니다(앱은 기기 저장 · `Date.now`). */
let storeOverride: TestStores | null = null;

export type TestStores = {
  readonly unlock: UnlockStore;
  readonly turns: TurnRecordStore;
  readonly now: () => number;
};

/** 해금 기록 저장입니다 — 앱은 기기 저장, 테스트는 메모리(spec §7.2). */
export function messengerUnlockStore(): UnlockStore {
  return storeOverride?.unlock ?? deviceUnlockStore;
}

const clockNow = (): number => (storeOverride?.now ?? Date.now)();

/** 이미 만들어진 대화 출처입니다(없으면 null) — 해금 확정이 출처에도 알릴 때 씁니다. */
export function currentMessengerChatSource(): FixtureChatSource | null {
  return singleton;
}

/** 테스트 전용: 해금 저장 · 무료 수 원장 저장 · 시계를 끼웁니다. `resetMessengerChatSourceForTests` 뒤에 부릅니다. */
export function setMessengerChatStoresForTests(stores: TestStores): void {
  storeOverride = stores;
}

/**
 * 앱 프로세스 지갑입니다. 렌더 중에는 읽기만 합니다 — 번 엽전을 맞추는 일은 효과(`use-messenger-wallet-sync`)가 합니다
 * (spec §8: 렌더 중 `syncEarned`는 구독자를 렌더 중에 흔들었습니다).
 */
export function messengerChatWallet(earned = 0): SyncedCoinWallet {
  walletSingleton ??= createCoinWallet({ earned });
  return walletSingleton;
}

/**
 * 세션이 내려갈 때 지갑을 버립니다(리뷰 P2-2). 로그아웃 · 계정 전환은 `AppSession`이 새로 서는 일이라, 쓴 양이 남으면
 * 다음 계정의 잔액이 앞 계정의 소비만큼 줄어 보입니다. 지갑 객체는 그대로 두고 쓴 양만 비웁니다 — 새 세션은 첫 렌더에서
 * 이미 이 객체를 쥐기 때문입니다(새 세션 렌더가 앞 세션 해제 효과보다 먼저 지납니다).
 */
export function resetMessengerChatWallet(): void {
  walletSingleton?.resetSpent();
}

function messengerChatLedger(): TurnLedger {
  if (ledgerSingleton === null) {
    ledgerSingleton = createTurnLedger({
      store: storeOverride?.turns ?? deviceTurnRecordStore,
      now: clockNow,
    });
  }
  return ledgerSingleton;
}

/** 테스트만 씁니다 — 다음에 만들 출처의 씨앗입니다(없으면 앱 기본 씨앗). */
let testSeed: ChatFixtureSeed | undefined;

/**
 * 앱이 쓰는 대화 출처입니다. 처음 부를 때 만들고 이후 같은 것을 돌려줍니다.
 *
 * 그림 해석기는 **부를 때마다 최신으로 갈아 끼웁니다**. 앱은 에피소드 콘텐츠가 읽히기 전 첫 렌더에서(`noEpisodeContent`의
 * `() => null`) 결선을 한 번 지나므로, 처음 받은 해석기를 쥐면 아바타 그림이 영영 풀리지 않습니다(device-findings-1 D3).
 */
export function messengerChatSource(imageUrlOf: ImageUrlOf): ChatSource {
  const replaced = latestImageUrlOf !== null && latestImageUrlOf !== imageUrlOf;
  latestImageUrlOf = imageUrlOf;
  if (singleton === null) {
    singleton = createFixtureChatSource({
      imageUrlOf: (relativePath) => latestImageUrlOf?.(relativePath) ?? null,
      unlocked: [...messengerUnlockStore().read()],
      ...(testSeed === undefined ? {} : { seed: testSeed }),
    });
  } else if (replaced) {
    singleton.refreshImages();
  }
  return singleton;
}

/** 테스트가 케이스 사이에 출처를 처음 씨앗으로 되돌립니다. `seed`를 주면 다음 출처가 그 씨앗에서 시작합니다. */
export function resetMessengerChatSourceForTests(seed?: ChatFixtureSeed): void {
  singleton?.dispose();
  singleton = null;
  latestImageUrlOf = null;
  walletSingleton = null;
  ledgerSingleton = null;
  storeOverride = null;
  testSeed = seed;
}

export type MessengerChatWiringArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly imageUrlOf: (relativePath: string) => string | null;
  /** 앱의 보유 엽전입니다(ADR-0116). 아직 모르면 생략합니다. */
  readonly coinCount?: number;
};

export function messengerChatWiring(args: MessengerChatWiringArgs): {
  readonly messengerChat: MessengerChatWiring;
} {
  return {
    messengerChat: {
      source: messengerChatSource(args.imageUrlOf),
      wallet: messengerChatWallet(args.coinCount ?? 0),
      turns: messengerChatLedger(),
      tier: isTesterAccessActive() ? "unlimited" : "free",
      now: clockNow,
      onOpenChatRoom: (roomId) => {
        args.dispatch({ type: "push", screen: { name: "messenger-chat", roomId } });
      },
      onExitChatRoom: () => {
        args.dispatch({ type: "back" });
      },
      onOpenChatRoomFromNewFriend: (roomId) => {
        for (const action of tabRootActions("messenger")) args.dispatch(action);
        args.dispatch({ type: "push", screen: { name: "messenger-chat", roomId } });
      },
      onGoToJourney: () => {
        for (const action of tabRootActions("journey")) args.dispatch(action);
      },
    },
  };
}
