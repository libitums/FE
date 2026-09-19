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
  tabRootActions,
  type Nav,
  type Tab,
} from "./navigation";

// 계약: scratchpad/lib221/contracts/navigation.contract.ts
// 계획: scratchpad/lib221/spec.md §6.2 (pureFunctions)
//
// 픽스처(baseStacks)는 initialNav.stacks의 모양을 빌린다(LIB-257 spec §9.1 원칙 3 —
// `Nav["stacks"]`를 리터럴로 쓰면 키가 `Tab` 유니온에 묶여 "home" 축소 전후로 tsc가
// 갈린다. `initialNav.stacks`에서 빌리면 `Tab`의 멤버가 몇 개든 그대로 타입이
// 따라온다). 값 자체(각 탭의 루트 화면)는 여전히 계약이 고정한 대로다. `entry`가
// 있는 분기와 없는 분기를 각 동작마다 짝으로 둔다.

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

// LIB-257: 첫 화면이 여정 맵으로 바뀐다(Q1 — 홈 탭까지 없앤다). 기존 "네 탭의 스택이
// …" 한 케이스를 셋으로 나눈다(test-plan unit § `navigation.unit.test.ts`).
describe("initialNav (LIB-257)", () => {
  // I1
  it("I1. initialNav.tab이 journey다", () => {
    expect(initialNav.tab).toBe("journey");
  });

  // I2
  it("I2. currentScreen(initialNav)이 여정 맵이고 activeStack(initialNav)이 여정 스택이다", () => {
    expect(currentScreen(initialNav)).toEqual({ name: "journey-map" });
    expect(activeStack(initialNav)).toEqual(initialNav.stacks.journey);
  });

  // I3
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
  // 1. push / entry 비었을 때 → 현재 탭 스택에 쌓인다. 다른 탭 스택은 그대로다
  it("1. push / entry 비었을 때 → 현재 탭 스택에 쌓이고 다른 탭 스택은 그대로다", () => {
    const n = nav({ tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "settings" } });

    expect(next.entry).toEqual([]);
    expect(next.tab).toBe("journey");
    expect(next.stacks.journey).toEqual([{ name: "journey-map" }, { name: "settings" }]);
    expect(next.stacks.roleplay).toEqual(baseStacks.roleplay);
    expect(next.stacks.settings).toEqual(baseStacks.settings);
  });

  // 2. push / entry 있을 때 → entry에 쌓이고 탭 스택은 그대로다
  it("2. push / entry 있을 때 → entry에 쌓이고 탭 스택은 그대로다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "settings" } });

    expect(next.entry).toEqual([{ name: "roleplay-list" }, { name: "settings" }]);
    expect(next.tab).toBe("journey");
    expect(next.stacks).toEqual(baseStacks);
  });

  // 3. back / entry 비었을 때 → 현재 탭 스택에서 하나 빠진다
  it("3. back / entry 비었을 때 → 현재 탭 스택에서 하나 빠진다", () => {
    const n = nav({
      tab: "journey",
      stacks: { ...baseStacks, journey: [{ name: "journey-map" }, { name: "settings" }] },
    });

    const next = navReducer(n, { type: "back" });

    expect(next.entry).toEqual([]);
    expect(next.stacks.journey).toEqual([{ name: "journey-map" }]);
  });

  // 4. back / entry 있을 때 → entry에서 하나 빠진다
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

  // 5. back / 활성 스택 길이 1 → 입력을 동일 참조로 돌려준다
  it("5. back / 활성 스택 길이 1 → 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "journey", stacks: baseStacks });

    expect(navReducer(n, { type: "back" })).toBe(n);
  });

  // 6. back / entry 길이 1 → entry를 비우지 않는다. 동일 참조
  it("6. back / entry 길이 1 → entry를 비우지 않고 동일 참조를 돌려준다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "back" });

    expect(next).toBe(n);
    expect(next.entry).toEqual([{ name: "roleplay-list" }]);
  });

  // 7. replace / entry 비었을 때 → 탭 스택 최상단이 바뀌고 길이는 그대로다
  it("7. replace / entry 비었을 때 → 탭 스택 최상단이 바뀌고 길이는 그대로다", () => {
    const n = nav({
      tab: "journey",
      stacks: { ...baseStacks, journey: [{ name: "journey-map" }, { name: "settings" }] },
    });

    const next = navReducer(n, { type: "replace", screen: { name: "roleplay-list" } });

    expect(next.stacks.journey).toEqual([{ name: "journey-map" }, { name: "roleplay-list" }]);
    expect(next.stacks.journey).toHaveLength(2);
  });

  // 8. replace / entry 있을 때 → entry 최상단이 바뀌고 길이는 그대로다
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

  // 9. switchTab → tab이 바뀌고 세 스택이 모두 보존된다 (수용 기준 4의 근거).
  //    integration은 스택 깊이가 1이라 이걸 관찰할 수 없으므로, 여기서 깊이 2 스택을
  //    만들고 왕복(settings → journey → settings)까지 확인한다.
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

  // 10. switchTab / 같은 탭 → 동일 참조
  it("10. switchTab / 이미 그 탭일 때 → 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });

    expect(navReducer(n, { type: "switchTab", tab: "settings" })).toBe(n);
  });

  // 11. enterApp → entry가 비고 tab·stacks는 그대로다. 그 뒤 activeStack이 현재 탭
  //     스택을 돌려준다 (수용 기준 3)
  it("11. enterApp → entry가 비고 tab·stacks는 그대로다. 이후 activeStack은 현재 탭 스택이다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "enterApp" });

    expect(next.entry).toEqual([]);
    expect(next.tab).toBe("journey");
    expect(next.stacks).toEqual(baseStacks);
    expect(activeStack(next)).toEqual(baseStacks.journey);
  });

  // 12. enterApp / entry가 이미 비었을 때 → 동일 참조
  it("12. enterApp / entry가 이미 비었을 때 → 동일 참조를 돌려준다", () => {
    const n = nav({ entry: [], tab: "settings", stacks: baseStacks });

    expect(navReducer(n, { type: "enterApp" })).toBe(n);
  });

  // switchTab은 entry 상태를 보지 않는다 — entry가 채워져 있어도 tab을 바꾼다.
  // (switchTab은 여전히 진입 구간에서 부를 자리가 없다 — LIB-261부터 `back`은
  // 코드 검증의 "로그인으로" 나가기가 실제로 부른다(§9.4 #3). 리듀서 자체는
  // 어느 쪽도 막지 않는다)
  it("switchTab은 entry를 보지 않는다 — entry가 있어도 tab이 바뀐다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "journey", stacks: baseStacks });

    const next = navReducer(n, { type: "switchTab", tab: "settings" });

    expect(next.tab).toBe("settings");
    expect(next.entry).toEqual([{ name: "roleplay-list" }]);
  });
});

// -------------------------------------------------------------- LIB-245 계약 §3.2
// `backToRoot` — 활성 스택(entry가 있으면 entry, 없으면 현재 탭 스택)을 루트 하나로
// 줄인다. 어떤 분기도 깊이를 세지 않는다 — 활성 스택 길이가 1이면 동일 참조를
// 돌려주고, 그 밖의 길이는 전부 첫 원소 하나로 준다.
//
// U1·U2는 entry가 없는 분기(전이표 1행)를, U3은 entry가 있는 분기(전이표 3행)를
// 짓는다 — 두 분기를 짝으로 두어 어느 쪽이 활성 스택인지에 상관없이 같은 규칙이
// 적용됨을 본다. U4·U5는 각 분기의 길이-1 동일 참조(전이표 2·4행)를, U6은
// backToRoot가 switchTab·enterApp과 갈리는 자리(tab 유지·entry 비우지 않음)를 짓는다.
describe("navReducer — backToRoot (LIB-245)", () => {
  // U1. entry 비었고 활성 스택(현재 탭 스택) 길이 3 → 현재 탭 스택이 루트 하나로
  //     준다. 다른 탭 스택·tab·entry는 그대로다 (계약 §3.2 표 1행).
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

  // U2. entry 비었고 활성 스택 길이 2 → 루트 하나로 준다. 길이 2에서는 `back`(하나만
  //     pop)과 `backToRoot`(루트까지 줄이기)의 결과가 우연히 같은 자리에 온다 —
  //     깊이를 세지 않는 backToRoot도 새 객체를 만든다는 것을 여기서 명시적으로 짓는다
  //     (계약 §3.2 표 1행 · "어떤 분기도 깊이를 세지 않는다").
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

  // U3. entry 안 비었고 entry 길이 3 → entry가 첫 원소 하나로 준다. stacks·tab은
  //     그대로다 (계약 §3.2 표 3행).
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

  // U4. entry 비었고 활성 스택 길이 1 → 동일 참조를 돌려준다 (계약 §3.2 표 2행).
  it("U4. entry 비었고 활성 스택 길이 1 → 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });

    expect(navReducer(n, { type: "backToRoot" })).toBe(n);
  });

  // U5. entry 길이 1 → 동일 참조를 돌려준다 (계약 §3.2 표 4행).
  it("U5. entry 길이 1 → 동일 참조를 돌려준다", () => {
    const n = nav({ entry: [{ name: "roleplay-list" }], tab: "settings", stacks: baseStacks });

    expect(navReducer(n, { type: "backToRoot" })).toBe(n);
  });

  // U6. backToRoot는 tab을 바꾸지 않고 entry를 비우지 않는다 — switchTab·enterApp과
  //     갈리는 자리다. entry가 있을 때도 tab은 그대로이고, entry가 []가 되지
  //     않는다(enterApp이라면 []가 됐을 자리). 줄어든 모양(첫 원소 하나)은 U3이 진다
  //     — 여기서는 갈리는 자리만 본다.
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

// ---------------------------------------------------------------- LIB-223 계약 §3.1(c)
// `listening`이 `Screen` union에 든 뒤의 스택 동작. 리듀서는 화면의 내용을 모르므로
// 여기서 보는 것은 둘이다 — **화면 파라미터(`stepId`)가 스택을 타고 그대로 나오는가**,
// 그리고 **탭을 왕복해도 학습 화면이 여정 스택에 남는가**.
//
// `Screen` union의 exhaustiveness는 `tsc`가 진다 — App.tsx의 `const exhaustive: never`
// 한 줄이 그 게이트다. 런타임 단언으로 흉내 내지 않는다 (계약 §3.1(c)).
//
// 계약 §3.1(c)의 표는 `navReducer(initialNav, push(...))`로 적었다. 여기서는
// `initialNav.tab`의 실제 값에 기대지 않고 항상 여정 탭으로 전환한 뒤 push한다 —
// 표의 기대 출력 칸이 **여정 탭 스택**을 말하기 때문이고, 실제 결선(App)도 여정
// 탭에서만 이 push를 낸다(`initialNav.tab`이 이미 journey라도 switchTab은 동일
// 참조를 돌려줄 뿐이라 안전하다).
describe("navReducer — listening 화면 (LIB-223)", () => {
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

    const away = navReducer(pushed, { type: "switchTab", tab: "settings" });
    const back = navReducer(away, { type: "switchTab", tab: "journey" });

    expect(away.tab).toBe("settings");
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
// 가능한 동작**(평가 화면이 실제로 뜬다 · `backToRoot` 하나로 맵에 닿는다 · 미통과면
// 진행이 갱신되지 않는다)의 판정자는 `App.integration.test.tsx`의 **I1 · I3 · I6**이다.
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

// -------------------------------- 롤플레이 route 사상 (LIB-255 계약 §2.6)
// 계획: .agent-harness/work/lib-255/test-plan.md unit § `navigation.unit.test.ts`
// (추가 — 기존 케이스 불변). 케이스 ID는 계획의 N1~N4 그대로다.

describe("roleplayScreenFor (LIB-255)", () => {
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

  // N1
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

  // N2
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

  // N3 — 기대 화면은 roleplayScreenFor를 다시 불러 만들지 않는다(자기참조 오라클을
  // 피한다). phone-call 항목을 골라, 스텁이 언제나 돌려주는 roleplay-messenger와
  // 어긋나야 이 케이스가 화면 사상 자체의 정확성도 함께 걸게 한다.
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

  // N4
  it("N4. 이어서 backToRoot → 롤플레이 스택이 루트 하나로 돌아오고 여정 스택은 여전히 동일 참조다", () => {
    const n = nav({ tab: "roleplay", stacks: baseStacks });
    const screen = roleplayScreenFor(messengerRoleplayItem);
    const pushed = navReducer(n, { type: "push", screen });

    const next = navReducer(pushed, { type: "backToRoot" });

    expect(next.stacks.roleplay).toEqual([{ name: "roleplay-list" }]);
    expect(next.stacks.journey).toBe(baseStacks.journey);
  });
});

// -------------------------------- 알림 route (LIB-257 계약 §2.1)
// 계획: .agent-harness/work/lib-257/test-plan.md unit § `navigation.unit.test.ts`.
// 알림 route는 `Screen`에 필드 없는 멤버 하나로만 존재한다 — 목록은 App이 넘기고
// 알림 화면에는 진행이 없다(계약 §2.1). 여기서 보는 것은 스택 동작뿐이다.
describe("알림 route (LIB-257)", () => {
  // NV1
  it("NV1. push(notifications) → 여정 스택에 알림이 쌓이고 다른 탭 스택은 동일 참조다", () => {
    const next = navReducer(initialNav, { type: "push", screen: { name: "notifications" } });

    expect(next.stacks.journey).toEqual([{ name: "journey-map" }, { name: "notifications" }]);
    expect(currentScreen(next)).toEqual({ name: "notifications" });
    expect(next.stacks.roleplay).toBe(initialNav.stacks.roleplay);
    expect(next.stacks.settings).toBe(initialNav.stacks.settings);
  });

  // NV2 — D-a·D6.1: 알림에서 연 특별 유닛에서 backToRoot하면 여정 맵으로 돌아간다.
  // 알림으로 되돌아가지 않는다(알림은 여정 스택 중간 화면일 뿐이다).
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

// -------------------------------- tabRootActions (LIB-257 계약 §0.3 D-c · §2.1)
// 계획: .agent-harness/work/lib-257/test-plan.md unit § `navigation.unit.test.ts`.
// `tabRootActions`는 부수효과가 없다 — 반환한 동작 목록을 App이 순서대로
// `dispatch`한다. 여기서는 (1) 반환값의 모양과 (2) 그 값을 `navReducer`로 순서대로
// 접었을 때의 결과를 본다.
describe("tabRootActions (LIB-257)", () => {
  // NV3
  it("NV3. tabRootActions(roleplay)이 switchTab·backToRoot 순서다", () => {
    expect(tabRootActions("roleplay")).toEqual([
      { type: "switchTab", tab: "roleplay" },
      { type: "backToRoot" },
    ]);
  });

  // NV4
  it("NV4. 세 탭 각각에서 길이 2 — 첫째가 switchTab, 둘째가 backToRoot다", () => {
    const tabs: readonly Tab[] = ["journey", "roleplay", "settings"];

    for (const tab of tabs) {
      const actions = tabRootActions(tab);

      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual({ type: "switchTab", tab });
      expect(actions[1]).toEqual({ type: "backToRoot" });
    }
  });

  // NV5 — 기대 화면은 리터럴로 쓴다(tabRootActions를 다시 불러 기대값을 만들지
  // 않는다 — 자기참조 오라클을 피한다).
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

  // NV6
  it("NV6. 롤플레이 스택이 이미 루트 하나일 때도 같은 접기가 동일 참조를 돌려준다", () => {
    const n = nav({ tab: "journey", stacks: baseStacks });

    const next = tabRootActions("roleplay").reduce(navReducer, n);

    expect(next.tab).toBe("roleplay");
    expect(next.stacks.roleplay).toBe(n.stacks.roleplay);
  });

  // NV7 (가드) — 부수효과 없음. 같은 인자로 두 번 불러 toEqual, 접기 전후로 입력
  // nav 객체가 바뀌지 않는다.
  it("NV7. (가드) 부수효과 없음 — 같은 인자로 두 번 불러도 같은 값이고 입력 nav가 바뀌지 않는다", () => {
    expect(tabRootActions("settings")).toEqual(tabRootActions("settings"));

    const n = nav({ tab: "journey", stacks: baseStacks });
    const before = JSON.parse(JSON.stringify(n)) as Nav;

    tabRootActions("roleplay").reduce(navReducer, n);

    expect(n).toEqual(before);
  });
});

// -------------------------------- 설정 탭의 새 route — profile · terms (LIB-259)
// 계약: .agent-harness/work/lib-259/spec.md §2.2. 계획:
// .agent-harness/work/lib-259/test-plan.md unit § `app/navigation.unit.test.ts`
// (수정 — 기존 케이스 유지 + 추가). 케이스 id는 계획의 NV1~NV3 그대로다 — 위
// "알림 route (LIB-257)"·"tabRootActions (LIB-257)" 구역의 NV1~NV7과 이름이
// 겹치지만 각자 자기 describe 안에서만 유효한 지역 라벨이고 이 리듀서는 화면
// 이름을 모르는 제네릭 함수라 별도 스텁 없이 처음부터 통과한다(기대 red 0 —
// test-plan.md unit red 기대 표).
describe("navReducer — 설정 탭의 새 route (LIB-259)", () => {
  // NV1
  it("NV1. push(profile) → 설정 탭 스택에 쌓이고 다른 두 스택은 동일 참조다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "profile" } });

    expect(next.stacks.settings).toEqual([{ name: "settings" }, { name: "profile" }]);
    expect(next.stacks.journey).toBe(baseStacks.journey);
    expect(next.stacks.roleplay).toBe(baseStacks.roleplay);
  });

  // NV2
  it("NV2. push(terms) → 설정 탭 스택에 쌓이고 다른 두 스택은 동일 참조다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });

    const next = navReducer(n, { type: "push", screen: { name: "terms" } });

    expect(next.stacks.settings).toEqual([{ name: "settings" }, { name: "terms" }]);
    expect(next.stacks.journey).toBe(baseStacks.journey);
    expect(next.stacks.roleplay).toBe(baseStacks.roleplay);
  });

  // NV3
  it("NV3. 프로필을 push한 뒤 backToRoot → 설정 탭 스택이 [{ name: settings }]다", () => {
    const n = nav({ tab: "settings", stacks: baseStacks });
    const pushed = navReducer(n, { type: "push", screen: { name: "profile" } });

    const next = navReducer(pushed, { type: "backToRoot" });

    expect(next.stacks.settings).toEqual([{ name: "settings" }]);
  });
});

// -------------------------------------------- 진입 흐름 (LIB-261 계약 §2.7)
// 계획: .agent-harness/work/lib-261/test-plan.md unit § `app/navigation.unit.test.ts`
// (수정 — 기존 케이스는 한 줄도 고치지 않는다). 케이스 id는 계획의 NV1~NV4
// 그대로다 — 위 "알림 route (LIB-257)"·"tabRootActions (LIB-257)"·"설정 탭의 새
// route (LIB-259)" 구역의 NV1~NV7과 이름이 겹치지만, 이 파일의 기존 관행처럼
// 각자 자기 describe 안에서만 유효한 지역 라벨이다.
//
// ⭐ 기존 I3(`initialNav.entry`가 `[]`)은 이 구역이 건드리지 않는다 — 이 계약이
// `initialNav`를 고치지 않기 때문이다(계약 §9.3).
describe("진입 흐름 (LIB-261)", () => {
  // NV1
  it("NV1. entryInitialNav.entry가 길이 1이고 최상단이 splash다", () => {
    expect(entryInitialNav.entry).toHaveLength(1);
    expect(entryInitialNav.entry[0]).toEqual({ name: "splash" });
  });

  // NV2
  it("NV2. entryInitialNav의 tab·stacks가 initialNav와 같다", () => {
    expect(entryInitialNav.tab).toBe(initialNav.tab);
    expect(entryInitialNav.stacks).toEqual(initialNav.stacks);
  });

  // NV3
  it("NV3. entryScreenAfterLogin이 phone→verification-code, 나머지 수단→language-select다", () => {
    expect(entryScreenAfterLogin("phone")).toEqual({ name: "verification-code" });
    expect(entryScreenAfterLogin("google")).toEqual({ name: "language-select" });
    expect(entryScreenAfterLogin("apple")).toEqual({ name: "language-select" });
    expect(entryScreenAfterLogin("facebook")).toEqual({ name: "language-select" });
  });

  // NV4
  it("NV4. isEntrySection이 entryInitialNav에서 참, initialNav에서 거짓이다", () => {
    expect(isEntrySection(entryInitialNav)).toBe(true);
    expect(isEntrySection(initialNav)).toBe(false);
  });
});

// 계약: .agent-harness/work/lib-263/spec.md §5.3 · §6.1 unit 표의 NP2.
//
// 탐침 화면은 **도달 불가**라는 것이 그 정의다(§5.1 후보 B). 소스 grep 셋(§5.3의
// 1~3번)은 사람이 diff를 읽을 때 돌리는 것이고, 이 케이스가 그 판정의 **파수꾼**이다 —
// 누가 나중에 탐침을 제품 부팅에 끼워 넣으면 러너가 운다.
//
// NP2는 `Screen` union에 탐침 멤버가 없을 때도 성립한다 — 부팅 상태에 실린 화면 이름을
// 모아 그 중에 탐침이 없다는 것만 보기 때문이고, 멤버가 생긴 뒤에도 같은 글자로 남는다.
// 그래서 그 케이스는 처음부터 초록이었다 — **구현이 없어서가 아니라 부재가 곧 기대값
// 이라서**다. NP1·NP3은 `handwritingProbeNav` export가 선 지금 함께 올린다.
//
// ⭐ LIB-261이 들어온 뒤 NP2의 단언 대상이 늘었다: 앱이 실제로 부팅하는 상태는
// `initialNav`가 아니라 `entryInitialNav`다(`App.tsx`의 `useReducer` 둘째 인자).
// 하나만 훑으면 파수꾼이 낡아 아무것도 안 지키므로 제품 부팅 상태를 모두 훑는다.
describe("탐침 route 도달 경로 (LIB-263)", () => {
  // NP1
  it("NP1. handwritingProbeNav는 여정 탭 스택에 탐침 하나만 세우고 entry가 비어 있다", () => {
    expect(handwritingProbeNav.stacks.journey).toEqual([{ name: "handwriting-probe" }]);
    expect(handwritingProbeNav.tab).toBe("journey");
    // `activeStack`이 `entry`를 먼저 고르므로, 여기가 비어 있지 않으면 이 부팅
    // 상태로도 탐침에 닿지 못한다 — 그 불변식을 이 줄이 진다.
    expect(handwritingProbeNav.entry).toEqual([]);
    expect(currentScreen(handwritingProbeNav)).toEqual({ name: "handwriting-probe" });
  });

  // NP2
  it("NP2. 제품 부팅 상태의 entry와 모든 탭 스택 어디에도 탐침 route가 없다", () => {
    const bootedScreenNames = (booted: Nav) =>
      [...booted.entry, ...Object.values(booted.stacks).flat()].map((screen) => screen.name);

    expect(bootedScreenNames(initialNav)).not.toContain("handwriting-probe");
    expect(bootedScreenNames(entryInitialNav)).not.toContain("handwriting-probe");
  });

  // NP3
  it("NP3. 나머지 탭 스택은 initialNav와 같다 — 부팅 상태를 여정 탭 한 자리만 바꾼다", () => {
    expect(handwritingProbeNav.stacks.roleplay).toEqual(initialNav.stacks.roleplay);
    expect(handwritingProbeNav.stacks.settings).toEqual(initialNav.stacks.settings);
  });
});
