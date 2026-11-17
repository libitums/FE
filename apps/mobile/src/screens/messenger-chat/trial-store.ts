// 체험 인물(덕수쌤)의 체험 남은 수입니다(ADR-0155). 정본은 서버 지갑(`companion_get_wallet`의 `trialRemaining`)이고, 보낸 체험 한 통은
// 서버 답을 기다리지 않고 하나 줄여 보입니다 — 다음 서버 값이 덮습니다. 모르면 null.

export type TrialStore = {
  readonly remaining: () => number | null;
  /** 서버 값입니다. 음수 · 소수 · NaN은 버립니다. 같은 값이면 알리지 않습니다. */
  readonly set: (remaining: number | null) => void;
  /** 체험 한 통을 보냈습니다 — 하나 줄입니다(0 아래 · 모름은 그대로). */
  readonly consume: () => void;
  readonly subscribe: (listener: () => void) => () => void;
};

export function createTrialStore(initial: number | null): TrialStore {
  let value = initial;
  const listeners = new Set<() => void>();
  const change = (next: number | null) => {
    if (next === value) return;
    value = next;
    for (const listener of [...listeners]) listener();
  };
  return {
    remaining: () => value,
    set: (next) => {
      if (next !== null && !(Number.isInteger(next) && next >= 0)) return;
      change(next);
    },
    consume: () => {
      if (value !== null && value > 0) change(value - 1);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
