import { afterEach, describe, expect, it, vi } from "vitest";

import { pauseAudio, playAudio, resumeAudio, slowPlaybackSupport, stopAudio } from "./audio";
import { SLOW_PLAYBACK_RATE } from "./listen-pace";

// 재생 접점의 속도 갈래입니다. 호스트 경계(`NativeModules.AudioPlaybackModule`)만 대역이고,
// `done`을 붙잡아 두어 늦게 온 콜백을 손으로 일으킵니다.

type Done = (result: unknown) => void;
type Host = {
  play: ReturnType<typeof vi.fn<(source: string, done: Done) => void>>;
  playAtRate: ReturnType<typeof vi.fn<(source: string, rate: number, done: Done) => void>>;
  stop: ReturnType<typeof vi.fn<() => void>>;
  pause: ReturnType<typeof vi.fn<() => void>>;
  resume: ReturnType<typeof vi.fn<() => void>>;
};

function newHost(): Host {
  return {
    play: vi.fn<(source: string, done: Done) => void>(),
    playAtRate: vi.fn<(source: string, rate: number, done: Done) => void>(),
    stop: vi.fn<() => void>(),
    pause: vi.fn<() => void>(),
    resume: vi.fn<() => void>(),
  };
}

function stubModern(): Host {
  const host = newHost();
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: host });
  return host;
}

/** 옛 호스트 — 대역에서 `playAtRate` 키를 뺀 것입니다. */
function stubLegacy(): Pick<Host, "play" | "stop" | "pause" | "resume"> {
  const { playAtRate: _omitted, ...legacy } = newHost();
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: legacy });
  return legacy;
}

const doneAt = (calls: readonly unknown[][], index: number): Done => {
  const call = calls[index];
  const done = call?.[call.length - 1];
  if (typeof done !== "function") throw new Error(`호출 ${index}번에 완료 콜백이 없다`);
  return done as Done;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("playAudio — 속도 갈래", () => {
  it("AR1. 속도가 없거나 1이면 play가 인자 정확히 둘로 불리고 playAtRate는 부르지 않는다", () => {
    const host = stubModern();

    expect(playAudio("greeting-1", vi.fn<() => void>())).toBe("started");
    expect(playAudio("greeting-1", vi.fn<() => void>(), 1)).toBe("started");

    expect(host.play).toHaveBeenCalledTimes(2);
    for (const call of host.play.mock.calls) {
      expect(call).toHaveLength(2);
      expect(call[0]).toBe("greeting-1");
      expect(typeof call[1]).toBe("function");
    }
    expect(host.playAtRate).not.toHaveBeenCalled();
  });

  it("AR2. 0.85이고 playAtRate가 있으면 playAtRate(source, 0.85, 함수) 한 번이고 play는 0회다", () => {
    const host = stubModern();

    const outcome = playAudio("greeting-1", vi.fn<() => void>(), SLOW_PLAYBACK_RATE);

    expect(outcome).toBe("started");
    expect(host.playAtRate).toHaveBeenCalledTimes(1);
    expect(host.playAtRate).toHaveBeenCalledWith("greeting-1", 0.85, expect.any(Function));
    expect(host.play).not.toHaveBeenCalled();
  });

  it("AR3. 0.85인데 옛 호스트(playAtRate 없음)면 play가 인자 둘로 불리고 started다", () => {
    const host = stubLegacy();

    const outcome = playAudio("greeting-1", vi.fn<() => void>(), SLOW_PLAYBACK_RATE);

    expect(outcome).toBe("started");
    expect(host.play).toHaveBeenCalledTimes(1);
    expect(host.play.mock.calls[0]).toHaveLength(2);
    expect(host.play.mock.calls[0]?.[0]).toBe("greeting-1");
  });

  it("AR4. 0.85 재생 뒤 stopAudio를 하면 그 뒤 온 done은 onFinished를 부르지 않는다", () => {
    const host = stubModern();
    const onFinished = vi.fn<() => void>();
    playAudio("greeting-1", onFinished, SLOW_PLAYBACK_RATE);

    stopAudio();
    doneAt(host.playAtRate.mock.calls, 0)({});

    expect(host.stop).toHaveBeenCalledTimes(1);
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("AR5. 0.85 done이 두 번 와도 onFinished는 한 번이다", () => {
    const host = stubModern();
    const onFinished = vi.fn<() => void>();
    playAudio("greeting-1", onFinished, SLOW_PLAYBACK_RATE);
    const done = doneAt(host.playAtRate.mock.calls, 0);

    done({});
    done({});

    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("AR6. 0.85 재생을 1.0 재생이 대체하면 앞 done은 무시되고 뒤 done은 한 번 올라간다", () => {
    const host = stubModern();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    playAudio("greeting-1", first, SLOW_PLAYBACK_RATE);
    playAudio("greeting-2", second, 1);

    doneAt(host.playAtRate.mock.calls, 0)({});
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    doneAt(host.play.mock.calls, 0)({});
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("AR7. 모듈이 없으면 0.85도 unavailable이고 onFinished를 부르지 않는다", () => {
    vi.stubGlobal("NativeModules", {});
    const onFinished = vi.fn<() => void>();

    expect(playAudio("greeting-1", onFinished, SLOW_PLAYBACK_RATE)).toBe("unavailable");
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("AR7. 모듈이 없을 때 어떤 호스트 메서드도 부르지 않는다", () => {
    const host = newHost();
    vi.stubGlobal("NativeModules", { Other: host });

    playAudio("greeting-1", vi.fn<() => void>(), SLOW_PLAYBACK_RATE);

    for (const method of Object.values(host)) expect(method).not.toHaveBeenCalled();
  });

  it("AR9. 0.85 재생 중 pause와 resume을 지나도 done 한 번에 onFinished가 한 번 올라간다", () => {
    const host = stubModern();
    const onFinished = vi.fn<() => void>();
    playAudio("greeting-1", onFinished, SLOW_PLAYBACK_RATE);

    pauseAudio();
    resumeAudio();
    doneAt(host.playAtRate.mock.calls, 0)({});

    expect(host.pause).toHaveBeenCalledTimes(1);
    expect(host.resume).toHaveBeenCalledTimes(1);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});

describe("slowPlaybackSupport", () => {
  it("AR8. 전역이 없으면 unsupported다", () => {
    expect(slowPlaybackSupport()).toBe("unsupported");
  });

  it.each([
    ["전역이 null", null],
    ["모듈 키 없음", {}],
    ["모듈이 null", { AudioPlaybackModule: null }],
    ["playAtRate 없음", { AudioPlaybackModule: { play: () => {} } }],
    ["playAtRate가 함수 아님", { AudioPlaybackModule: { play: () => {}, playAtRate: 1 } }],
  ])("AR8. %s이면 unsupported다", (_name, value) => {
    vi.stubGlobal("NativeModules", value);

    expect(slowPlaybackSupport()).toBe("unsupported");
  });

  it("AR8. playAtRate가 함수면 supported다", () => {
    stubModern();

    expect(slowPlaybackSupport()).toBe("supported");
  });
});
