// 받기 정책으로 건너뛴 편이 있을 때, 요금 없는 연결이 될 때까지 간격마다 보고 되면 한 번 알리는 타이머입니다
// (ADR-0095 D5). 호스트 신호는 모바일 데이터 → Wi-Fi 전환에 오지 않아서 둡니다. 타이머는 늘 하나뿐입니다.

export type DeferredRecheck = {
  /** 받기 차례가 끝날 때마다 — 건너뛴 편이 있으면 켜고, 없으면 끕니다. */
  readonly update: (pending: boolean) => void;
  readonly stop: () => void;
};

export type DeferredRecheckDeps = {
  readonly intervalMs: number;
  readonly isUnmetered: () => boolean;
  readonly onUnmetered: () => void;
};

export function createDeferredRecheck(deps: DeferredRecheckDeps): DeferredRecheck {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const unmeteredNow = () => {
    try {
      return deps.isUnmetered();
    } catch {
      return false;
    }
  };
  const tick = () => {
    timer = undefined;
    if (unmeteredNow()) deps.onUnmetered();
    else timer = setTimeout(tick, deps.intervalMs);
  };
  return {
    update: (pending) => {
      stop();
      if (pending) timer = setTimeout(tick, deps.intervalMs);
    },
    stop,
  };
}
