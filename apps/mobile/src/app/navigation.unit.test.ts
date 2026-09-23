import { describe, expect, it } from "vitest";

import type { LearningForm } from "../lib/learning-form";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import {
  activeStack,
  currentScreen,
  entryInitialNav,
  entryScreenAfterLogin,
  handwritingProbeNav,
  initialNav,
  isEntrySection,
  learningScreenFor,
  navReducer,
  roleplayScreenFor,
  speechProbeNav,
  tabRootActions,
  type Nav,
  type Screen,
  type Tab,
} from "./navigation";

// 픽스처(baseStacks)는 initialNav.stacks의 모양을 빌립니다 — `Nav["stacks"]`를
// 리터럴로 쓰면 키가 `Tab` 유니온에 묶여 탭 구성이 바뀔 때마다 tsc가 갈립니다.
// `initialNav.stacks`에서 빌리면 `Tab`의 멤버가 몇 개든 그대로 타입이 따라옵니다.
// 값 자체(각 탭의 루트 화면)는 여전히 계약이 고정한 대로입니다. `entry`가 있는
// 분기와 없는 분기를 각 동작마다 짝으로 둡니다.

const baseStacks: Nav["stacks"] = initialNav.stacks;

function nav(overrides: Partial<Nav>): Nav {
  return {
    entry: [],
    tab: "settings",
    stacks: baseStacks,
    ...overrides,
  };
}

describe("activeStack", () => {
  it("entry가 비면 현재 탭 스택을 돌려준다", () => {
    const n = nav({ tab: "roleplay", stacks: baseStacks });

    expect(activeStack(n)).toEqual(baseStacks.roleplay);
  });

  it("entry가 비지 않으면 entry를 돌려준다", () => {
    const entry = [{ name: "settings" } as const];
    const n = nav({ entry, tab: "roleplay" });

    expect(activeStack(n)).toEqual(entry);
  });
});

describe("currentScreen", () => {
  it("entry가 비면 활성 스택(현재 탭 스택)의 최상단을 돌려준다", () => {
    const n = nav({
      tab: "roleplay",
      stacks: { ...baseStacks, roleplay: [{ name: "roleplay-list" }, { name: "settings" }] },
    });

    expect(currentScreen(n)).toEqual({ name: "settings" });
  });

  it("entry가 있으면 진입 화면(entry 최상단)을 돌려준다 — 탭 스택 최상단이 아니다", () => {
    const n = nav({
      entry: [{ name: "roleplay-list" }, { name: "settings" }],
      tab: "journey",
      stacks: baseStacks,
    });

    expect(currentScreen(n)).toEqual({ name: "settings" });
  });
});

describe("initialNav", () => {
  it("I1. initialNav.tab이 journey다", () => {
    expect(initialNav.tab).toBe("journey");
  });

  it("I2. currentScreen(initialNav)이 여정 맵이고 activeStack(initialNav)이 여정 스택이다", () => {
    expect(currentScreen(initialNav)).toEqual({ name: "journey-map" });
    expect(activeStack(initialNav)).toEqual(initialNav.stacks.journey);
  });

  it("I3. entry가 비어 있고 세 탭 스택이 각각 자기 루트 화면 하나로 시작한다", () => {
    expect(initialNav.entry).toEqual([]);
    expect(initialNav.stacks.journey).toEqual([{ name: "journey-map" }]);
    expect(initialNav.stacks.roleplay).toEqual([{ name: "roleplay-list" }]);
    expect(initialNav.stacks.settings).toEqual([{ name: "settings" }]);
  });
});

describe("navReducer", () => {
  describe("visual novel screen contract", () => {
    const visualNovelScreen = {
      name: "visual-novel",
      unitId: "cafe-arrival-visual-novel",
    } as const;

    it("push하면 visual novel이 current screen이 되고 backToRoot은 journey map으로 돌아간다", () => {
      const n = nav({ tab: "journey" });
      const next = navReducer(n, { type: "push", screen: visualNovelScreen });

      expect(currentScreen(next)).toEqual(visualNovelScreen);
      expect(currentScreen(navReducer(next, { type: "backToRoot" }))).toEqual({
        name: "journey-map",
      });
    });
  });

  describe("messenger screen contract", () => {
    const messengerScreen = { name: "messenger", unitId: "appointment-confirmation" } as const;

    it("push하면 messenger가 current screen이 되고 backToRoot은 journey-map root로 돌아간다", () => {
      const n = nav({
        tab: "journey",
        stacks: { ...baseStacks, journey: [{ name: "journey-map" }] },
      });
      const next = navReducer(n, { type: "push", screen: messengerScreen });
      expect(currentScreen(next)).toEqual(messengerScreen);
      expect(currentScreen(navReducer(next, { type: "backToRoot" }))).toEqual({
        name: "journey-map",
      });
    });

    it("backToRoot은 messenger만 제거하고 다른 탭 스택은 보존한다", () => {
      const n = nav({
        tab: "journey",
        stacks: { ...baseStacks, journey: [{ name: "journey-map" }, messengerScreen] },
      });
      const root = navReducer(n, { type: "backToRoot" });
      expect(root.stacks.journey).toEqual([{ name: "journey-map" }]);
      expect(root.stacks.roleplay).toBe(baseStacks.roleplay);
      expect(root.stacks.settings).toBe(baseStacks.settings);
    });
  });
  it("1. push / entry 비었을 때 → 현재 탭 스택에 쌓이고 다른 탭 스택은 그대로다", () => {
    const n = nav({ tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "settings" } });

    expect(next.entry).toEqual([]);
    expect(next.tab).toBe("journey");
    expect(next.stacks.journey).toEqual([{ name: "journey-map" }, { name: "settings" }]);
    expect(next.stacks.roleplay).toEqual(baseStacks.roleplay);
    expect(next.stacks.settings).toEqual(baseStacks.settings);
  });

  it("2. push / entry 있을 때 → entry에 쌓이고 탭 스택은 그대로다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "settings" } });

    expect(next.entry).toEqual([{ name: "roleplay-list" }, { name: "settings" }]);
    expect(next.tab).toBe("journey");
    expect(next.stacks).toEqual(baseStacks);
  });

  it("3. back / entry 비었을 때 → 현재 탭 스택에서 하나 빠진다", () => {
    const n = nav({
      tab: "journey",
      stacks: { ...baseStacks, journey: [{ name: "journey-map" }, { name: "settings" }] },
    });

    const next = navReducer(n, { type: "back" });

    expect(next.entry).toEqual([]);
    expect(next.stacks.journey).toEqual([{ name: "journey-map" }]);
  });

  it("4. back / entry 있을 때 → entry에서 하나 빠진다", () => {
    const n = nav({
      entry: [{ name: "roleplay-list" }, { name: "settings" }],
      tab: "journey",
      stacks: baseStacks,
    });

    const next = navReducer(n, { type: "back" });

    expect(next.entry).toEqual([{ name: "roleplay-list" }]);
    expect(next.stacks).toEqual(baseStacks);
  });

  it("5. back / 활성 스택 길이 1 → 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "journey", stacks: baseStacks });

    expect(navReducer(n, { type: "back" })).toBe(n);
  });

  it("6. back / entry 길이 1 → entry를 비우지 않고 동일 참조를 돌려준다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "back" });

    expect(next).toBe(n);
    expect(next.entry).toEqual([{ name: "roleplay-list" }]);
  });

  it("7. replace / entry 비었을 때 → 탭 스택 최상단이 바뀌고 길이는 그대로다", () => {
    const n = nav({
      tab: "journey",
      stacks: { ...baseStacks, journey: [{ name: "journey-map" }, { name: "settings" }] },
    });

    const next = navReducer(n, { type: "replace", screen: { name: "roleplay-list" } });

    expect(next.stacks.journey).toEqual([{ name: "journey-map" }, { name: "roleplay-list" }]);
    expect(next.stacks.journey).toHaveLength(2);
  });

  it("8. replace / entry 있을 때 → entry 최상단이 바뀌고 길이는 그대로다", () => {
    const n = nav({
      entry: [{ name: "roleplay-list" }, { name: "settings" }],
      tab: "journey",
      stacks: baseStacks,
    });

    const next = navReducer(n, { type: "replace", screen: { name: "journey-map" } });

    expect(next.entry).toEqual([{ name: "roleplay-list" }, { name: "journey-map" }]);
    expect(next.entry).toHaveLength(2);
    expect(next.stacks).toEqual(baseStacks);
  });

  // integration은 스택 깊이가 1이라 이걸 관찰할 수 없으므로, 여기서 깊이 2 스택을
  // 만들고 왕복(settings → journey → settings)까지 확인합니다.
  it("9. switchTab → tab이 바뀌고 깊이 2 이상 스택을 포함해 세 스택이 모두 보존된다 (왕복 포함)", () => {
    const deepStacks: Nav["stacks"] = {
      ...baseStacks,
      settings: [{ name: "settings" }, { name: "roleplay-list" }],
    };
    const n = nav({ tab: "settings", stacks: deepStacks });

    const away = navReducer(n, { type: "switchTab", tab: "journey" });

    expect(away.tab).toBe("journey");
    expect(away.entry).toEqual([]);
    expect(away.stacks).toEqual(deepStacks);
    expect(away.stacks.settings).toEqual([{ name: "settings" }, { name: "roleplay-list" }]);

    const back = navReducer(away, { type: "switchTab", tab: "settings" });

    expect(back.tab).toBe("settings");
    expect(back.stacks).toEqual(deepStacks);
    expect(back.stacks.settings).toEqual([{ name: "settings" }, { name: "roleplay-list" }]);
    expect(back.stacks.journey).toEqual(deepStacks.journey);
  });

  it("10. switchTab / 이미 그 탭일 때 → 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });

    expect(navReducer(n, { type: "switchTab", tab: "settings" })).toBe(n);
  });

  it("11. enterApp → entry가 비고 tab·stacks는 그대로다. 이후 activeStack은 현재 탭 스택이다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "enterApp" });

    expect(next.entry).toEqual([]);
    expect(next.tab).toBe("journey");
    expect(next.stacks).toEqual(baseStacks);
    expect(activeStack(next)).toEqual(baseStacks.journey);
  });

  it("12. enterApp / entry가 이미 비었을 때 → 동일 참조를 돌려준다", () => {
    const n = nav({ entry: [], tab: "settings", stacks: baseStacks });

    expect(navReducer(n, { type: "enterApp" })).toBe(n);
  });

  // switchTab은 entry 상태를 보지 않습니다 — entry가 채워져 있어도 tab을 바꿉니다.
  // switchTab은 여전히 진입 구간에서 부를 자리가 없습니다 — `back`은 코드 검증의
  // "로그인으로" 나가기가 실제로 부릅니다. 리듀서 자체는 어느 쪽도 막지 않습니다.
  it("switchTab은 entry를 보지 않는다 — entry가 있어도 tab이 바뀐다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "switchTab", tab: "settings" });

    expect(next.tab).toBe("settings");
    expect(next.entry).toEqual([{ name: "roleplay-list" }]);
  });
});

// `backToRoot` — 활성 스택(entry가 있으면 entry, 없으면 현재 탭 스택)을 루트 하나로
// 줄입니다. 어떤 분기도 깊이를 세지 않습니다 — 활성 스택 길이가 1이면 동일 참조를
// 돌려주고, 그 밖의 길이는 전부 첫 원소 하나로 줍니다.
//
// U1·U2는 entry가 없는 분기를, U3은 entry가 있는 분기를 짓습니다 — 두 분기를 짝으로
// 두어 어느 쪽이 활성 스택인지에 상관없이 같은 규칙이 적용됨을 봅니다. U4·U5는 각
// 분기의 길이-1 동일 참조를, U6은 backToRoot가 switchTab·enterApp과 갈리는 자리
// (tab 유지·entry 비우지 않음)를 짓습니다.
describe("navReducer — backToRoot", () => {
  it("U1. entry 비었고 활성 스택 길이 3 → 현재 탭 스택이 루트 하나로 준다. 다른 탭 스택은 그대로다", () => {
    const n = nav({
      tab: "journey",
      stacks: {
        ...baseStacks,
        journey: [
          { name: "journey-map" },
          { name: "listening", stepId: "ordering" },
          { name: "word-choice", stepId: "ordering" },
        ],
      },
    });

    const next = navReducer(n, { type: "backToRoot" });

    expect(next.stacks.journey).toEqual([{ name: "journey-map" }]);
    expect(next.tab).toBe("journey");
    expect(next.entry).toEqual([]);
    expect(next.stacks.roleplay).toEqual(baseStacks.roleplay);
    expect(next.stacks.settings).toEqual(baseStacks.settings);
  });

  // 길이 2에서는 `back`(하나만 pop)과 `backToRoot`(루트까지 줄이기)의 결과가 우연히
  // 같은 자리에 옵니다 — 깊이를 세지 않는 backToRoot도 새 객체를 만든다는 것을
  // 여기서 명시적으로 짓습니다.
  it("U2. entry 비었고 활성 스택 길이 2 → 루트 하나로 준다 (back과 결과가 같은 자리)", () => {
    const n = nav({
      tab: "settings",
      stacks: { ...baseStacks, settings: [{ name: "settings" }, { name: "roleplay-list" }] },
    });

    const next = navReducer(n, { type: "backToRoot" });

    expect(next.stacks.settings).toEqual([{ name: "settings" }]);
    expect(next.tab).toBe("settings");
    expect(next.entry).toEqual([]);
  });

  it("U3. entry 안 비었고 entry 길이 3 → entry가 첫 원소 하나로 준다. stacks는 그대로다", () => {
    const n = nav({
      entry: [{ name: "roleplay-list" }, { name: "settings" }, { name: "journey-map" }],
      tab: "roleplay",
      stacks: baseStacks,
    });

    const next = navReducer(n, { type: "backToRoot" });

    expect(next.entry).toEqual([{ name: "roleplay-list" }]);
    expect(next.tab).toBe("roleplay");
    expect(next.stacks).toEqual(baseStacks);
  });

  it("U4. entry 비었고 활성 스택 길이 1 → 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });

    expect(navReducer(n, { type: "backToRoot" })).toBe(n);
  });

  it("U5. entry 길이 1 → 동일 참조를 돌려준다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "settings", stacks: baseStacks });

    expect(navReducer(n, { type: "backToRoot" })).toBe(n);
  });

  // entry가 있을 때도 tab은 그대로이고, entry가 []가 되지 않습니다(enterApp이라면
  // []가 됐을 자리입니다). 줄어든 모양(첫 원소 하나)은 U3이 지므로, 여기서는
  // switchTab·enterApp과 갈리는 자리만 봅니다.
  it("U6. tab을 바꾸지 않고 entry를 비우지 않는다 — switchTab·enterApp과 갈리는 자리", () => {
    const n = nav({
      entry: [{ name: "journey-map" }, { name: "settings" }],
      tab: "roleplay",
      stacks: baseStacks,
    });

    const next = navReducer(n, { type: "backToRoot" });

    expect(next.tab).toBe("roleplay");
    expect(next.entry).not.toEqual([]);
  });
});

// `listening`이 `Screen` union에 든 뒤의 스택 동작입니다. 리듀서는 화면의 내용을
// 모르므로 여기서 보는 것은 둘입니다 — **화면 파라미터(`stepId`)가 스택을 타고
// 그대로 나오는가**, 그리고 **탭을 왕복해도 학습 화면이 여정 스택에 남는가**.
//
// `Screen` union의 exhaustiveness는 `tsc`가 집니다 — App.tsx의 `const exhaustive:
// never` 한 줄이 그 게이트입니다. 런타임 단언으로 흉내 내지 않습니다.
//
// 여기서는 `initialNav.tab`의 실제 값에 기대지 않고 항상 여정 탭으로 전환한 뒤
// push합니다 — 실제 결선(App)이 여정 탭에서만 이 push를 내기 때문입니다
// (`initialNav.tab`이 이미 journey라도 switchTab은 동일 참조를 돌려줄 뿐이라
// 안전합니다).
describe("navReducer — listening 화면", () => {
  const listeningScreen = { name: "listening", stepId: "ordering" } as const;

  function journeyNav(): Nav {
    return navReducer(initialNav, { type: "switchTab", tab: "journey" });
  }

  it("push → 여정 탭 스택이 깊이 2가 되고 최상단이 listening 화면이다", () => {
    const next = navReducer(journeyNav(), { type: "push", screen: listeningScreen });

    expect(next.stacks.journey).toHaveLength(2);
    expect(next.stacks.journey[1]).toEqual({ name: "listening", stepId: "ordering" });
    expect(next.stacks.roleplay).toEqual(baseStacks.roleplay);
    expect(next.stacks.settings).toEqual(baseStacks.settings);
    expect(next.entry).toEqual([]);
  });

  it("push 뒤 currentScreen이 그 화면을 그대로 돌려준다 — stepId가 스택을 타고 나온다", () => {
    const next = navReducer(journeyNav(), { type: "push", screen: listeningScreen });

    const current = currentScreen(next);

    expect(current).toBe(listeningScreen);
    expect(current.name).toBe("listening");
    // union을 좁혀 파라미터를 읽습니다. 화면 이름만 남고 stepId가 사라지면 여기서 갈립니다.
    expect(current.name === "listening" ? current.stepId : null).toBe("ordering");
  });

  it("push 뒤 back → 여정 탭 스택이 깊이 1로 돌아오고 최상단이 여정 맵이다", () => {
    const pushed = navReducer(journeyNav(), { type: "push", screen: listeningScreen });

    const next = navReducer(pushed, { type: "back" });

    expect(next.stacks.journey).toHaveLength(1);
    expect(currentScreen(next)).toEqual({ name: "journey-map" });
  });

  it("push 뒤 탭을 왕복해도 여정 스택에 학습 화면이 남는다", () => {
    const pushed = navReducer(journeyNav(), { type: "push", screen: listeningScreen });

    const away = navReducer(pushed, { type: "switchTab", tab: "settings" });
    const back = navReducer(away, { type: "switchTab", tab: "journey" });

    expect(away.tab).toBe("settings");
    expect(away.stacks.journey).toHaveLength(2);
    expect(back.tab).toBe("journey");
    expect(back.stacks.journey).toHaveLength(2);
    expect(currentScreen(back)).toEqual({ name: "listening", stepId: "ordering" });
  });
});

// `Screen` union에 `"assessment"` 멤버 하나(`stepId` · `results`)가 있다는 것을
// 보는 자리입니다.
//
// ⚠ **이 describe의 케이스는 red-green으로 얻은 것이 아닙니다.** `navReducer`는
// 다섯 액션 어디서도 `screen.name`을 읽지 않습니다 — `push`·`replace`는
// `action.screen`을 배열에 그대로 넣을 뿐이라 `Screen`에 대해 완전히 제네릭입니다.
// `Screen` union에 멤버가 느는 것은 **순전히 타입** 층위의 사실이고 Vitest는 실행
// 전에 타입을 지웁니다. 그래서 아래 케이스는 `navigation.ts`에 `"assessment"`
// 멤버가 아직 없어도(구현 전) **첫 실행에 통과합니다** — 공허하게 통과할 수 있는
// 자리입니다.
//
// 그러므로 이 케이스들의 성격은 (1) `Screen`에 평가 멤버가 있다는 것의 **타입 층위
// 주장**을 하는 **회귀 그물**이지 (2) 관찰 가능한 동작의 판정자가 아닙니다. **관찰
// 가능한 동작**(평가 화면이 실제로 뜹니다 · `backToRoot` 하나로 맵에 닿습니다 ·
// 미통과면 진행이 갱신되지 않습니다)의 판정자는 `App.integration.test.tsx`의
// **I1 · I3 · I6**입니다.
describe("navReducer — assessment 화면", () => {
  const listeningScreen = { name: "listening", stepId: "ordering" } as const;
  const assessmentScreen = {
    name: "assessment",
    stepId: "ordering",
    results: ["correct", "incorrect", "correct"],
  } as const;

  // 실제 결선이 만드는 상태를 그대로 재현합니다 — 여정 탭에서 학습 화면을 push한
  // 뒤, 평가로의 전환은 `replace`입니다(`push`가 아닙니다).
  function journeyNavAtListening(): Nav {
    const journey = navReducer(initialNav, { type: "switchTab", tab: "journey" });
    return navReducer(journey, { type: "push", screen: listeningScreen });
  }

  it("replace → 여정 탭 스택 깊이가 그대로이고 최상단이 assessment 화면이다", () => {
    const next = navReducer(journeyNavAtListening(), {
      type: "replace",
      screen: assessmentScreen,
    });

    expect(next.stacks.journey).toHaveLength(2);
    expect(next.stacks.journey[1]).toEqual(assessmentScreen);
    expect(next.stacks.roleplay).toEqual(baseStacks.roleplay);
  });

  it("replace 뒤 currentScreen이 assessment 화면을 그대로 돌려준다 — stepId·results가 스택을 타고 나온다", () => {
    const next = navReducer(journeyNavAtListening(), {
      type: "replace",
      screen: assessmentScreen,
    });

    const current = currentScreen(next);

    expect(current).toBe(assessmentScreen);
    expect(current.name).toBe("assessment");
    expect(current.name === "assessment" ? current.stepId : null).toBe("ordering");
    expect(current.name === "assessment" ? current.results : null).toEqual([
      "correct",
      "incorrect",
      "correct",
    ]);
  });

  it("replace 뒤 back → 여정 탭 스택이 깊이 1로 돌아오고 최상단이 여정 맵이다 — 듣기 화면이 스택에 남지 않는다", () => {
    const replaced = navReducer(journeyNavAtListening(), {
      type: "replace",
      screen: assessmentScreen,
    });

    const next = navReducer(replaced, { type: "back" });

    expect(next.stacks.journey).toHaveLength(1);
    expect(currentScreen(next)).toEqual({ name: "journey-map" });
  });

  it("replace 뒤 탭을 왕복해도 여정 스택에 평가 화면이 남는다", () => {
    const replaced = navReducer(journeyNavAtListening(), {
      type: "replace",
      screen: assessmentScreen,
    });

    const away = navReducer(replaced, { type: "switchTab", tab: "settings" });
    const back = navReducer(away, { type: "switchTab", tab: "journey" });

    expect(away.tab).toBe("settings");
    expect(away.stacks.journey).toHaveLength(2);
    expect(back.tab).toBe("journey");
    expect(back.stacks.journey).toHaveLength(2);
    expect(currentScreen(back)).toEqual(assessmentScreen);
  });
});

// -------------------------------------------------------------- 학습형 → 화면
// 어휘 배열에 "culture"를 더했습니다. 아래의 기존 케이스 아홉이 새 describe 없이
// 그대로 culture를 덮습니다. `learningScreenFor`에 "culture" case가 없다면
// 런타임에 `undefined`를 돌려주므로, `.name`을 읽는 케이스와
// `not.toBeUndefined()` 케이스가 여기서 실물로 실패했을 것입니다.

// 이 함수의 입력 전부입니다.
const allLearningForms: readonly LearningForm[] = [
  "listening",
  "sentence-order",
  "word-choice",
  "culture",
];

// 여정 맵의 스텝 다섯입니다. stepId가 인자 그대로인지를 다섯 전부에서 봅니다.
const allStepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

describe("learningScreenFor", () => {
  it("학습형 셋 각각에서 name이 학습형 문자열과 같다", () => {
    for (const form of allLearningForms) {
      expect(learningScreenFor(form, "ordering").name).toBe(form);
    }
  });

  it("학습형 셋 각각에서 stepId가 인자 그대로다", () => {
    for (const form of allLearningForms) {
      for (const id of allStepIds) {
        const screen = learningScreenFor(form, id);

        expect("stepId" in screen ? screen.stepId : null).toBe(id);
      }
    }
  });

  it("세 결과의 name이 서로 다르다", () => {
    const names = allLearningForms.map((form) => learningScreenFor(form, "ordering").name);

    expect(new Set(names).size).toBe(allLearningForms.length);
  });

  // 멤버 둘의 모양은 `listening`과 문자 그대로 같습니다 — 필드는 `stepId` 하나이고
  // `stepOrdinal`도 `form`도 union에 넣지 않습니다. toEqual이 그 「필드가 둘뿐」을
  // 집니다.
  it("학습형 셋 각각이 { name, stepId } 꼴이고 필드가 그 둘뿐이다", () => {
    for (const form of allLearningForms) {
      expect(learningScreenFor(form, "greeting")).toEqual({ name: form, stepId: "greeting" });
    }
  });

  it("탭 루트 화면 셋 중 어느 것도 돌려주지 않는다", () => {
    const tabRoots = ["journey-map", "roleplay-list", "settings"];

    for (const form of allLearningForms) {
      expect(tabRoots).not.toContain(learningScreenFor(form, "directions").name);
    }
  });

  it("부수효과 없음 — 같은 인자를 두 번 불러도 같은 값이다", () => {
    for (const form of allLearningForms) {
      expect(learningScreenFor(form, "appointment")).toEqual(
        learningScreenFor(form, "appointment"),
      );
    }
  });
});

describe("learningScreenFor의 총성", () => {
  // ⚠ `switch`의 exhaustiveness는 tsc가 집니다(TS2366 실측). **unit이 그것을 다시
  // 단언하지 않습니다** — 단언할 수 없는 것을 단언하는 척하지 않습니다. 여기서 보는
  // 것은 런타임 총성뿐입니다: 셋 중 어느 값에도 undefined를 내지 않고 던지지 않습니다.

  it("학습형 셋 중 어느 값에도 undefined를 돌려주지 않는다", () => {
    for (const form of allLearningForms) {
      expect(learningScreenFor(form, "directions")).not.toBeUndefined();
    }
  });

  it("학습형 셋 × 스텝 다섯 어느 칸에도 undefined를 돌려주지 않는다", () => {
    for (const form of allLearningForms) {
      for (const id of allStepIds) {
        expect(learningScreenFor(form, id)).not.toBeUndefined();
      }
    }
  });

  it("학습형 셋 어느 것에도 던지지 않는다", () => {
    for (const form of allLearningForms) {
      expect(() => learningScreenFor(form, "greeting")).not.toThrow();
    }
  });

  it("돌려준 화면은 push로 스택에 그대로 올라간다", () => {
    for (const form of allLearningForms) {
      const screen = learningScreenFor(form, "ordering");
      const next = navReducer(nav({ tab: "journey" }), { type: "push", screen });

      expect(currentScreen(next)).toEqual(screen);
    }
  });
});

// ---------------------------------------------------------- 롤플레이 route 사상

describe("roleplayScreenFor", () => {
  const messengerRoleplayItem: RoleplayItem = {
    form: "messenger",
    unitId: "appointment-confirmation",
    title: "약속 확인 메시지",
  };
  const phoneCallRoleplayItem: RoleplayItem = {
    form: "phone-call",
    unitId: "appointment-confirmation-phone-call",
    title: "약속 확인 전화",
  };
  const visualNovelRoleplayItem: RoleplayItem = {
    form: "visual-novel",
    unitId: "cafe-arrival-visual-novel",
    title: "카페에 도착한 지민",
  };
  const allRoleplayItems: readonly RoleplayItem[] = [
    messengerRoleplayItem,
    phoneCallRoleplayItem,
    visualNovelRoleplayItem,
  ];

  it("N1. 세 형태 각각이 대응하는 롤플레이 route + 인자의 unitId를 낸다. 필드는 둘뿐이다", () => {
    expect(roleplayScreenFor(messengerRoleplayItem)).toEqual({
      name: "roleplay-messenger",
      unitId: "appointment-confirmation",
    });
    expect(roleplayScreenFor(phoneCallRoleplayItem)).toEqual({
      name: "roleplay-phone-call",
      unitId: "appointment-confirmation-phone-call",
    });
    expect(roleplayScreenFor(visualNovelRoleplayItem)).toEqual({
      name: "roleplay-visual-novel",
      unitId: "cafe-arrival-visual-novel",
    });
    for (const item of allRoleplayItems) {
      expect(Object.keys(roleplayScreenFor(item)).sort()).toEqual(["name", "unitId"]);
    }
  });

  it("N2. 어느 결과도 여정 route나 탭 루트 셋이 아니다", () => {
    const forbiddenNames = [
      "messenger",
      "phone-call",
      "visual-novel",
      "journey-map",
      "roleplay-list",
      "settings",
    ];

    for (const item of allRoleplayItems) {
      expect(forbiddenNames).not.toContain(roleplayScreenFor(item).name);
    }
  });

  // 기대 화면은 roleplayScreenFor를 다시 불러 만들지 않습니다 — 자기참조 오라클을
  // 피합니다. phone-call 항목을 골라, 스텁이 언제나 돌려주는 roleplay-messenger와
  // 어긋나야 이 케이스가 화면 사상 자체의 정확성도 함께 겁니다.
  it("N3. roleplay 탭에서 push(roleplayScreenFor(item)) → 롤플레이 스택에만 쌓이고 다른 두 스택은 동일 참조다", () => {
    const n = nav({ tab: "roleplay", stacks: baseStacks });
    const expectedScreen = {
      name: "roleplay-phone-call",
      unitId: "appointment-confirmation-phone-call",
    } as const;

    const next = navReducer(n, {
      type: "push",
      screen: roleplayScreenFor(phoneCallRoleplayItem),
    });

    expect(next.stacks.roleplay).toEqual([{ name: "roleplay-list" }, expectedScreen]);
    expect(currentScreen(next)).toEqual(expectedScreen);
    expect(next.stacks.journey).toBe(baseStacks.journey);
    expect(next.stacks.settings).toBe(baseStacks.settings);
  });

  it("N4. 이어서 backToRoot → 롤플레이 스택이 루트 하나로 돌아오고 여정 스택은 여전히 동일 참조다", () => {
    const n = nav({ tab: "roleplay", stacks: baseStacks });
    const screen = roleplayScreenFor(messengerRoleplayItem);
    const pushed = navReducer(n, { type: "push", screen });

    const next = navReducer(pushed, { type: "backToRoot" });

    expect(next.stacks.roleplay).toEqual([{ name: "roleplay-list" }]);
    expect(next.stacks.journey).toBe(baseStacks.journey);
  });
});

// 알림 route는 `Screen`에 필드 없는 멤버 하나로만 존재합니다 — 목록은 App이 넘기고
// 알림 화면에는 진행이 없습니다. 여기서 보는 것은 스택 동작뿐입니다.
describe("알림 route", () => {
  it("NV1. push(notifications) → 여정 스택에 알림이 쌓이고 다른 탭 스택은 동일 참조다", () => {
    const next = navReducer(initialNav, { type: "push", screen: { name: "notifications" } });

    expect(next.stacks.journey).toEqual([{ name: "journey-map" }, { name: "notifications" }]);
    expect(currentScreen(next)).toEqual({ name: "notifications" });
    expect(next.stacks.roleplay).toBe(initialNav.stacks.roleplay);
    expect(next.stacks.settings).toBe(initialNav.stacks.settings);
  });

  // 알림에서 연 특별 유닛에서 backToRoot하면 여정 맵으로 돌아갑니다. 알림으로
  // 되돌아가지 않습니다 — 알림은 여정 스택 중간 화면일 뿐입니다.
  it("NV2. 알림에서 연 메신저를 backToRoot하면 여정 맵으로 돌아가고 알림으로 되돌아가지 않는다", () => {
    const opened = navReducer(initialNav, { type: "push", screen: { name: "notifications" } });
    const unit = navReducer(opened, {
      type: "push",
      screen: { name: "messenger", unitId: "appointment-confirmation" },
    });

    const next = navReducer(unit, { type: "backToRoot" });

    expect(currentScreen(next)).toEqual({ name: "journey-map" });
    expect(next.stacks.journey).toEqual([{ name: "journey-map" }]);
  });
});

// `tabRootActions`는 부수효과가 없습니다 — 반환한 동작 목록을 App이 순서대로
// `dispatch`합니다. 여기서는 (1) 반환값의 모양과 (2) 그 값을 `navReducer`로
// 순서대로 접었을 때의 결과를 봅니다.
describe("tabRootActions", () => {
  it("NV3. tabRootActions(roleplay)이 switchTab·backToRoot 순서다", () => {
    expect(tabRootActions("roleplay")).toEqual([
      { type: "switchTab", tab: "roleplay" },
      { type: "backToRoot" },
    ]);
  });

  it("NV4. 세 탭 각각에서 길이 2 — 첫째가 switchTab, 둘째가 backToRoot다", () => {
    const tabs: readonly Tab[] = ["journey", "roleplay", "settings"];

    for (const tab of tabs) {
      const actions = tabRootActions(tab);

      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual({ type: "switchTab", tab });
      expect(actions[1]).toEqual({ type: "backToRoot" });
    }
  });

  // NV5 — 기대 화면을 리터럴로 적습니다. 구현이 쓰는 `tabRootActions`를 테스트도
  // 불러 기대값을 만들면, 그 함수가 틀렸을 때 둘이 같이 틀려 통과합니다.
  it("NV5. tabRootActions(roleplay)를 순서대로 접으면 롤플레이 스택만 루트로 줄고 여정 스택(알림 포함)은 남는다", () => {
    const stacks: Nav["stacks"] = {
      ...baseStacks,
      journey: [{ name: "journey-map" }, { name: "notifications" }],
      roleplay: [
        { name: "roleplay-list" },
        { name: "roleplay-messenger", unitId: "appointment-confirmation" },
      ],
    };
    const n = nav({ tab: "journey", stacks });

    const next = tabRootActions("roleplay").reduce(navReducer, n);

    expect(next.tab).toBe("roleplay");
    expect(currentScreen(next)).toEqual({ name: "roleplay-list" });
    expect(next.stacks.roleplay).toEqual([{ name: "roleplay-list" }]);
    expect(next.stacks.journey).toBe(n.stacks.journey);
  });

  it("NV6. 롤플레이 스택이 이미 루트 하나일 때도 같은 접기가 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "journey", stacks: baseStacks });

    const next = tabRootActions("roleplay").reduce(navReducer, n);

    expect(next.tab).toBe("roleplay");
    expect(next.stacks.roleplay).toBe(n.stacks.roleplay);
  });

  it("NV7. (가드) 부수효과 없음 — 같은 인자로 두 번 불러도 같은 값이고 입력 nav가 바뀌지 않는다", () => {
    expect(tabRootActions("settings")).toEqual(tabRootActions("settings"));

    const n = nav({ tab: "journey", stacks: baseStacks });
    const before = JSON.parse(JSON.stringify(n)) as Nav;

    tabRootActions("roleplay").reduce(navReducer, n);

    expect(n).toEqual(before);
  });
});

// -------------------------------------------------- 설정 탭의 새 route — profile · terms
// 이 구역의 NV1~NV3은 위 "알림 route"·"tabRootActions" 구역의 NV1~NV7과 이름이
// 겹치지만 각자 자기 describe 안에서만 유효한 지역 라벨입니다.
// 이 리듀서는 화면 이름을 모르는 제네릭 함수라, 새 route 멤버가 아직 `Screen`
// union에 없어도 별도 스텁 없이 처음부터 통과합니다 — 공허하게 통과할 수 있는
// 자리입니다.
describe("navReducer — 설정 탭의 새 route", () => {
  it("NV1. push(profile) → 설정 탭 스택에 쌓이고 다른 두 스택은 동일 참조다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "profile" } });

    expect(next.stacks.settings).toEqual([{ name: "settings" }, { name: "profile" }]);
    expect(next.stacks.journey).toBe(baseStacks.journey);
    expect(next.stacks.roleplay).toBe(baseStacks.roleplay);
  });

  it("NV2. push(terms) → 설정 탭 스택에 쌓이고 다른 두 스택은 동일 참조다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "terms" } });

    expect(next.stacks.settings).toEqual([{ name: "settings" }, { name: "terms" }]);
    expect(next.stacks.journey).toBe(baseStacks.journey);
    expect(next.stacks.roleplay).toBe(baseStacks.roleplay);
  });

  it("NV3. 프로필을 push한 뒤 backToRoot → 설정 탭 스택이 [{ name: settings }]다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });
    const pushed = navReducer(n, { type: "push", screen: { name: "profile" } });

    const next = navReducer(pushed, { type: "backToRoot" });

    expect(next.stacks.settings).toEqual([{ name: "settings" }]);
  });
});

// ---------------------------------------------------------------- 진입 흐름
// 이 구역의 NV1~NV4는 위 세 구역의 NV1~NV7과 이름이 겹치지만, 이 파일의 기존
// 관행처럼 각자 자기 describe 안에서만 유효한 지역 라벨입니다.
//
// ⭐ 기존 I3(`initialNav.entry`가 `[]`)은 이 구역이 건드리지 않습니다 — 진입 흐름은
// `initialNav`를 고치지 않고 `entryInitialNav`를 별도로 둡니다.
describe("진입 흐름", () => {
  it("NV1. entryInitialNav.entry가 길이 1이고 최상단이 splash다", () => {
    expect(entryInitialNav.entry).toHaveLength(1);
    expect(entryInitialNav.entry[0]).toEqual({ name: "splash" });
  });

  it("NV2. entryInitialNav의 tab·stacks가 initialNav와 같다", () => {
    expect(entryInitialNav.tab).toBe(initialNav.tab);
    expect(entryInitialNav.stacks).toEqual(initialNav.stacks);
  });

  it("NV3. entryScreenAfterLogin이 phone→verification-code, 나머지 수단→language-select다", () => {
    expect(entryScreenAfterLogin("phone")).toEqual({ name: "verification-code" });
    expect(entryScreenAfterLogin("google")).toEqual({ name: "language-select" });
    expect(entryScreenAfterLogin("apple")).toEqual({ name: "language-select" });
    expect(entryScreenAfterLogin("facebook")).toEqual({ name: "language-select" });
  });

  it("NV4. isEntrySection이 entryInitialNav에서 참, initialNav에서 거짓이다", () => {
    expect(isEntrySection(entryInitialNav)).toBe(true);
    expect(isEntrySection(initialNav)).toBe(false);
  });
});

// 탐침 화면은 **도달 불가**라는 것이 그 정의입니다. 소스 grep(사람이 diff를 읽을 때
// 돌리는 것)과 짝을 이루어, 이 케이스가 그 판정의 **파수꾼**입니다 — 누가 나중에
// 탐침을 제품 부팅에 끼워 넣으면 러너가 웁니다.
//
// NP2는 `Screen` union에 탐침 멤버가 없을 때도 성립합니다 — 부팅 상태에 실린 화면
// 이름을 모아 그 중에 탐침이 없다는 것만 보기 때문이고, 멤버가 생긴 뒤에도 같은
// 글자로 남습니다. 그래서 그 케이스는 처음부터 초록이었습니다 — **구현이 없어서가
// 아니라 부재가 곧 기대값이라서**입니다. NP1·NP3은 `handwritingProbeNav` export가
// 선 지금 함께 올립니다.
//
// ⭐ 앱이 실제로 부팅하는 상태는 `initialNav`가 아니라 `entryInitialNav`입니다
// (`App.tsx`의 `useReducer` 둘째 인자). 하나만 훑으면 파수꾼이 낡아 아무것도 안
// 지키므로 제품 부팅 상태를 모두 훑습니다.
describe("탐침 route 도달 경로 — 제품 부팅이 탐침에 닿지 않는다", () => {
  // 개발용 탐침 부팅 상태와 그 route 이름을 **목록으로 모아 훑습니다.** 탐침마다
  // 단언을 손으로 복제하면 다음 탐침이 조용히 빠지고, 빠진 쪽은 아무도 안 봅니다.
  // 여기 한 줄을 더하면 아래 단언 전부가 새 탐침을 함께 봅니다.
  //
  // 목록의 길이를 어디에서도 세지 않습니다 — 세는 순간 탐침이 늘 때 이 파일이 낡습니다.
  const probeBoots: readonly { readonly route: Screen["name"]; readonly boot: Nav }[] = [
    { route: "handwriting-probe", boot: handwritingProbeNav },
    { route: "speech-probe", boot: speechProbeNav },
  ];

  for (const probe of probeBoots) {
    it(`NP1. ${probe.route} 부팅 상태는 여정 탭 스택에 탐침 하나만 세우고 entry가 비어 있다`, () => {
      expect(probe.boot.stacks.journey).toEqual([{ name: probe.route }]);
      expect(probe.boot.tab).toBe("journey");
      // `activeStack`이 `entry`를 먼저 고르므로, 여기가 비어 있지 않으면 이 부팅
      // 상태로도 탐침에 닿지 못합니다 — 그 불변식을 이 줄이 집니다.
      expect(probe.boot.entry).toEqual([]);
      expect(currentScreen(probe.boot)).toEqual({ name: probe.route });
    });
  }

  // 제품 부팅 상태 **둘 다**를 탐침 **전부**에 대해 훑습니다. `initialNav`만 보면
  // App이 실제로 넘기는 부팅 상태(`entryInitialNav`)가 빠지고, 그쪽에 탐침이 섞여도
  // 이 파수꾼이 초록으로 남습니다.
  it("NP2. 제품 부팅 상태의 entry와 모든 탭 스택 어디에도 탐침 route가 없다", () => {
    const bootedScreenNames = (booted: Nav) =>
      [...booted.entry, ...Object.values(booted.stacks).flat()].map((screen) => screen.name);

    for (const booted of [initialNav, entryInitialNav]) {
      for (const probe of probeBoots) {
        expect(bootedScreenNames(booted)).not.toContain(probe.route);
      }
    }
  });

  for (const probe of probeBoots) {
    it(`NP3. ${probe.route} 부팅 상태의 나머지 탭 스택은 initialNav와 같다 — 여정 탭 한 자리만 바꾼다`, () => {
      expect(probe.boot.stacks.roleplay).toEqual(initialNav.stacks.roleplay);
      expect(probe.boot.stacks.settings).toEqual(initialNav.stacks.settings);
    });
  }
});
