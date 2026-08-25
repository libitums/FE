// 화면 전환은 라우터 라이브러리 없이 이 리듀서가 소유한다 (ADR-0007 D3).
// 순수 함수이므로 unit 계층 테스트 대상이다 (ADR-0006 D4).

// 탭 목록·화면 목록과 1:1로 대응한다. 화면이 늘면 여기에 union 멤버를 더하고,
// 그러면 App.tsx의 switch가 빠진 화면을 컴파일 타임에 잡는다.
export type Tab = 'home'

export type Screen = { name: 'home' }

export type Nav = {
  tab: Tab
  // 스택은 하나가 아니라 탭별로 둔다. 세 번째 스택 축은 만들지 않는다.
  stacks: Record<Tab, Screen[]>
}

export type NavAction =
  | { type: 'push'; screen: Screen }
  | { type: 'back' }
  | { type: 'replace'; screen: Screen }
  | { type: 'switchTab'; tab: Tab }

export const initialNav: Nav = {
  tab: 'home',
  stacks: { home: [{ name: 'home' }] },
}

export function currentScreen(nav: Nav): Screen {
  const stack = nav.stacks[nav.tab]
  return stack[stack.length - 1]
}

export function navReducer(nav: Nav, action: NavAction): Nav {
  switch (action.type) {
    case 'push':
      return withStack(nav, [...nav.stacks[nav.tab], action.screen])

    case 'back': {
      const stack = nav.stacks[nav.tab]
      // 스택의 마지막 화면에서는 아무것도 하지 않는다.
      if (stack.length <= 1) return nav
      return withStack(nav, stack.slice(0, -1))
    }

    case 'replace': {
      const stack = nav.stacks[nav.tab]
      return withStack(nav, [...stack.slice(0, -1), action.screen])
    }

    // 탭만 바꾸고 각 스택은 보존한다.
    case 'switchTab':
      return nav.tab === action.tab ? nav : { ...nav, tab: action.tab }
  }
}

function withStack(nav: Nav, stack: Screen[]): Nav {
  return { ...nav, stacks: { ...nav.stacks, [nav.tab]: stack } }
}
