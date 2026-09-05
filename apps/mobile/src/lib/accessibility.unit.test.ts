import { afterEach, describe, expect, it, vi } from "vitest";

import { announce, isAnnouncementAvailable } from "./accessibility";

// 계약: .agent-harness/work/lib-227/spec.md §3.2 (JS 접점의 규칙 여섯) · §3.4 (unit이 보는 것)
// 형태의 정본: ../../lib/audio.unit.test.ts (계약 §3.2 「타이핑은 storage.ts·audio.ts의
// 지역 인터페이스 + 캐스팅 형태를 그대로 따른다」)
//
// DOM·컴포넌트를 import하지 않는다 — 호스트 경계를 감싼 접점 하나만 본다.
// 그래서 toHaveClass·toHaveStyle 같은 매처가 한 줄도 없다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).

// 대역이 넘어온 인자를 그대로 붙잡아 둔다 — 네이티브 selector가 인자 둘
// (`accessibilityAnnounce:callback:`)을 요구하므로(계약 §3.2 규칙 3), 몇 개가
// 왔는지·순서가 무엇인지를 테스트가 직접 확인해야 한다.
type HostCall = { args: readonly unknown[] };

function stubHost(): HostCall[] {
  const calls: HostCall[] = [];
  const mod = {
    accessibilityAnnounce: (...args: readonly unknown[]) => void calls.push({ args }),
  };
  vi.stubGlobal("NativeModules", { LynxAccessibilityModule: mod });
  return calls;
}

// 전역 대역을 테스트마다 원상복구한다. 이 파일은 없던 전역(NativeModules)을
// 세우므로, 지우지 않으면 다른 테스트 파일로 샌다 (audio.unit.test.ts와 같은 규율).
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isAnnouncementAvailable", () => {
  // 계약 §3.2: 호스트에 이 모듈이 있는가. 없으면 false이고 부수효과가 없다.
  it("호스트에 모듈이 있으면 true다", () => {
    stubHost();

    expect(isAnnouncementAvailable()).toBe(true);
  });

  it("전역은 있는데 모듈만 없으면 false다", () => {
    vi.stubGlobal("NativeModules", {});

    expect(isAnnouncementAvailable()).toBe(false);
  });

  // registerModule이 이 프레임에서 아직 안 끝났을 때 관찰되는 값이다
  // (LynxTemplateRenderHelper.mm:494가 조건 없이 등록하지만, 그 완료 시점까지
  // 이 파일의 캐스팅이 책임지지 않는다) — `undefined`가 아니라 `null`이다.
  // `nativeModule()`의 반환 타입 `LynxAccessibilityModule | undefined`가 이 값을
  // 감추므로, 캐스팅만 믿으면 이 축이 조용히 새나간다.
  it("모듈 값이 null이면 false다", () => {
    vi.stubGlobal("NativeModules", { LynxAccessibilityModule: null });

    expect(isAnnouncementAvailable()).toBe(false);
  });

  // 계약 §3.2 규칙 1: ui·integration 환경에는 NativeModules 전역이 아예 없다.
  // typeof 가드가 없으면 맨 식별자 접근에서 ReferenceError가 난다.
  it("전역 자체가 없어도 false이고 던지지 않는다", () => {
    expect(() => isAnnouncementAvailable()).not.toThrow();
    expect(isAnnouncementAvailable()).toBe(false);
  });
});

describe("announce — 모듈이 있을 때", () => {
  // 계약 §3.2 규칙 5의 반대쪽 — 모듈이 있으면 announced다.
  it("announced를 돌려주고 던지지 않는다", () => {
    stubHost();

    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("announced");
  });

  // 계약 §3.2 규칙 3: 인자를 둘 넘긴다 — {content}와 콜백. 콜백을 쓰지 않아도
  // 생략하지 않는다. 하나만 넘기면 브리지가 첫 인자를 context로 읽는 경로로 빠진다.
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

// 계약 §3.2 규칙 5: 모듈이 없으면 unavailable을 돌려주고 던지지 않는다 —
// 낭독이 안 되는 것이 화면을 죽이는 이유가 될 수 없다.
describe("announce — 모듈이 없을 때 (전역은 있고 모듈만 없다)", () => {
  it("unavailable을 돌려주고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", {});

    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("unavailable");
  });
});

// 계약 §3.2 규칙 1 · §4.1 「전역 없음 · 전역만 있음 · 모듈 있음 셋」의 마지막 축.
// 개발 환경에는 이 전역 자체가 없다 — 전역을 세우지 않는다.
describe("announce — 전역 자체가 없을 때 (typeof 가드)", () => {
  it("unavailable을 돌려주고 던지지 않는다", () => {
    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("unavailable");
  });

  it("isAnnouncementAvailable도 false다", () => {
    expect(isAnnouncementAvailable()).toBe(false);
  });
});

// ADR-0016 D11 규칙 4: 모듈이 없으면 조용히 아무 일도 하지 않는다 — 던지지 않는다.
// **LIB-237 전에는 `null`이 그 규칙의 구멍이었다** — `host === undefined` 가드가
// `host`가 `null`일 때 거짓이 되어 `host.accessibilityAnnounce(...)`에서 TypeError가
// 났다. 그 예외는 `AssessmentScreen`·`SentenceOrderScreen`의 `useEffect` 안에서 나므로
// **try/catch 없이 ErrorBoundary까지 올라가 화면이 에러 상태로 바뀐다.**
// 지금은 `accessibility.ts:36`의 `?? undefined`가 `null`을 정규화해 그 경로가 없다.
describe("announce — 모듈 값이 null일 때", () => {
  it("unavailable을 돌려주고 던지지 않는다", () => {
    vi.stubGlobal("NativeModules", { LynxAccessibilityModule: null });

    expect(() => announce("평가 결과, 통과")).not.toThrow();
    expect(announce("평가 결과, 통과")).toBe("unavailable");
  });
});
