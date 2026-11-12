// 무료 수 원장입니다(messenger-chat-1-5 spec §5.3). 저장 · 시계는 주입. 읽기 · 쓰기 실패는 삼키고 메모리로 계속합니다.

import {
  FREE_TURNS_PER_DAY,
  dayKeyOf,
  recordFreeSend,
  recordOutPanelShown,
  turnUsageOf,
  type TurnRecord,
  type TurnUsage,
} from "./free-turns";

export type TurnRecordStore = {
  readonly read: () => TurnRecord | null;
  readonly write: (record: TurnRecord) => void;
};
export type TurnLedger = {
  /** 같은 날 · 같은 값이면 같은 참조. */
  readonly usage: () => TurnUsage;
  readonly recordFreeSend: () => void;
  readonly recordOutPanelShown: () => void;
  readonly subscribe: (listener: () => void) => () => void;
};

export function createTurnLedger(options: {
  readonly store: TurnRecordStore;
  readonly now: () => number;
  readonly perDay?: number;
}): TurnLedger {
  const { store, now, perDay = FREE_TURNS_PER_DAY } = options;
  const listeners = new Set<() => void>();
  let record: TurnRecord | null = null;
  let loaded = false;
  let cached: TurnUsage | null = null;

  const load = (): TurnRecord | null => {
    if (!loaded) {
      loaded = true;
      try {
        record = store.read();
      } catch {
        record = null;
      }
    }
    return record;
  };
  const usage = (): TurnUsage => {
    const next = turnUsageOf(load(), dayKeyOf(now()), perDay);
    if (
      cached !== null &&
      cached.day === next.day &&
      cached.used === next.used &&
      cached.remaining === next.remaining &&
      cached.outPanel === next.outPanel
    ) {
      return cached;
    }
    cached = next;
    return next;
  };
  const commit = (next: TurnRecord): void => {
    load();
    record = next;
    try {
      store.write(next);
    } catch {
      // 이번 실행만 메모리로 센다.
    }
    for (const listener of [...listeners]) listener();
  };

  return {
    usage,
    recordFreeSend: () => {
      commit(recordFreeSend(load(), dayKeyOf(now())));
    },
    recordOutPanelShown: () => {
      commit(recordOutPanelShown(load(), dayKeyOf(now())));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function memoryTurnRecordStore(initial: TurnRecord | null = null): TurnRecordStore {
  let record = initial;
  return {
    read: () => record,
    write: (next) => {
      record = next;
    },
  };
}
