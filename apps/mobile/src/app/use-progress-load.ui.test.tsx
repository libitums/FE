import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { PROGRESS_LOAD_ROW_DELAY_MS } from "./progress-load";
import type { ProgressLoadPhase } from "./progress-load.contract";
import { useProgressLoad } from "./use-progress-load";

// `ui` 계층: 로딩 줄 지연 타이머 훅 — 저장본 없이 시작했을 때만 1초 뒤 loading으로 올리고, 끝나거나
// 계정이 바뀌거나 언마운트되면 타이머를 지웁니다. 전이표 자체는 unit이 지므로 여기서는 시간과의
// 결합만 봅니다.

type Api = ReturnType<typeof useProgressLoad>;
let api: Api;
let seen: ProgressLoadPhase[] = [];

function Probe() {
  api = useProgressLoad();
  seen.push(api.phase);
  return <view />;
}

beforeEach(() => {
  vi.useFakeTimers();
  seen = [];
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tick = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const call = (fn: () => void): void => {
  act(fn);
};

describe("useProgressLoad", () => {
  test("UP1. 저장본 없이 시작하면 999 ms까지 checking이고 1 ms 뒤 loading이다", () => {
    render(<Probe />);
    expect(PROGRESS_LOAD_ROW_DELAY_MS).toBe(1_000);

    call(() => api.start("none"));
    expect(api.phase).toBe("checking");
    tick(999);
    expect(api.phase).toBe("checking");
    tick(1);
    expect(api.phase).toBe("loading");
  });

  test("UP2. 문턱 전에 loaded가 오면 loading을 거치지 않고 타이머도 남지 않는다", () => {
    render(<Probe />);

    call(() => api.start("none"));
    tick(500);
    call(() => api.settle("loaded"));
    tick(2_000);

    expect(api.phase).toBe("loaded");
    expect(seen).not.toContain("loading");
    expect(vi.getTimerCount()).toBe(0);
  });

  test("UP3. 계정 전환(start 재호출)은 앞 타이머를 지우고 새로 센다", () => {
    render(<Probe />);

    call(() => api.start("none"));
    tick(600);
    call(() => api.start("none"));
    tick(400);
    expect(api.phase).toBe("checking");
    tick(600);
    expect(api.phase).toBe("loading");
  });

  test("UP4. 저장본이 있으면 hydrated이고 타이머가 없다", () => {
    render(<Probe />);

    call(() => api.start("restored"));
    tick(5_000);

    expect(api.phase).toBe("hydrated");
    expect(vi.getTimerCount()).toBe(0);
  });

  test("UP5. 언마운트하면 시작해 둔 1초 타이머가 지워져 시간이 흘러도 타이머 수가 변하지 않는다", () => {
    const view = render(<Probe />);
    call(() => api.start("none"));
    view.unmount();

    // 지워지지 않았다면 이 시간 안에 타이머가 터져 수가 줄어든다. 테스트 렌더러가 남기는 긴
    // 타이머는 이 시간 안에 터지지 않으므로 기준선이 된다.
    const before = vi.getTimerCount();
    tick(PROGRESS_LOAD_ROW_DELAY_MS * 2);

    expect(vi.getTimerCount()).toBe(before);
  });

  test("UP6. failed에서 재시도를 요청하면 retrying, 결과에 따라 failed 또는 loaded다", () => {
    render(<Probe />);
    call(() => api.start("none"));
    call(() => api.settle("failed"));
    expect(api.phase).toBe("failed");

    call(() => api.requestRetry());
    expect(api.phase).toBe("retrying");
    call(() => api.settle("failed"));
    expect(api.phase).toBe("failed");
    call(() => api.requestRetry());
    expect(api.phase).toBe("retrying");
    call(() => api.settle("loaded"));
    expect(api.phase).toBe("loaded");
  });

  test("UP7. 시작과 실패가 한 묶음으로 와도 checking을 거쳐 failed로 한 전이씩 커밋한다", () => {
    render(<Probe />);

    call(() => {
      api.start("none");
      api.settle("failed");
    });

    expect(api.phase).toBe("failed");
    const committed = seen.filter((phase, index) => index === 0 || phase !== seen[index - 1]);
    expect(committed).toEqual(["idle", "checking", "failed"]);
  });
});
