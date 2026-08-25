import { describe, expect, it } from "vitest";

import { currentScreen, initialNav, navReducer } from "./navigation";

describe("navReducer", () => {
  it("push는 현재 탭의 스택에 쌓는다", () => {
    const next = navReducer(initialNav, { type: "push", screen: { name: "home" } });

    expect(next.stacks.home).toHaveLength(2);
    expect(currentScreen(next)).toEqual({ name: "home" });
  });

  it("back은 스택에 화면이 하나뿐이면 아무것도 하지 않는다", () => {
    expect(navReducer(initialNav, { type: "back" })).toBe(initialNav);
  });

  it("back은 push한 화면을 되돌린다", () => {
    const pushed = navReducer(initialNav, { type: "push", screen: { name: "home" } });

    expect(navReducer(pushed, { type: "back" }).stacks.home).toHaveLength(1);
  });
});
