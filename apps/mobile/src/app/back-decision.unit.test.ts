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

  // MC-U27 — 탭 넷의 stacks 리터럴로 직접 만든 Nav. 키가 하나라도 빠지면 이 픽스처가 틀린다.
  const fourStacks: Nav["stacks"] = {
    journey: [{ name: "journey-map" }],
    roleplay: [{ name: "roleplay-list" }],
    messenger: [{ name: "messenger-list" }],
    settings: [{ name: "settings" }],
  };
  const room: Screen = { name: "messenger-chat", roomId: "mina" };

  it("BD8. 메신저 탭 루트는 여정 탭 루트로 가는 navigate다(MC-U27)", () => {
    const nav: Nav = { ...initialNav, tab: "messenger", stacks: fourStacks };
    const decision = defaultBackDecision(nav);

    expect(decision).toEqual({ kind: "navigate", actions: tabRootActions("journey") });
    expect(foldActions(nav, decision).tab).toBe("journey");
  });

  it("BD9. 메신저 방([목록, 방])에서는 기본 동작이 leave고, 화면의 뒤로(back)는 목록이다(MC-U27)", () => {
    const nav: Nav = {
      ...initialNav,
      tab: "messenger",
      stacks: { ...fourStacks, messenger: [{ name: "messenger-list" }, room] },
    };

    expect(defaultBackDecision(nav)).toEqual({ kind: "leave" });
    const back = navReducer(nav, { type: "back" });
    expect(back.stacks.messenger).toEqual([{ name: "messenger-list" }]);
  });

  it("BD10. initialNav.stacks 는 키가 정확히 넷이다(MC-U27)", () => {
    expect(Object.keys(initialNav.stacks).sort()).toEqual([
      "journey",
      "messenger",
      "roleplay",
      "settings",
    ]);
  });
});
