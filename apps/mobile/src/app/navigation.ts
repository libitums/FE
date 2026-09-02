// 화면 전환은 라우터 라이브러리 없이 이 리듀서가 소유한다 (ADR-0007 D3).
// 순수 함수이므로 unit 계층 테스트 대상이다 (ADR-0006 D4).
//
// LIB-221 (logic): 계약(scratchpad/lib221/contracts/navigation.contract.ts)이
// 고정한 동작을 그대로 구현한다. DOM에 의존하지 않는 순수 함수만 둔다.

// 탭 목록과 1:1이다. 네 탭은 docs/screens.md의 "홈 · 여정 · 롤플레이 · 설정"에서 왔다.
// 순서가 곧 바텀 네비게이션의 좌→우 순서다 (bottom-navigator.contract.ts).
export type Tab = "home" | "journey" | "roleplay" | "settings";

// **화면 목록과 1:1이다.** 이번 이슈가 넣는 것은 각 탭의 루트 화면 넷뿐이다.
// 화면이 늘면 이 union에 멤버를 더하고, App.tsx switch의 exhaustiveness 검사가
// 빠진 화면을 컴파일 타임에 잡는다.
//
// 이름은 최종 화면 이름으로 고정한다 (계약 참고).
export type Screen =
  | { name: "home" }
  | { name: "journey-map" }
  | { name: "roleplay-list" }
  | { name: "settings" };

// docs/screens.md 130~136행과 ADR-0007 D3이 적은 모양 그대로다. 필드를 더하지 않는다.
export type Nav = {
  // 탭 밖 구간(스플래시 ~ 여정 선택). 비어 있으면 앱 구간이다.
  entry: Screen[];
  tab: Tab;
  // 스택은 하나가 아니라 탭별로 둔다. 세 번째 스택 축은 만들지 않는다.
  stacks: Record<Tab, Screen[]>;
};

// 다섯이다. 넷에서 `enterApp`이 늘었다.
export type NavAction =
  | { type: "push"; screen: Screen }
  | { type: "back" }
  | { type: "replace"; screen: Screen }
  | { type: "switchTab"; tab: Tab }
  | { type: "enterApp" };

// 계약이 고정한 리터럴이다. 각 탭 스택은 자기 루트 화면 하나로 시작하고,
// `entry`는 비어 있다 — 진입 화면(스플래시 등)은 아직 없다(구현 순서 11번이 채운다).
export const initialNav: Nav = {
  entry: [],
  tab: "home",
  stacks: {
    home: [{ name: "home" }],
    journey: [{ name: "journey-map" }],
    roleplay: [{ name: "roleplay-list" }],
    settings: [{ name: "settings" }],
  },
};

// 활성 스택 선택 규칙: `entry`가 비어 있지 않으면 `entry`, 아니면 현재 탭의 스택이다.
export function activeStack(nav: Nav): readonly Screen[] {
  return nav.entry.length > 0 ? nav.entry : nav.stacks[nav.tab];
}

// 활성 스택의 최상단. 활성 스택은 불변식에 의해 비지 않으므로 방어 분기를 두지 않는다.
export function currentScreen(nav: Nav): Screen {
  const stack = activeStack(nav);
  return stack[stack.length - 1] as Screen;
}

export function navReducer(nav: Nav, action: NavAction): Nav {
  switch (action.type) {
    case "push": {
      if (nav.entry.length > 0) {
        return { ...nav, entry: [...nav.entry, action.screen] };
      }
      return {
        ...nav,
        stacks: { ...nav.stacks, [nav.tab]: [...nav.stacks[nav.tab], action.screen] },
      };
    }
    case "back": {
      if (nav.entry.length > 0) {
        if (nav.entry.length <= 1) {
          return nav;
        }
        return { ...nav, entry: nav.entry.slice(0, -1) };
      }
      const stack = nav.stacks[nav.tab];
      if (stack.length <= 1) {
        return nav;
      }
      return { ...nav, stacks: { ...nav.stacks, [nav.tab]: stack.slice(0, -1) } };
    }
    case "replace": {
      if (nav.entry.length > 0) {
        return { ...nav, entry: [...nav.entry.slice(0, -1), action.screen] };
      }
      const stack = nav.stacks[nav.tab];
      return {
        ...nav,
        stacks: { ...nav.stacks, [nav.tab]: [...stack.slice(0, -1), action.screen] },
      };
    }
    case "switchTab": {
      if (nav.tab === action.tab) {
        return nav;
      }
      return { ...nav, tab: action.tab };
    }
    case "enterApp": {
      if (nav.entry.length === 0) {
        return nav;
      }
      return { ...nav, entry: [] };
    }
  }
}
