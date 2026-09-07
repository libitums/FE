import { describe, expect, it } from "vitest";

import type { LearningForm } from "../lib/learning-form";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import {
  activeStack,
  currentScreen,
  initialNav,
  learningScreenFor,
  navReducer,
  type Nav,
} from "./navigation";

// 계약: scratchpad/lib221/contracts/navigation.contract.ts
// 계획: scratchpad/lib221/spec.md §6.2 (pureFunctions)
//
// 픽스처는 initialNav(자리 표시자라 아직 빈 스택)에 기대지 않고, 계약이 고정한
// 모양대로 매 테스트가 직접 Nav 리터럴을 만든다. `entry`가 있는 분기와 없는 분기를
// 각 동작마다 짝으로 둔다.

const baseStacks: Nav["stacks"] = {
  home: [{ name: "home" }],
  journey: [{ name: "journey-map" }],
  roleplay: [{ name: "roleplay-list" }],
  settings: [{ name: "settings" }],
};

function nav(overrides: Partial<Nav>): Nav {
  return {
    entry: [],
    tab: "home",
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
    const entry = [{ name: "home" } as const];
    const n = nav({ entry, tab: "roleplay" });

    expect(activeStack(n)).toEqual(entry);
  });
});

describe("currentScreen", () => {
  it("entry가 비면 활성 스택(현재 탭 스택)의 최상단을 돌려준다", () => {
    const n = nav({
      tab: "home",
      stacks: { ...baseStacks, home: [{ name: "home" }, { name: "settings" }] },
    });

    expect(currentScreen(n)).toEqual({ name: "settings" });
  });

  it("entry가 있으면 진입 화면(entry 최상단)을 돌려준다 — 탭 스택 최상단이 아니다", () => {
    const n = nav({
      entry: [{ name: "home" }, { name: "settings" }],
      tab: "home",
      stacks: baseStacks,
    });

    expect(currentScreen(n)).toEqual({ name: "settings" });
  });
});

describe("initialNav", () => {
  it("네 탭의 스택이 각각 자기 루트 화면 하나로 시작하고 entry는 비어 있다", () => {
    expect(initialNav.entry).toEqual([]);
    expect(initialNav.tab).toBe("home");
    expect(initialNav.stacks).toEqual({
      home: [{ name: "home" }],
      journey: [{ name: "journey-map" }],
      roleplay: [{ name: "roleplay-list" }],
      settings: [{ name: "settings" }],
    });
  });
});

describe("navReducer", () => {
  // 1. push / entry 비었을 때 → 현재 탭 스택에 쌓인다. 다른 탭 스택은 그대로다
  it("1. push / entry 비었을 때 → 현재 탭 스택에 쌓이고 다른 탭 스택은 그대로다", () => {
    const n = nav({ tab: "home", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "settings" } });

    expect(next.entry).toEqual([]);
    expect(next.tab).toBe("home");
    expect(next.stacks.home).toEqual([{ name: "home" }, { name: "settings" }]);
    expect(next.stacks.journey).toEqual(baseStacks.journey);
    expect(next.stacks.roleplay).toEqual(baseStacks.roleplay);
    expect(next.stacks.settings).toEqual(baseStacks.settings);
  });

  // 2. push / entry 있을 때 → entry에 쌓이고 탭 스택은 그대로다
  it("2. push / entry 있을 때 → entry에 쌓이고 탭 스택은 그대로다", () => {
    const n = nav({ entry: [{ name: "home" }], tab: "home", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "settings" } });

    expect(next.entry).toEqual([{ name: "home" }, { name: "settings" }]);
    expect(next.tab).toBe("home");
    expect(next.stacks).toEqual(baseStacks);
  });

  // 3. back / entry 비었을 때 → 현재 탭 스택에서 하나 빠진다
  it("3. back / entry 비었을 때 → 현재 탭 스택에서 하나 빠진다", () => {
    const n = nav({
      tab: "home",
      stacks: { ...baseStacks, home: [{ name: "home" }, { name: "settings" }] },
    });

    const next = navReducer(n, { type: "back" });

    expect(next.entry).toEqual([]);
    expect(next.stacks.home).toEqual([{ name: "home" }]);
  });

  // 4. back / entry 있을 때 → entry에서 하나 빠진다
  it("4. back / entry 있을 때 → entry에서 하나 빠진다", () => {
    const n = nav({
      entry: [{ name: "home" }, { name: "settings" }],
      tab: "home",
      stacks: baseStacks,
    });

    const next = navReducer(n, { type: "back" });

    expect(next.entry).toEqual([{ name: "home" }]);
    expect(next.stacks).toEqual(baseStacks);
  });

  // 5. back / 활성 스택 길이 1 → 입력을 동일 참조로 돌려준다
  it("5. back / 활성 스택 길이 1 → 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "home", stacks: baseStacks });

    expect(navReducer(n, { type: "back" })).toBe(n);
  });

  // 6. back / entry 길이 1 → entry를 비우지 않는다. 동일 참조
  it("6. back / entry 길이 1 → entry를 비우지 않고 동일 참조를 돌려준다", () => {
    const n = nav({ entry: [{ name: "home" }], tab: "home", stacks: baseStacks });

    const next = navReducer(n, { type: "back" });

    expect(next).toBe(n);
    expect(next.entry).toEqual([{ name: "home" }]);
  });

  // 7. replace / entry 비었을 때 → 탭 스택 최상단이 바뀌고 길이는 그대로다
  it("7. replace / entry 비었을 때 → 탭 스택 최상단이 바뀌고 길이는 그대로다", () => {
    const n = nav({
      tab: "home",
      stacks: { ...baseStacks, home: [{ name: "home" }, { name: "settings" }] },
    });

    const next = navReducer(n, { type: "replace", screen: { name: "journey-map" } });

    expect(next.stacks.home).toEqual([{ name: "home" }, { name: "journey-map" }]);
    expect(next.stacks.home).toHaveLength(2);
  });

  // 8. replace / entry 있을 때 → entry 최상단이 바뀌고 길이는 그대로다
  it("8. replace / entry 있을 때 → entry 최상단이 바뀌고 길이는 그대로다", () => {
    const n = nav({
      entry: [{ name: "home" }, { name: "settings" }],
      tab: "home",
      stacks: baseStacks,
    });

    const next = navReducer(n, { type: "replace", screen: { name: "journey-map" } });

    expect(next.entry).toEqual([{ name: "home" }, { name: "journey-map" }]);
    expect(next.entry).toHaveLength(2);
    expect(next.stacks).toEqual(baseStacks);
  });

  // 9. switchTab → tab이 바뀌고 네 스택이 모두 보존된다 (수용 기준 4의 근거).
  //    integration은 스택 깊이가 1이라 이걸 관찰할 수 없으므로, 여기서 깊이 2 스택을
  //    만들고 왕복(home → journey → home)까지 확인한다.
  it("9. switchTab → tab이 바뀌고 깊이 2 이상 스택을 포함해 네 스택이 모두 보존된다 (왕복 포함)", () => {
    const deepStacks: Nav["stacks"] = {
      ...baseStacks,
      home: [{ name: "home" }, { name: "settings" }],
    };
    const n = nav({ tab: "home", stacks: deepStacks });

    const away = navReducer(n, { type: "switchTab", tab: "journey" });

    expect(away.tab).toBe("journey");
    expect(away.entry).toEqual([]);
    expect(away.stacks).toEqual(deepStacks);
    expect(away.stacks.home).toEqual([{ name: "home" }, { name: "settings" }]);

    const back = navReducer(away, { type: "switchTab", tab: "home" });

    expect(back.tab).toBe("home");
    expect(back.stacks).toEqual(deepStacks);
    expect(back.stacks.home).toEqual([{ name: "home" }, { name: "settings" }]);
    expect(back.stacks.journey).toEqual(deepStacks.journey);
  });

  // 10. switchTab / 같은 탭 → 동일 참조
  it("10. switchTab / 이미 그 탭일 때 → 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "home", stacks: baseStacks });

    expect(navReducer(n, { type: "switchTab", tab: "home" })).toBe(n);
  });

  // 11. enterApp → entry가 비고 tab·stacks는 그대로다. 그 뒤 activeStack이 현재 탭
  //     스택을 돌려준다 (수용 기준 3)
  it("11. enterApp → entry가 비고 tab·stacks는 그대로다. 이후 activeStack은 현재 탭 스택이다", () => {
    const n = nav({ entry: [{ name: "home" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "enterApp" });

    expect(next.entry).toEqual([]);
    expect(next.tab).toBe("journey");
    expect(next.stacks).toEqual(baseStacks);
    expect(activeStack(next)).toEqual(baseStacks.journey);
  });

  // 12. enterApp / entry가 이미 비었을 때 → 동일 참조
  it("12. enterApp / entry가 이미 비었을 때 → 동일 참조를 돌려준다", () => {
    const n = nav({ entry: [], tab: "home", stacks: baseStacks });

    expect(navReducer(n, { type: "enterApp" })).toBe(n);
  });

  // switchTab은 entry 상태를 보지 않는다 — entry가 채워져 있어도 tab을 바꾼다.
  // (진입 구간에는 이 동작을 부를 자리가 없지만, 리듀서 자체는 막지 않는다)
  it("switchTab은 entry를 보지 않는다 — entry가 있어도 tab이 바뀐다", () => {
    const n = nav({ entry: [{ name: "home" }], tab: "home", stacks: baseStacks });

    const next = navReducer(n, { type: "switchTab", tab: "settings" });

    expect(next.tab).toBe("settings");
    expect(next.entry).toEqual([{ name: "home" }]);
  });
});

// ---------------------------------------------------------------- LIB-223 계약 §3.1(c)
// `listening`이 `Screen` union에 든 뒤의 스택 동작. 리듀서는 화면의 내용을 모르므로
// 여기서 보는 것은 둘이다 — **화면 파라미터(`stepId`)가 스택을 타고 그대로 나오는가**,
// 그리고 **탭을 왕복해도 학습 화면이 여정 스택에 남는가**.
//
// `Screen` union의 exhaustiveness는 `tsc`가 진다 — App.tsx의 `const exhaustive: never`
// 한 줄이 그 게이트다. 런타임 단언으로 흉내 내지 않는다 (계약 §3.1(c)).
//
// 계약 §3.1(c)의 표는 `navReducer(initialNav, push(...))`로 적었지만 `initialNav.tab`은
// "home"이라 그대로 하면 깊어지는 것은 홈 스택이다. 표의 기대 출력 칸이 **여정 탭
// 스택**을 말하므로 여정 탭으로 옮긴 뒤 push한다 — 실제 결선(App)도 여정 탭에서만
// 이 push를 낸다.
describe("navReducer — listening 화면 (LIB-223)", () => {
  const listeningScreen = { name: "listening", stepId: "ordering" } as const;

  function journeyNav(): Nav {
    return navReducer(initialNav, { type: "switchTab", tab: "journey" });
  }

  it("push → 여정 탭 스택이 깊이 2가 되고 최상단이 listening 화면이다", () => {
    const next = navReducer(journeyNav(), { type: "push", screen: listeningScreen });

    expect(next.stacks.journey).toHaveLength(2);
    expect(next.stacks.journey[1]).toEqual({ name: "listening", stepId: "ordering" });
    expect(next.stacks.home).toEqual(baseStacks.home);
    expect(next.entry).toEqual([]);
  });

  it("push 뒤 currentScreen이 그 화면을 그대로 돌려준다 — stepId가 스택을 타고 나온다", () => {
    const next = navReducer(journeyNav(), { type: "push", screen: listeningScreen });

    const current = currentScreen(next);

    expect(current).toBe(listeningScreen);
    expect(current.name).toBe("listening");
    // union을 좁혀 파라미터를 읽는다. 화면 이름만 남고 stepId가 사라지면 여기서 갈린다.
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

    const away = navReducer(pushed, { type: "switchTab", tab: "home" });
    const back = navReducer(away, { type: "switchTab", tab: "journey" });

    expect(away.tab).toBe("home");
    expect(away.stacks.journey).toHaveLength(2);
    expect(back.tab).toBe("journey");
    expect(back.stacks.journey).toHaveLength(2);
    expect(currentScreen(back)).toEqual({ name: "listening", stepId: "ordering" });
  });
});

// LIB-227 — 평가 화면. 계약(.agent-harness/work/lib-227/spec.md) §1.2·§1.8(a)가
// `Screen` union에 `"assessment"` 멤버 하나(`stepId` · `results`)를 요구한다.
//
// ⚠ **이 describe의 케이스는 red-green으로 얻은 게 아니다.** `navReducer`는 다섯
// 액션 어디서도 `screen.name`을 읽지 않는다 — `push`·`replace`는 `action.screen`을
// 배열에 그대로 넣을 뿐이라 `Screen`에 대해 완전히 제네릭이다. `Screen` union에
// 멤버가 느는 것은 **순전히 타입** 층위의 사실이고 Vitest는 실행 전에 타입을 지운다.
// 그래서 아래 케이스는 `navigation.ts`에 `"assessment"` 멤버가 아직 없어도(구현 전)
// **첫 실행에 통과한다.**
//
// 그러므로 이 케이스들의 성격은 (1) `Screen`에 평가 멤버가 있다는 것의 **타입 층위
// 주장**을 하는 **회귀 그물**이지 (2) 관찰 가능한 동작의 판정자가 아니다. **관찰
// 가능한 동작**(평가 화면이 실제로 뜬다 · `back` 하나로 맵에 닿는다 · 미통과면 진행이
// 갱신되지 않는다)의 판정자는 `App.integration.test.tsx`의 **I1 · I3 · I6**이다.
describe("navReducer — assessment 화면 (LIB-227)", () => {
  const listeningScreen = { name: "listening", stepId: "ordering" } as const;
  const assessmentScreen = {
    name: "assessment",
    stepId: "ordering",
    results: ["correct", "incorrect", "correct"],
  } as const;

  // 실제 결선(계약 §1.8(b))이 만드는 상태를 그대로 재현한다 — 여정 탭에서 학습
  // 화면을 push한 뒤, 평가로의 전환은 `replace`다(`push`가 아니다).
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
    expect(next.stacks.home).toEqual(baseStacks.home);
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

    const away = navReducer(replaced, { type: "switchTab", tab: "home" });
    const back = navReducer(away, { type: "switchTab", tab: "journey" });

    expect(away.tab).toBe("home");
    expect(away.stacks.journey).toHaveLength(2);
    expect(back.tab).toBe("journey");
    expect(back.stacks.journey).toHaveLength(2);
    expect(currentScreen(back)).toEqual(assessmentScreen);
  });
});

// -------------------------------- 학습형 → 화면 (LIB-236 계약 §3.1 U2·U3)
// 여기부터가 LIB-236이 더하는 것이다. 위의 케이스는 하나도 지우거나 뜻을 바꾸지 않는다.
//
// LIB-238: 계약 §6.1 U5 — 어휘 배열에 "culture"를 더한다. 아래의 기존 케이스
// 아홉이 새 describe 없이 그대로 culture를 덮는다. `learningScreenFor`에
// "culture" case가 없다면 런타임에 `undefined`를 돌려주므로, `.name`을 읽는 케이스와
// `not.toBeUndefined()` 케이스가 여기서 실물로 실패했을 것이다.

// 계약 §1.3의 어휘 넷. 이 함수의 입력 전부다.
const allLearningForms: readonly LearningForm[] = [
  "listening",
  "sentence-order",
  "word-choice",
  "culture",
];

// 여정 맵의 스텝 다섯. stepId가 인자 그대로인지를 다섯 전부에서 본다.
const allStepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

describe("learningScreenFor (계약 §3.1 U2)", () => {
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

  // 계약 §1.6(a): 멤버 둘의 모양은 `listening`과 문자 그대로 같다 — 필드는 `stepId`
  // 하나이고 `stepOrdinal`도 `form`도 union에 넣지 않는다. toEqual이 그 「필드가
  // 둘뿐」을 진다.
  it("학습형 셋 각각이 { name, stepId } 꼴이고 필드가 그 둘뿐이다", () => {
    for (const form of allLearningForms) {
      expect(learningScreenFor(form, "greeting")).toEqual({ name: form, stepId: "greeting" });
    }
  });

  it("탭 루트 화면 넷 중 어느 것도 돌려주지 않는다", () => {
    const tabRoots = ["home", "journey-map", "roleplay-list", "settings"];

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

describe("learningScreenFor의 총성 (계약 §3.1 U3)", () => {
  // ⚠ `switch`의 exhaustiveness는 tsc가 진다 (계약 §1.6(c) · §8.3.1의 TS2366 실측).
  // **unit이 그것을 다시 단언하지 않는다** — 단언할 수 없는 것을 단언하는 척하지
  // 않는다. 여기서 보는 것은 런타임 총성뿐이다: 셋 중 어느 값에도 undefined를 내지
  // 않고 던지지 않는다.

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
