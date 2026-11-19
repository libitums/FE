// 구매 뒤 서버 확인 대기의 문구(ADR-0163) — 엽전 상점 문구(`CoinShopCopy.purchaseWait`)의 한 구획입니다.

export type PurchaseWaitCopy = {
  /** 위 알약 — 기다리는 동안. */
  readonly confirming: string;
  /** 위 알약 — 60초 동안 서버가 그대로일 때의 조용한 안내. */
  readonly late: string;
  /** 위 알약 — 엽전이 들어왔을 때. `display`는 `formatCoinCount`의 결과, 복수형은 `count`가 정합니다. */
  readonly added: (count: number, display: string) => string;
  /** 산 팩 카드의 한 줄. */
  readonly adding: string;
  /** 스켈레톤 칩 이름 앞말. */
  readonly updating: string;
};
