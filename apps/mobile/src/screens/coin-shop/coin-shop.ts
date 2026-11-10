import type { CoinPackId } from "../../lib/ui-copy-sections.contract";

import bigPouchArt from "./assets/big-pouch.webp";
import coinBundleArt from "./assets/coin-bundle.webp";
import coinPouchArt from "./assets/coin-pouch.webp";

// 엽전 상점의 도메인 값과 순수 계산입니다(ADR-0116 · 시안 「엽전 상점」). 화면은 여기서 만든 값을 그리기만 합니다 —
// 엽전 수 · 금액이 갈리는 규칙은 전부 이 파일에 있고 `unit` 계층이 봅니다(ADR-0006 D4).
//
// 팩 셋과 가격은 사용자 결정(2026-11-10)입니다 — 1엽전 ≈ 1센트. 레슨을 처음 통과하면 10엽전(에피소드 하나 ≈ 100)이라
// 옛 값(50 · 140 · 360)은 버는 양에 비해 너무 비쌌다. 메신저 가격(메시지 10 · 음성 40 · 사진 60)과 같은 눈금입니다.
// 결제 연동이 아직 없어 가격표의 출처가 없고, 이 상수가 그 자리를 대신합니다 — 사기 버튼은 「결제 준비 중」 안내만 띄웁니다.

export type { CoinPackId } from "../../lib/ui-copy-sections.contract";

export type CoinPack = {
  readonly id: CoinPackId;
  /** 기본 엽전 수입니다. 보너스는 따로 셉니다. */
  readonly coins: number;
  readonly bonusCoins: number;
  /** 센트 단위 가격입니다 — 부동소수로 돈을 들고 다니지 않습니다. */
  readonly priceCents: number;
  /** 카드 위에 「BEST VALUE」 배지가 걸리는가입니다. */
  readonly bestValue: boolean;
  /** 카드 왼쪽 그림(엮음 · 주머니 · 큰 주머니)입니다. */
  readonly art: string;
};

// id마다 팩 하나입니다 — `Record`라 `CoinPackId`에 id를 더하고 팩을 빠뜨리면 tsc가 잡습니다.
const coinPacksById: Readonly<Record<CoinPackId, CoinPack>> = {
  bundle: {
    id: "bundle",
    coins: 500,
    bonusCoins: 0,
    priceCents: 499,
    bestValue: false,
    art: coinBundleArt,
  },
  pouch: {
    id: "pouch",
    coins: 1000,
    bonusCoins: 200,
    priceCents: 999,
    bestValue: true,
    art: coinPouchArt,
  },
  big: {
    id: "big",
    coins: 2000,
    bonusCoins: 1000,
    priceCents: 1999,
    bestValue: false,
    art: bigPouchArt,
  },
};

/** 화면에 늘어놓는 순서입니다 — 엮음 · 주머니 · 큰 주머니(사용자 지정). */
export const coinPacks: readonly CoinPack[] = [
  coinPacksById.bundle,
  coinPacksById.pouch,
  coinPacksById.big,
];

/** 화면을 열 때 골라 두는 팩입니다 — 시안이 「BEST VALUE」 주머니를 고른 상태로 그립니다. */
export const initialCoinPackId: CoinPackId = "pouch";

export function findCoinPack(id: CoinPackId): CoinPack {
  return coinPacksById[id];
}

/** 카드의 큰 숫자 · 낭독이 쓰는 받는 엽전 수입니다 — 보너스를 합합니다(예: 1,200 = 1,000 + 「+200 bonus」). */
export function totalCoinsOf(pack: CoinPack): number {
  return pack.coins + pack.bonusCoins;
}

// 세 자리마다 쉼표를 찍습니다. `toLocaleString`을 쓰지 않습니다 — Lynx 백그라운드 런타임에 `Intl`이 있다고 기댈
// 수 없습니다.
export function formatCoinCount(count: number): string {
  const whole = Math.max(0, Math.trunc(count));
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
