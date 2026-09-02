// 화면 전환은 라우터 라이브러리 없이 이 리듀서가 소유한다 (ADR-0007 D3).
// 순수 함수이므로 unit 계층 테스트 대상이다 (ADR-0006 D4).
//
// LIB-221 뼈대(logic-scaffold): 타입·시그니처는 계약
// (scratchpad/lib221/contracts/navigation.contract.ts) 그대로 실재하지만,
// 함수 본문과 `initialNav` 값은 아직 무동작 자리 표시자다. 실제 동작은
// 뒤이은 `logic` 변형이 채운다.

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

// 자리 표시자 값. 타입은 계약대로 실재하지만 각 탭 스택을 비워 두었다 —
// 계약이 요구하는 리터럴(각 탭 루트 화면 하나씩)은 `logic` 변형이 채운다.
// 지금 이 값을 실제 리터럴로 채우면 아직 없는 동작(activeStack 등)이 우연히
// 옳아 보일 수 있어, 무동작 껍데기라는 이 단계의 목적이 흐려진다.
export const initialNav: Nav = {
  entry: [],
  tab: "home",
  stacks: {
    home: [],
    journey: [],
    roleplay: [],
    settings: [],
  },
};

// 자리 표시자. 호출되면 실패한다 — `logic` 변형이 실동작으로 교체한다.
export function activeStack(_nav: Nav): readonly Screen[] {
  throw new Error("activeStack: not implemented (logic-scaffold)");
}

// 자리 표시자. 호출되면 실패한다 — `logic` 변형이 실동작으로 교체한다.
export function currentScreen(_nav: Nav): Screen {
  throw new Error("currentScreen: not implemented (logic-scaffold)");
}

// 자리 표시자. 호출되면 실패한다 — `logic` 변형이 실동작으로 교체한다.
export function navReducer(_nav: Nav, _action: NavAction): Nav {
  throw new Error("navReducer: not implemented (logic-scaffold)");
}
