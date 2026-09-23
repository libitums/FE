import { afterEach, describe, expect, it, vi } from "vitest";

import { announce, announceCompletion, isAnnouncementAvailable } from "./accessibility";

// DOM·컴포넌트를 import하지 않습니다 — 호스트 경계를 감싼 접점 하나만 봅니다.
// 그래서 toHaveClass·toHaveStyle 같은 매처가 한 줄도 없습니다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4). 형태의
// 정본은 ../../lib/audio.unit.test.ts입니다 — 타이핑은 storage.ts·audio.ts의 지역
// 인터페이스 + 캐스팅 형태를 그대로 따릅니다.

// 대역이 넘어온 인자를 그대로 붙잡아 둡니다 — 네이티브 selector가 인자 둘
// (`accessibilityAnnounce:callback:`)을 요구하므로, 몇 개가 왔는지·순서가 무엇인지를
// 테스트가 직접 확인해야 합니다.
type HostCall = { args: readonly unknown[] };

function stubHost(): HostCall[] {
  const calls: HostCall[] = [];
  const mod = {
    accessibilityAnnounce: (...args: readonly unknown[]) => void calls.push({ args }),
  };
  vi.stubGlobal("NativeModules", { LynxAccessibilityModule: mod });
  return calls;
}

function stubCompletionHost(): { builtinCalls: HostCall[]; completionCalls: HostCall[] } {
  const builtinCalls: HostCall[] = [];
  const completionCalls: HostCall[] = [];
  const builtin = {
    accessibilityAnnounce: (...args: readonly unknown[]) => void builtinCalls.push({ args }),
  };
  const completion = {
    announce: (...args: readonly unknown[]) => void completionCalls.push({ args }),
  };
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: builtin,
    CompletionAnnouncementModule: completion,
  });
  return { builtinCalls, completionCalls };
}

// 전역 대역을 테스트마다 원상복구합니다. 이 파일은 없던 전역(NativeModules)을
// 세우므로, 지우지 않으면 다른 테스트 파일로 샙니다(audio.unit.test.ts와 같은 규율).
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isAnnouncementAvailable", () => {
  // 호스트에 이 모듈이 있는가로 갈립니다. 없으면 false이고 부수효과가 없습니다.
  it("호스트에 모듈이 있으면 true다", () => {
    stubHost();

    expect(isAnnouncementAvailable()).toBe(true);
  });

  it("전역은 있는데 모듈만 없으면 false다", () => {
    vi.stubGlobal("NativeModules", {});

    expect(isAnnouncementAvailable()).toBe(false);
  });

  // registerModule이 이 프레임에서 아직 안 끝났을 때 관찰되는 값입니다
  // (LynxTemplateRenderHelper.mm:494가 조건 없이 등록하지만, 그 완료 시점까지
  // 이 파일의 캐스팅이 책임지지 않습니다) — `undefined`가 아니라 `null`입니다.
  // `nativeModule()`의 반환 타입 `LynxAccessibilityModule | undefined`가 이 값을
  // 감추므로, 캐스팅만 믿으면 이 축이 조용히 새나갑니다.
  it("모듈 값이 null이면 false다", () => {
    vi.stubGlobal("NativeModules", { LynxAccessibilityModule: null });

    expect(isAnnouncementAvailable()).toBe(false);
  });

  // ui·integration 환경에는 NativeModules 전역이 아예 없습니다. typeof 가드가
  // 없으면 맨 식별자 접근에서 ReferenceError가 납니다.
  it("전역 자체가 없어도 false이고 던지지 않는다", () => {
    expect(() => isAnnouncementAvailable()).not.toThrow();
    expect(isAnnouncementAvailable()).toBe(false);
  });
});

describe("announce — 모듈이 있을 때", () => {
  // 아래 「모듈이 없을 때」와 대칭인 경로입니다.
  it("announced를 돌려주고 던지지 않는다", () => {
    stubHost();

    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("announced");
  });

  // 인자를 둘 넘깁니다 — {content}와 콜백. 콜백을 쓰지 않아도 생략하지 않습니다.
  // 하나만 넘기면 브리지가 첫 인자를 context로 읽는 경로로 빠집니다.
  it("네이티브 accessibilityAnnounce에 인자 둘을 넘긴다", () => {
    const calls = stubHost();

    announce("평가 결과, 통과");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.args).toHaveLength(2);
  });

  it("첫 인자가 {content: 넘긴 문자열} 형태다", () => {
    const calls = stubHost();

    announce("평가 결과, 미통과");

    expect(calls[0]?.args[0]).toEqual({ content: "평가 결과, 미통과" });
  });

  it("둘째 인자가 함수다 — 콜백을 생략하지 않는다", () => {
    const calls = stubHost();

    announce("평가 결과, 통과");

    expect(typeof calls[0]?.args[1]).toBe("function");
  });

  it("네이티브를 한 번만 부른다", () => {
    const calls = stubHost();

    announce("평가 결과, 통과");

    expect(calls).toHaveLength(1);
  });
});

// 모듈이 없으면 unavailable을 돌려주고 던지지 않습니다 — 낭독이 안 되는 것이
// 화면을 죽이는 이유가 될 수 없습니다.
describe("announce — 모듈이 없을 때 (전역은 있고 모듈만 없다)", () => {
  it("unavailable을 돌려주고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", {});

    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("unavailable");
  });
});

// 「전역 없음·전역만 있음·모듈 있음」 셋의 마지막 축입니다. 개발 환경에는 이 전역
// 자체가 없습니다 — 전역을 세우지 않습니다.
describe("announce — 전역 자체가 없을 때 (typeof 가드)", () => {
  it("unavailable을 돌려주고 던지지 않는다", () => {
    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("unavailable");
  });

  it("isAnnouncementAvailable도 false다", () => {
    expect(isAnnouncementAvailable()).toBe(false);
  });
});

// `typeof NativeModules === "undefined"` 가드는 전역이 **없을 때**만 막습니다.
// `typeof null`은 `"object"`라 전역 자체가 `null`이면 이 가드를 통과하고, 다음 줄
// `(NativeModules as Record<string, unknown>)["…"]`의 색인 접근에서 TypeError가
// 납니다 — `audio.ts`·`storage.ts`와 같은 자리, 같은 모양입니다. 「전역은 있는데
// 모듈만 없음」·「전역 자체가 없음(typeof 가드)」 두 축과 대칭인 셋째 축입니다.
//
// 이 축의 가드 자체는 코드로 관측되지만, 전역이 실제로 `null`로 세팅되는 경로가
// 관찰됐는지는 별개입니다 — 근거의 종류는 `accessibility.ts`의 `nativeModule()` 위
// 주석을 참고합니다.
describe("announce — 전역 자체가 null일 때 (typeof 가드의 사각)", () => {
  it("isAnnouncementAvailable이 false다", () => {
    vi.stubGlobal("NativeModules", null);

    expect(isAnnouncementAvailable()).toBe(false);
  });

  it("unavailable을 돌려주고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", null);

    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("unavailable");
  });
});

// 모듈이 없으면 조용히 아무 일도 하지 않아야 합니다 — 던지지 않습니다(ADR-0016 D11
// 규칙 4). `null`이 그 규칙의 구멍이었습니다. 전에는 `host === undefined` 가드가
// `host`가 `null`일 때 거짓이 되어 `host.accessibilityAnnounce(...)`에서
// TypeError가 났습니다 — 그 경로는 `AssessmentScreen.tsx:62`·
// `SentenceOrderScreen.tsx:83`의 `useEffect` 안이었고 try/catch가 없어 에러가
// ErrorBoundary까지 올라가 화면이 에러 상태로 바뀌었습니다. 지금은
// `accessibility.ts`의 `?? undefined` 줄이 `null`을 `undefined`로 정규화해 막습니다.
describe("announce — 모듈 값이 null일 때", () => {
  it("unavailable을 돌려주고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", { LynxAccessibilityModule: null });

    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("unavailable");
  });
});

describe("announceCompletion — 완료 전용 모듈 경계", () => {
  // 완료 발화는 custom 모듈만 선택하고 builtin 경로로 중복 발화하지 않습니다.
  it("custom 모듈에 원문과 콜백을 정확히 한 번 전달한다", () => {
    const { builtinCalls, completionCalls } = stubCompletionHost();
    const content = "문항을 모두 마쳤어요, 결과 보기";

    expect(announceCompletion(content)).toBe("announced");

    expect(completionCalls).toHaveLength(1);
    expect(completionCalls[0]?.args).toHaveLength(2);
    expect(completionCalls[0]?.args[0]).toEqual({ content });
    expect(typeof completionCalls[0]?.args[1]).toBe("function");
    expect(builtinCalls).toHaveLength(0);
  });

  it.each([
    ["모듈이 없을 때", undefined],
    ["모듈이 null일 때", null],
  ])("%s에는 기존 builtin announce로 정확히 한 번 fallback한다", (_label, completion) => {
    const builtinCalls: HostCall[] = [];
    vi.stubGlobal("NativeModules", {
      LynxAccessibilityModule: {
        accessibilityAnnounce: (...args: readonly unknown[]) => void builtinCalls.push({ args }),
      },
      CompletionAnnouncementModule: completion,
    });

    expect(announceCompletion("완료 안내")).toBe("announced");
    expect(builtinCalls).toHaveLength(1);
    expect(builtinCalls[0]?.args[0]).toEqual({ content: "완료 안내" });
  });

  it("NativeModules 전역이 없으면 기존 unavailable fallback을 유지한다", () => {
    expect(announceCompletion("완료 안내")).toBe("unavailable");
  });

  it("NativeModules 전역이 null이면 기존 unavailable fallback을 유지한다", () => {
    vi.stubGlobal("NativeModules", null);

    expect(announceCompletion("완료 안내")).toBe("unavailable");
  });

  it("일반 announce는 custom 모듈이 있어도 builtin만 한 번 사용한다", () => {
    const { builtinCalls, completionCalls } = stubCompletionHost();

    expect(announce("평가 결과, 통과")).toBe("announced");

    expect(builtinCalls).toHaveLength(1);
    expect(completionCalls).toHaveLength(0);
  });
});
