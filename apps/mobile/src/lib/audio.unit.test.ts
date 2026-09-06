import { afterEach, describe, expect, it, vi } from "vitest";

import { isAudioAvailable, playAudio, stopAudio } from "./audio";

// 계약: .agent-harness/work/lib-223/spec.md §9.3 (JS 접점의 규칙 여섯) · §9.9(a) (케이스 표)
// ADR: docs/adr/0017-host-native-capabilities-and-audio.md D3
// 형태의 정본: ./storage.unit.test.ts
//
// DOM·컴포넌트를 import하지 않는다 — 호스트 경계를 감싼 접점 하나만 본다.
// 그래서 toHaveClass·toHaveStyle·toBeVisible 같은 매처가 한 줄도 없다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).

// ---------------------------------------------------------------- 대역 (계약 §9.9(a))
//
// 대역이 `done`을 **붙잡아 둔다.** 그래야 "늦게 온 콜백"을 테스트가 직접 손으로
// 일으킬 수 있다 — 자동으로 부르는 대역을 쓰면 세대 가드가 검증되지 않는다.
//
// `play`와 `stop`을 **한 배열에** 적는다. 둘의 상대 순서가 계약이기 때문이다
// (`stopAudio`가 대기 중인 `onFinished`를 무효화한다, 계약 §9.3-4).
// `stop` 호출은 `source: "<stop>"` 로 표시한다 — 실제 `audioSource`에는 `<`·`>`가
// 없으므로(계약 §9.4의 불변식) 이 표식이 실제 source와 겹치지 않는다.

const STOP = "<stop>";

type HostCall = { source: string; done: (result: unknown) => void };

function stubHost(): HostCall[] {
  const calls: HostCall[] = [];
  const mod = {
    play: (source: string, done: (result: unknown) => void) => void calls.push({ source, done }),
    stop: () => void calls.push({ source: STOP, done: () => {} }),
  };
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: mod });
  return calls;
}

const playSources = (calls: readonly HostCall[]): string[] =>
  calls.filter((call) => call.source !== STOP).map((call) => call.source);

const stopCount = (calls: readonly HostCall[]): number =>
  calls.filter((call) => call.source === STOP).length;

// 붙잡아 둔 완료 콜백. `at`은 `calls` 배열에서의 자리다.
const doneOf = (calls: readonly HostCall[], at: number): ((result: unknown) => void) => {
  const call = calls[at];
  if (call === undefined) {
    throw new Error(`네이티브 호출 ${at}번이 없다 — 대역이 붙잡은 것: ${calls.length}건`);
  }
  return call.done;
};

// 전역 대역을 **테스트마다 원상복구한다.** 이 파일은 없던 전역(`NativeModules`)을
// 세우므로, 지우지 않으면 다른 테스트 파일로 샌다.
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isAudioAvailable", () => {
  // 계약 §9.3 표: 호스트에 이 모듈이 있는가. 없으면 false이고 부수효과가 없다.
  it("호스트에 모듈이 있으면 true다", () => {
    stubHost();

    expect(isAudioAvailable()).toBe(true);
  });

  it("전역은 있는데 모듈만 없으면 false다", () => {
    vi.stubGlobal("NativeModules", {});

    expect(isAudioAvailable()).toBe(false);
  });

  // 계약 §9.3-2: 테스트 환경에는 `NativeModules` 전역이 **아예 없다**.
  // 맨 식별자 접근이면 여기서 ReferenceError가 난다.
  it("전역 자체가 없어도 false이고 던지지 않는다", () => {
    expect(() => isAudioAvailable()).not.toThrow();
    expect(isAudioAvailable()).toBe(false);
  });

  // registerModule이 이 프레임에서 아직 안 끝났을 때 관찰되는 값이다 — `undefined`가
  // 아니라 `null`이다. `nativeModule()`의 반환 타입 `AudioPlaybackModule | undefined`가
  // 이 값을 감추므로, 캐스팅만 믿으면 이 축이 조용히 새나간다.
  it("모듈 값이 null이면 false다", () => {
    vi.stubGlobal("NativeModules", { AudioPlaybackModule: null });

    expect(isAudioAvailable()).toBe(false);
  });
});

describe("playAudio — 모듈이 있을 때", () => {
  // 계약 §9.9(a) 첫 줄: 네이티브 play가 "ordering-1"으로 한 번 · 반환값 "started" ·
  // onDone 아직 안 불림
  it("받은 source 그대로 네이티브 play를 한 번 부르고 started를 돌려준다", () => {
    const calls = stubHost();
    const onDone = vi.fn<() => void>();

    const outcome = playAudio("ordering-1", onDone);

    expect(outcome).toBe("started");
    expect(playSources(calls)).toEqual(["ordering-1"]);
    expect(onDone).not.toHaveBeenCalled();
  });

  // 계약 §9.3 표: playAudio의 부수효과는 네이티브 호출과 세대 갱신이다.
  // 멈추는 것은 부른 자리의 몫이고(§9.6), playAudio가 스스로 stop을 부르지 않는다 —
  // 부르면 §9.9(a)의 "stop이 한 번" 케이스가 둘이 된다.
  it("네이티브 stop을 부르지 않는다", () => {
    const calls = stubHost();

    playAudio("greeting-1", vi.fn<() => void>());

    expect(stopCount(calls)).toBe(0);
  });

  // 계약 §9.3-3: play의 콜백은 언제나 넘긴다 — 네이티브 시그니처가 둘째 인자를 요구한다.
  it("네이티브에 완료 콜백을 함께 넘긴다", () => {
    const calls = stubHost();

    playAudio("greeting-1", vi.fn<() => void>());

    expect(typeof doneOf(calls, 0)).toBe("function");
  });

  it("붙잡은 done을 부르면 onFinished가 한 번 올라간다", () => {
    const calls = stubHost();
    const onDone = vi.fn<() => void>();
    playAudio("ordering-1", onDone);

    doneOf(calls, 0)(null);

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  // 계약 §9.3-5: 같은 콜백이 두 번 도착해도 onFinished는 한 번만 올라간다.
  // 네이티브가 한 번만 부른다고 정했지만(§9.2) 그것을 **믿지 않고** 한 번 더 막는다.
  it("같은 done이 두 번 와도 onFinished는 여전히 한 번이다", () => {
    const calls = stubHost();
    const onDone = vi.fn<() => void>();
    playAudio("ordering-1", onDone);
    const done = doneOf(calls, 0);

    done(null);
    done(null);

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("다시 부르면 새 source로 네이티브 play가 한 번 더 불린다 — 다시듣기는 play다", () => {
    const calls = stubHost();

    playAudio("ordering-1", vi.fn<() => void>());
    playAudio("ordering-2", vi.fn<() => void>());

    expect(playSources(calls)).toEqual(["ordering-1", "ordering-2"]);
  });

  it("같은 source로 다시 불러도 처음부터 다시 넘긴다 — 두 번째 호출이 무시되지 않는다", () => {
    const calls = stubHost();

    expect(playAudio("ordering-1", vi.fn<() => void>())).toBe("started");
    expect(playAudio("ordering-1", vi.fn<() => void>())).toBe("started");
    expect(playSources(calls)).toEqual(["ordering-1", "ordering-1"]);
  });
});

// 계약 §9.3-4 · §9.7 「늦게 온 완료 신호가 지금 재생을 끝내지 않는다」.
// 문항이 빠르게 넘어갈 때 이전 문항의 완료 신호가 도착해 **지금 재생 중인 것을
// 「끝났다」로 만드는 것**이 이 가드가 막는 것이다.
describe("playAudio — 세대 가드", () => {
  it("늦게 온 이전 재생의 done은 버려진다", () => {
    const calls = stubHost();
    const doneA = vi.fn<() => void>();
    const doneB = vi.fn<() => void>();
    playAudio("ordering-1", doneA);
    playAudio("ordering-2", doneB);

    doneOf(calls, 0)(null);

    expect(doneA).not.toHaveBeenCalled();
    expect(doneB).not.toHaveBeenCalled();
  });

  it("버려진 뒤에도 지금 재생의 done은 그대로 살아 있다", () => {
    const calls = stubHost();
    const doneA = vi.fn<() => void>();
    const doneB = vi.fn<() => void>();
    playAudio("ordering-1", doneA);
    playAudio("ordering-2", doneB);
    doneOf(calls, 0)(null);

    doneOf(calls, 1)(null);

    expect(doneB).toHaveBeenCalledTimes(1);
    expect(doneA).not.toHaveBeenCalled();
  });

  it("늦게 온 것이 여러 번 와도 지금 재생을 끝내지 않는다", () => {
    const calls = stubHost();
    const doneA = vi.fn<() => void>();
    const doneB = vi.fn<() => void>();
    playAudio("ordering-1", doneA);
    playAudio("ordering-2", doneB);
    const staleDone = doneOf(calls, 0);

    staleDone(null);
    staleDone(null);

    expect(doneA).not.toHaveBeenCalled();
    expect(doneB).not.toHaveBeenCalled();
  });
});

describe("stopAudio — 모듈이 있을 때", () => {
  // 계약 §9.9(a): 네이티브 stop이 한 번 · doneA가 불리지 않는다
  it("네이티브 stop을 한 번 부르고, 그 뒤 늦게 온 done을 무효화한다", () => {
    const calls = stubHost();
    const doneA = vi.fn<() => void>();
    playAudio("ordering-1", doneA);

    stopAudio();
    doneOf(calls, 0)(null);

    expect(stopCount(calls)).toBe(1);
    expect(doneA).not.toHaveBeenCalled();
  });

  // 계약 §9.3-6 · §9.6: 멈춘 것과 끝난 것은 다르다. 멈춘 쪽은 부른 자리가 이미 안다.
  it("onFinished를 부르지 않는다", () => {
    stubHost();
    const doneA = vi.fn<() => void>();
    playAudio("ordering-1", doneA);

    stopAudio();

    expect(doneA).not.toHaveBeenCalled();
  });

  it("재생 없이 불러도 네이티브 stop이 불리고 던지지 않는다", () => {
    const calls = stubHost();

    expect(() => stopAudio()).not.toThrow();
    expect(stopCount(calls)).toBe(1);
  });

  it("멈춘 뒤 다시 재생하면 그 재생의 done은 정상으로 올라간다", () => {
    const calls = stubHost();
    const doneA = vi.fn<() => void>();
    const doneB = vi.fn<() => void>();
    playAudio("ordering-1", doneA);
    stopAudio();

    playAudio("ordering-2", doneB);
    doneOf(calls, 2)(null);

    expect(doneB).toHaveBeenCalledTimes(1);
    expect(doneA).not.toHaveBeenCalled();
  });
});

// 계약 §9.3-1 · §9.7 「모듈이 없을 때 던지지 않고 조용하다」.
// Explorer에 이 모듈이 없고(ADR-0012 D3) 테스트 환경에도 없다 — 없을 때 조용히
// 재생하지 않는 것이 **정상 동작**이다 (ADR-0017 D3).
describe("모듈이 없을 때 — 전역은 있고 모듈만 없다", () => {
  it("playAudio가 unavailable을 돌려주고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", {});

    expect(() => playAudio("ordering-1", vi.fn<() => void>())).not.toThrow();
    expect(playAudio("ordering-1", vi.fn<() => void>())).toBe("unavailable");
  });

  it("playAudio가 onFinished를 부르지 않는다 — 조용히 아무 일도 하지 않는다", () => {
    vi.stubGlobal("NativeModules", {});
    const onDone = vi.fn<() => void>();

    playAudio("ordering-1", onDone);

    expect(onDone).not.toHaveBeenCalled();
  });

  it("stopAudio가 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", {});

    expect(() => stopAudio()).not.toThrow();
  });
});

// ADR-0016 D11 규칙 4: 모듈이 없으면 조용히 아무 일도 하지 않는다 — 던지지 않는다.
// `null`이 그 규칙의 구멍이었다. LIB-237 전에는 `host === undefined` 가드가 `host`가
// `null`일 때 거짓이 되어 `host.play(...)` · `host.stop()`에서 TypeError가 났다. 지금은
// `audio.ts:61`의 `?? undefined`가 `null`을 `undefined`로 정규화해 막는다.
describe("모듈 값이 null일 때", () => {
  it("playAudio가 unavailable을 돌려주고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", { AudioPlaybackModule: null });

    expect(() => playAudio("ordering-1", vi.fn<() => void>())).not.toThrow();
    expect(playAudio("ordering-1", vi.fn<() => void>())).toBe("unavailable");
  });

  it("playAudio가 onFinished를 부르지 않는다 — 조용히 아무 일도 하지 않는다", () => {
    vi.stubGlobal("NativeModules", { AudioPlaybackModule: null });
    const onDone = vi.fn<() => void>();

    playAudio("ordering-1", onDone);

    expect(onDone).not.toHaveBeenCalled();
  });

  it("stopAudio가 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", { AudioPlaybackModule: null });

    expect(() => stopAudio()).not.toThrow();
  });
});

// 계약 §9.3-2 · §9.9(a) 마지막 줄: `storage.unit.test.ts`·`accessibility.unit.test.ts`·
// 이 파일 셋 모두가 각자 같은 축을 갖는다 — 전역 자체가 없을 때(`typeof` 가드)의
// 케이스다. 셋이 같은 형태이므로(storage.ts·audio.ts·accessibility.ts가 문자 단위로
// 같은 가드를 쓴다) 이 축도 세 파일 모두에 있다 — 이 자리 하나가 유일한 것이 아니다.
//
// 전역을 세우지 않는다. `NativeModules`는 선언 자체가 없으므로 맨 식별자 접근이면
// `ReferenceError: NativeModules is not defined`가 난다.
describe("전역 자체가 없을 때 — typeof 가드", () => {
  it("playAudio가 unavailable을 돌려주고 던지지 않는다", () => {
    expect(() => playAudio("ordering-1", vi.fn<() => void>())).not.toThrow();
    expect(playAudio("ordering-1", vi.fn<() => void>())).toBe("unavailable");
  });

  it("playAudio가 onFinished를 부르지 않는다", () => {
    const onDone = vi.fn<() => void>();

    playAudio("ordering-1", onDone);

    expect(onDone).not.toHaveBeenCalled();
  });

  it("stopAudio가 던지지 않는다", () => {
    expect(() => stopAudio()).not.toThrow();
  });

  it("isAudioAvailable이 false다", () => {
    expect(isAudioAvailable()).toBe(false);
  });
});

// LIB-237 PR #48 리뷰 지적: `typeof NativeModules === "undefined"` 가드는 전역이
// **없을 때**만 막는다. `typeof null`은 `"object"`라 전역 자체가 `null`이면 이
// 가드를 통과하고, 다음 줄 `(NativeModules as Record<string, unknown>)["…"]`의
// 색인 접근에서 TypeError가 난다 — `storage.ts`·`accessibility.ts`와 같은 자리,
// 같은 모양이다. 위 「전역 자체가 없을 때 — typeof 가드」와 대칭인 셋째 축이다.
describe("전역 자체가 null일 때 — typeof 가드의 사각", () => {
  it("playAudio가 unavailable을 돌려주고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", null);

    expect(() => playAudio("ordering-1", vi.fn<() => void>())).not.toThrow();
    expect(playAudio("ordering-1", vi.fn<() => void>())).toBe("unavailable");
  });

  it("playAudio가 onFinished를 부르지 않는다", () => {
    vi.stubGlobal("NativeModules", null);
    const onDone = vi.fn<() => void>();

    playAudio("ordering-1", onDone);

    expect(onDone).not.toHaveBeenCalled();
  });

  it("stopAudio가 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", null);

    expect(() => stopAudio()).not.toThrow();
  });

  it("isAudioAvailable이 false다", () => {
    vi.stubGlobal("NativeModules", null);

    expect(isAudioAvailable()).toBe(false);
  });
});
