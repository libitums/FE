import { describe, expect, test } from "vitest";

import { initialAppStart, nextAppStart } from "./app-start";
import { entryInitialNav, initialNav, signedOutNav } from "./nav-state";
import { currentScreen, navReducer, showsTabNavigator } from "./nav-reducer";

// test-plan §2.6 AW1(signedOutNav) · AW2(app-start).

describe("signedOutNav", () => {
  test("AW1: entry는 [온보딩, 로그인], 탭은 journey, 스택은 initialNav와 같다", () => {
    expect(signedOutNav.entry).toStrictEqual([{ name: "onboarding" }, { name: "login" }]);
    expect(signedOutNav.tab).toBe("journey");
    expect(signedOutNav.stacks).toStrictEqual(initialNav.stacks);
  });

  test("AW1: 현재 화면은 login이고 탭 내비게이터는 보이지 않는다", () => {
    expect(currentScreen(signedOutNav)).toStrictEqual({ name: "login" });
    expect(showsTabNavigator(signedOutNav)).toBe(false);
  });

  test("AW1: back이면 entry가 [온보딩]이 된다", () => {
    expect(navReducer(signedOutNav, { type: "back" }).entry).toStrictEqual([
      { name: "onboarding" },
    ]);
  });
});

describe("app-start", () => {
  test("AW2: initialAppStart는 { key: 0, nav: entryInitialNav, exit: null }", () => {
    expect(initialAppStart).toStrictEqual({ key: 0, nav: entryInitialNav, exit: null });
  });

  test("AW2: nextAppStart는 key + 1이고 nav는 늘 signedOutNav, exit은 받은 이유다", () => {
    expect(nextAppStart({ key: 3, nav: entryInitialNav, exit: null }, "deleted")).toStrictEqual({
      key: 4,
      nav: signedOutNav,
      exit: "deleted",
    });
    expect(nextAppStart(initialAppStart, "signed-out").key).toBe(1);
  });

  test("AW2: 입력을 고치지 않고 연속 호출이 한 칸씩 는다", () => {
    const start = { key: 3, nav: entryInitialNav, exit: null };
    const snapshot = structuredClone(start);
    const once = nextAppStart(start, "signed-out");
    expect(start).toStrictEqual(snapshot);
    expect(nextAppStart(once, "signed-out").key).toBe(5);
    expect(nextAppStart(once, "deleted").nav).toBe(signedOutNav);
  });
});
