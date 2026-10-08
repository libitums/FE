import { describe, expect, it } from "vitest";

import { defaultBackDecision } from "./back-decision";
import type { BackDecision } from "./back-decision";
import { navReducer, tabRootActions } from "./nav-reducer";
import { entryInitialNav, initialNav, signedOutNav } from "./nav-state";
import type { Nav, Screen } from "./nav-state";

// 등록된 핸들러가 없을 때의 기본 동작만 봅니다. 순수 함수라 Nav 값만 넘깁니다.

const journeyWithNotifications: Screen[] = [{ name: "journey-map" }, { name: "notifications" }];

function foldActions(nav: Nav, decision: BackDecision): Nav {
  if (decision.kind !== "navigate") {
    throw new Error(`navigate가 아니라 ${decision.kind}입니다`);
  }
  return decision.actions.reduce(navReducer, nav);
}

describe("defaultBackDecision", () => {
  it("BD1. 스플래시는 leave다", () => {
    expect(defaultBackDecision(entryInitialNav)).toEqual({ kind: "leave" });
  });

  it("BD2. 진입 구간 [온보딩, 로그인]은 leave다 — 기본값이 화면을 옮기지 않는다", () => {
    expect(defaultBackDecision(signedOutNav)).toEqual({ kind: "leave" });
  });

  it("BD3. 여정 루트는 leave다", () => {
    expect(defaultBackDecision(initialNav)).toEqual({ kind: "leave" });
  });

  it("BD4. 롤플레이 탭 루트는 여정 탭 루트로 가는 navigate다", () => {
    const nav: Nav = {
      ...initialNav,
      tab: "roleplay",
      stacks: { ...initialNav.stacks, journey: journeyWithNotifications },
    };
    const decision = defaultBackDecision(nav);
    expect(decision).toEqual({ kind: "navigate", actions: tabRootActions("journey") });
    const folded = foldActions(nav, decision);
    expect(folded.tab).toBe("journey");
    expect(folded.stacks.journey).toEqual([{ name: "journey-map" }]);
  });

  it("BD5. 설정 탭 루트는 여정 탭 루트로 가는 navigate다", () => {
    const nav: Nav = {
      ...initialNav,
      tab: "settings",
      stacks: { ...initialNav.stacks, journey: journeyWithNotifications },
    };
    const decision = defaultBackDecision(nav);
    expect(decision).toEqual({ kind: "navigate", actions: tabRootActions("journey") });
    const folded = foldActions(nav, decision);
    expect(folded.tab).toBe("journey");
    expect(folded.stacks.journey).toEqual([{ name: "journey-map" }]);
  });

  it("BD6. 여정 스택 [맵, 알림]은 leave다", () => {
    const nav: Nav = {
      ...initialNav,
      stacks: { ...initialNav.stacks, journey: journeyWithNotifications },
    };
    expect(defaultBackDecision(nav)).toEqual({ kind: "leave" });
  });

  it("BD7. 설정 탭 스택 [설정, 프로필]은 leave다(navigate가 아니다)", () => {
    const nav: Nav = {
      ...initialNav,
      tab: "settings",
      stacks: { ...initialNav.stacks, settings: [{ name: "settings" }, { name: "profile" }] },
    };
    expect(defaultBackDecision(nav)).toEqual({ kind: "leave" });
  });
});
