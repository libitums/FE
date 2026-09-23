// `navReducer`와 스택 조회(`activeStack`·`currentScreen`·`isEntrySection`·
// `tabRootActions`)를 소유합니다. 화면 전환은 라우터 라이브러리 없이 이
// 리듀서가 집니다(ADR-0007 D3). 순수 함수이므로 `unit` 계층 테스트 대상입니다
// (ADR-0006 D4).

import type { Nav, NavAction, Screen, Tab } from "./nav-state";

// `entry`가 비어 있지 않으면 진입 구간입니다 — `phase` 필드를 만들지 않습니다.
export function isEntrySection(nav: Nav): boolean {
  return nav.entry.length > 0;
}

// 탭을 바꾸고 그 탭 스택을 루트로 접는 동작 목록을 돌려줍니다 — 부수효과는
// 없습니다. App이 반환값을 **순서대로** `dispatch`합니다. 새 `NavAction`이
// 아닙니다.
export function tabRootActions(tab: Tab): readonly NavAction[] {
  return [{ type: "switchTab", tab }, { type: "backToRoot" }];
}

// 활성 스택 선택 규칙입니다: `entry`가 비어 있지 않으면 `entry`, 아니면 현재
// 탭의 스택입니다.
export function activeStack(nav: Nav): readonly Screen[] {
  return nav.entry.length > 0 ? nav.entry : nav.stacks[nav.tab];
}

// 활성 스택의 최상단입니다. 활성 스택은 불변식에 의해 비지 않으므로 방어
// 분기를 두지 않습니다.
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
    case "backToRoot": {
      // 목적지는 활성 스택의 루트입니다(ADR-0007 D6). `entry`는 비우지
      // 않습니다 — 비우면 `enterApp`과 갈리는 자리가 사라지고, 「진입 구간으로
      // 되돌아가기」가 열어 둔 보류를 여기서 몰래 닫아버리게 됩니다.
      //
      // 아래 `entry` 분기는 `entry`가 늘 비어 있다는 전제로 죽어 있지 않습니다
      // — `entryInitialNav`부터 `entry`가 실제로 채워집니다. 다만 **이 분기를
      // 부르는 호출자는 오늘도 0건입니다** — 진입 구간에서 되돌아가는 수단은
      // `back`뿐이고(코드 검증의 "로그인으로") `backToRoot`를 진입 구간에서
      // dispatch하는 자리가 없습니다. 그래서 절반만 낡습니다: "entry는 늘
      // 비어 있다"는 거짓이 됐지만 "이 분기를 부르는 곳이 없다"는 여전히
      // 참입니다.
      if (nav.entry.length > 0) {
        if (nav.entry.length <= 1) {
          return nav;
        }
        return { ...nav, entry: nav.entry.slice(0, 1) };
      }
      const stack = nav.stacks[nav.tab];
      if (stack.length <= 1) {
        return nav;
      }
      return { ...nav, stacks: { ...nav.stacks, [nav.tab]: stack.slice(0, 1) } };
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
