// 젬 구매 화면의 도메인 값과 순수 계산입니다(Figma 597-992). 화면은 여기서 만든 값을
// 그리기만 합니다 — 금액 · 젬 수 · 문구가 갈리는 규칙은 전부 이 파일에 있고, `unit`
// 계층이 봅니다(ADR-0006 D4).
//
// 팩 셋과 가격은 디자인 표기 그대로입니다. 결제 연동이 아직 없어 가격표의 출처가 없고,
// 이 상수가 그 자리를 대신합니다.

export type GemPackId = "standard" | "plus" | "max";

export type GemPack = {
  readonly id: GemPackId;
  /** 기본 젬 수입니다. 보너스는 따로 셉니다. */
  readonly gems: number;
  readonly bonusGems: number;
  /** 센트 단위 가격입니다 — 부동소수로 돈을 들고 다니지 않습니다. */
  readonly priceCents: number;
  /** 카드 위에 걸리는 배지입니다(디자인의 `BEST VALUE`). */
  readonly badge?: string;
};

export const gemPacks: readonly GemPack[] = [
  { id: "standard", gems: 500, bonusGems: 0, priceCents: 499 },
  { id: "plus", gems: 1200, bonusGems: 200, priceCents: 999, badge: "BEST VALUE" },
  { id: "max", gems: 2800, bonusGems: 800, priceCents: 1999 },
];

/** 화면을 열 때 골라 두는 팩입니다 — 디자인이 가장 큰 팩을 고른 상태로 그립니다. */
export const initialGemPackId: GemPackId = "max";

export function findGemPack(id: GemPackId): GemPack {
  return gemPacks.find((pack) => pack.id === id) as GemPack;
}

export function totalGemsOf(pack: GemPack): number {
  return pack.gems + pack.bonusGems;
}

// 세 자리마다 쉼표를 찍습니다. `toLocaleString`을 쓰지 않습니다 — Lynx 백그라운드
// 런타임에 `Intl`이 있다고 기댈 수 없습니다.
export function formatGemCount(count: number): string {
  const whole = Math.max(0, Math.trunc(count));
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// 젬 하나 값은 보너스까지 합한 젬 수로 나눕니다 — 보너스가 큰 팩일수록 싸 보이는 것이
// 이 줄의 목적입니다. 유효 숫자 둘로 끊습니다(디자인: $0.010 · $0.0071 · $0.0056).
export function formatPricePerGem(pack: GemPack): string {
  return `$${(pack.priceCents / 100 / totalGemsOf(pack)).toPrecision(2)} per gem`;
}

/** 팩 카드 둘째 줄입니다 — 보너스가 있으면 보너스, 없으면 팩 이름입니다. */
export function packCaption(pack: GemPack): string {
  return pack.bonusGems > 0 ? `+ ${formatGemCount(pack.bonusGems)} bonus` : "Standard pack";
}

/** 주문 요약의 셋째 줄입니다. 보너스가 없는 팩이면 줄을 세우지 않습니다. */
export function bonusSummary(pack: GemPack): string | undefined {
  return pack.bonusGems > 0 ? `Includes ${formatGemCount(pack.bonusGems)} bonus gems` : undefined;
}
