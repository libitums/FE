// 길게 누른 키의 반복입니다(ADR-0112). 첫 입력은 하지 않습니다 — 그것은 누름 판정이 합니다.
// 지연 뒤 첫 반복, 이후 일정 간격, 상한에서 스스로 멈춥니다. 끝 이벤트가 오지 않아도 상한이
// 반복을 끝냅니다. 살아 있는 타이머는 언제나 많아야 하나입니다.

export const KEY_REPEAT = { delayMs: 450, intervalMs: 70, maxRepeats: 50 } as const;

export type RepeatTimers = {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

export type KeyRepeater = {
  start(): void;
  stop(): void;
  readonly active: boolean;
};

const globalTimers: RepeatTimers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createKeyRepeater(
  onRepeat: () => void,
  timers: RepeatTimers = globalTimers,
): KeyRepeater {
  let handle: unknown = null;
  let repeats = 0;
  // 반복 콜백 안에서 stop()을 불러도 그 자리에서 끝나도록 따로 듭니다(review W2) — handle은 tick 동안 null입니다.
  let running = false;

  const stop = () => {
    running = false;
    if (handle === null) return;
    timers.clearTimeout(handle);
    handle = null;
  };

  const tick = () => {
    handle = null;
    repeats += 1;
    try {
      onRepeat();
    } catch {
      // 반복 입력이 실패하면 거기서 멈춥니다 — 실패를 되풀이하지 않습니다.
      running = false;
      return;
    }
    if (!running) return;
    if (repeats >= KEY_REPEAT.maxRepeats) {
      running = false;
      return;
    }
    handle = timers.setTimeout(tick, KEY_REPEAT.intervalMs);
  };

  return {
    start() {
      stop();
      repeats = 0;
      running = true;
      handle = timers.setTimeout(tick, KEY_REPEAT.delayMs);
    },
    stop,
    get active() {
      return running;
    },
  };
}
