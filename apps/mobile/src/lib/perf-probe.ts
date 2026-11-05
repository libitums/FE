// 측정 장치(ADR-0105 D2) — 측정 빌드(`PUBLIC_PERF_PROBE=1`)에서만 켜져, 50 ms 이상인 동기 작업과 컴포넌트 커밋 수를
// 호스트 `PerfLogModule`(logcat `DuruPerf`)로 남깁니다. 꺼져 있으면 감싼 함수를 그대로 부를 뿐 시간을 재지 않습니다.
// 어떤 실패도 던지지 않습니다 — 측정이 앱을 바꾸면 안 됩니다.

export const LONG_TASK_MS = 50;
/** 커밋 수를 모아 남기는 창입니다. */
export const RENDER_WINDOW_MS = 5000;

export type PerfProbe = {
  measureTask<T>(name: string, fn: () => T): T;
  countRender(name: string): void;
  flushRenders(): void;
};

export function createPerfProbe(deps: {
  readonly enabled: boolean;
  readonly now: () => number;
  readonly log: (line: string) => void;
}): PerfProbe {
  const write = (line: string): void => {
    try {
      deps.log(line);
    } catch {
      // 기록 실패는 삼킨다.
    }
  };
  const renders = new Map<string, number>();
  return {
    measureTask(name, fn) {
      if (!deps.enabled) return fn();
      const started = deps.now();
      try {
        return fn();
      } finally {
        const elapsed = deps.now() - started;
        if (elapsed >= LONG_TASK_MS) write(`long name=${name} ms=${String(Math.round(elapsed))}`);
      }
    },
    countRender(name) {
      if (!deps.enabled) return;
      renders.set(name, (renders.get(name) ?? 0) + 1);
    },
    flushRenders() {
      if (!deps.enabled || renders.size === 0) return;
      const parts = [...renders.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([name, count]) => `${name}=${String(count)}`);
      renders.clear();
      write(`renders ${parts.join(" ")}`);
    },
  };
}

type PerfLogModule = { log(line: string): void };

function hostModule(): PerfLogModule | undefined {
  if (typeof NativeModules === "undefined") return undefined;
  const module = (NativeModules as Record<string, unknown>)["PerfLogModule"] as
    | PerfLogModule
    | undefined;
  return typeof module?.log === "function" ? module : undefined;
}

// 빌드가 주입한 값을 리터럴 접근으로 읽습니다(번들 치환 — `content-bucket.ts`와 같은 근거).
const probeEnabled = (): boolean =>
  import.meta.env.PUBLIC_PERF_PROBE === "1" && hostModule() !== undefined;

let shared: PerfProbe | null = null;
let windowTimer: ReturnType<typeof setInterval> | null = null;

/** 앱 전체가 쓰는 측정 장치입니다. 처음 부를 때 켜짐을 정하고, 켜져 있으면 커밋 수 창을 돌립니다. */
export function perfProbe(): PerfProbe {
  if (shared !== null) return shared;
  const enabled = probeEnabled();
  shared = createPerfProbe({
    enabled,
    now: () => Date.now(),
    log: (line) => hostModule()?.log(line),
  });
  if (enabled && windowTimer === null) {
    windowTimer = setInterval(() => shared?.flushRenders(), RENDER_WINDOW_MS);
  }
  return shared;
}

/** 줄여 쓰는 이름입니다 — `perfProbe().measureTask`. */
export function measureTask<T>(name: string, fn: () => T): T {
  return perfProbe().measureTask(name, fn);
}
