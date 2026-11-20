import { describe, expect, test } from "vitest";

import { deeplinkActions } from "./deeplink-target";
import { downloadSettingsNav } from "./download-settings-nav";
import { initialNav, type Nav, type NavAction } from "./nav-state";
import {
  currentScreen,
  moreRootActions,
  moreRootOf,
  navReducer,
  showsTabNavigator,
  tabRootActions,
} from "./nav-reducer";

// `unit` 계층: 더보기 탭(ADR-0169) — 메뉴 줄이 more 스택 루트를 바꾸고, 설정으로 가는 길이 그대로 닿는다.

const apply = (nav: Nav, actions: readonly NavAction[]) => actions.reduce(navReducer, nav);

describe("openMore", () => {
  test("NM1. 탭 넷 — 넷째는 more, 처음 루트는 설정", () => {
    expect(Object.keys(initialNav.stacks)).toEqual(["journey", "roleplay", "messenger", "more"]);
    expect(initialNav.stacks.more).toEqual([{ name: "settings" }]);
  });

  test.each([
    ["letters", "letters"],
    ["wordbook", "wordbook"],
    ["settings", "settings"],
  ] as const)("NM2. %s 줄 → more 탭 · 루트 %s · 바가 선다", (root, name) => {
    const nav = apply(initialNav, moreRootActions(root));
    expect(nav.tab).toBe("more");
    expect(nav.stacks.more).toEqual([{ name }]);
    expect(currentScreen(nav)).toEqual({ name });
    expect(showsTabNavigator(nav)).toBe(true);
    expect(moreRootOf(nav)).toBe(root);
  });

  test("NM3. 쌓인 화면이 있어도 고른 루트 하나로 다시 선다", () => {
    let nav = apply(initialNav, moreRootActions("settings"));
    nav = navReducer(nav, { type: "push", screen: { name: "download-settings" } });
    nav = apply(nav, moreRootActions("letters"));
    expect(nav.stacks.more).toEqual([{ name: "letters" }]);
  });

  test("NM4. 다른 탭 스택은 건드리지 않는다", () => {
    const nav = apply(initialNav, moreRootActions("wordbook"));
    expect(nav.stacks.journey).toBe(initialNav.stacks.journey);
  });

  test("NM5. 진입 구간에서는 무시", () => {
    const entry: Nav = { ...initialNav, entry: [{ name: "splash" }] };
    expect(navReducer(entry, { type: "openMore", root: "letters" })).toBe(entry);
  });

  test("NM6. more 탭이 아니면 moreRootOf는 지금 탭과 무관하게 more 스택 루트를 읽는다", () => {
    const nav = apply(apply(initialNav, moreRootActions("letters")), tabRootActions("journey"));
    expect(moreRootOf(nav)).toBe("letters");
  });
});

describe("설정으로 가는 길", () => {
  test("NM7. 딥링크 settings → 더보기 › Settings 루트", () => {
    const nav = apply(apply(initialNav, moreRootActions("letters")), deeplinkActions("settings"));
    expect([nav.tab, currentScreen(nav)]).toEqual(["more", { name: "settings" }]);
  });

  test("NM8. 딥링크 journey · roleplay는 그 탭 루트", () => {
    expect(apply(initialNav, deeplinkActions("roleplay")).tab).toBe("roleplay");
    expect(apply(initialNav, deeplinkActions("journey")).tab).toBe("journey");
  });

  test("NM9. 다운로드 설정 바로가기 → 설정 루트 위 다운로드", () => {
    let nav = apply(initialNav, moreRootActions("wordbook"));
    nav = apply(nav, tabRootActions("journey"));
    const actions: NavAction[] = [];
    downloadSettingsNav((action) => actions.push(action)).openDownloadSettings();
    nav = apply(nav, actions);
    expect(nav.tab).toBe("more");
    expect(nav.stacks.more).toEqual([{ name: "settings" }, { name: "download-settings" }]);
  });
});
