// 화면 전환은 라우터 라이브러리 없이 이 리듀서가 소유한다 (ADR-0007 D3).
// 순수 함수이므로 unit 계층 테스트 대상이다 (ADR-0006 D4).
//
// LIB-221 (logic): 계약(scratchpad/lib221/contracts/navigation.contract.ts)이
// 고정한 동작을 그대로 구현한다. DOM에 의존하지 않는 순수 함수만 둔다.

// 계약 §8.4: `app/` -> `screens/` 방향의 **type-only** import 하나다. `import type`은
// emit되지 않으므로 런타임 결합이 0이고, 어떤 화면도 `navigation.ts`를 import하지
// 않으므로 순환이 생기지 않는다 (import/no-cycle이 그것을 지킨다).
// 스텝 id는 여정 맵의 도메인 어휘이므로 선언은 소유자(journey-map.ts)에 둔다.
import type { JourneyStepId } from "../screens/journey-map/journey-map";
// LIB-227 계약 §1.8(a): 정오의 어휘를 다시 선언하지 않는다. type-only import 둘째
// 사례이고 근거는 lib-223 §8.4와 같다 — `import type`은 emit되지 않아 런타임 결합이
// 0이고, 어떤 화면도 `navigation.ts`를 import하지 않으므로 순환이 없다.
//
// LIB-229 계약 §1.4(e): 판정 어휘가 lib/answer-result.ts로 승격됐다 — 화면 폴더가
// 아니라 lib/에서 가져온다.
import type { AnswerResult } from "../lib/answer-result";
// LIB-236 계약 §1.3(a)·§1.6(b): 학습형 어휘도 lib/에서 온다. `learningScreenFor`가
// form을 **인자로 받고 스스로 조회하지 않는** 이유가 여기 있다 — 조회하면
// journey-map.ts에서 **값**을 가져오게 되어 위의 type-only 규약이 깨진다. 값은 App이
// 읽어 내린다.
import type { LearningForm } from "../lib/learning-form";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
// LIB-255 계약 §2.6: 롤플레이 route 셋의 `roleplayScreenFor`가 받는 판별 입력이다.
// `roleplay-list` 폴더는 `screens/` 사이 값 import 금지에 걸리지 않는다 — 이 import는
// `import type`이다.
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";

// 탭 목록과 1:1이다. 세 탭은 docs/screens.md의 "여정 · 롤플레이 · 설정"에서 왔다 —
// 홈은 LIB-257이 걷었다(계약 §2.1 · Q1). 순서가 곧 바텀 네비게이션의 좌→우 순서다
// (bottom-navigator.contract.ts).
export type Tab = "journey" | "roleplay" | "settings";

// **route 목록과 1:1이다 — 화면 컴포넌트와는 더 이상 1:1이 아니다** (LIB-255 계약
// §2.6 「대가」). 이번 이슈가 넣는 것은 각 탭의 루트 화면 넷뿐이었지만, LIB-255가
// `roleplay-messenger`·`roleplay-phone-call`·`roleplay-visual-novel` 셋을 더해
// `MessengerScreen`·`PhoneCallScreen`·`VisualNovelScreen` 각각을 route 둘(여정·롤플레이)이
// 연다. route가 늘면 이 union에 멤버를 더하고, App.tsx switch의 exhaustiveness 검사가
// 빠진 화면을 컴파일 타임에 잡는다.
//
// 이름은 최종 화면 이름으로 고정한다 (계약 참고).
// LIB-223: 다섯째 멤버가 는다. 필드는 `stepId` 하나다 — 진행도 문항 인덱스도
// 넣지 않는다(계약 §1.3(a) · ADR-0007 D3). 전자는 App의 것이고 후자는 화면
// 로컬이라, 넣으면 `back` 한 번에 사라질 값이 라우팅 상태에 남는다.
// `stepOrdinal`도 넣지 않는다 — `stepId`에서 파생 가능한 값을 따로 두면 둘이 어긋난다.
// LIB-227: 여섯째 멤버가 는다. `results`는 진행도 문항 인덱스도 아니다 — 듣기
// 세션이 이미 사라진 뒤라 어디에서도 파생되지 않고, 정확히 이 화면 인스턴스의
// 것이라 `back`과 함께 죽는 것이 맞다(계약 §1.8(a)). `stepOrdinal`은 여기서도
// 넣지 않는다 — `App`이 `journeyStepOrdinal(screen.stepId)`로 계산해 내린다.
// LIB-236: 일곱째·여덟째 멤버가 는다. 모양은 `listening`과 문자 그대로 같다 —
// 필드는 `stepId` 하나이고 `stepOrdinal`을 넣지 않는다(계약 §1.6(a), LIB-229 §1.13이
// 적은 그대로). 이 둘이 늘면 App.tsx의 exhaustiveness가 서고, 그것이 빠진 결선을
// 컴파일 타임에 잡는 방식이다(§1.6(c)).
// LIB-238: 아홉째 멤버가 는다. 모양은 `listening`·`sentence-order`·`word-choice`와
// 문자 그대로 같다 — 필드는 `stepId` 하나이고 `stepOrdinal`도 `results`도 넣지
// 않는다. 삽입 지점은 `word-choice`와 `assessment` 사이다 — 마지막에 넣으면
// `assessment` 줄의 세미콜론을 옮겨야 해서 기존 줄이 바뀐다.
// LIB-244: 열째 멤버가 는다. 필드는 `stepId` 하나다 — `stepOrdinal`도 `results`도
// 넣지 않는다(계약 §5.1). 들어오는 전이는 문화 학습의 액션 행 하나이고
// `learningScreenFor`에는 `case`를 더하지 않는다 — 문화 퀴즈는 스텝에 배정되는
// `LearningForm`이 아니다(D6).
export type Screen =
  | { name: "journey-map" }
  | { name: "roleplay-list" }
  | { name: "settings" }
  // LIB-257: route "notifications". 필드가 없다 — 목록은 App이 넘기고 알림
  // 화면에는 진행이 없다(계약 §2.1). 홈 탭의 화면 멤버는 LIB-257이 걷었다(Q1).
  | { name: "notifications" }
  | { name: "listening"; stepId: JourneyStepId }
  | { name: "sentence-order"; stepId: JourneyStepId }
  | { name: "word-choice"; stepId: JourneyStepId }
  | { name: "culture"; stepId: JourneyStepId }
  | { name: "culture-quiz"; stepId: JourneyStepId }
  | { name: "assessment"; stepId: JourneyStepId; results: readonly AnswerResult[] }
  | { name: "messenger"; unitId: MessengerUnitId }
  | { name: "phone-call"; unitId: PhoneCallUnitId }
  | { name: "visual-novel"; unitId: VisualNovelUnitId }
  // LIB-255: 롤플레이 탭에서 여는 특별 유닛 route 셋. 여정 쪽 route(`messenger` ·
  // `phone-call` · `visual-novel`)와 컴포넌트를 공유하지만 화면 자리가 다르다
  // (계약 §2.6 — 기존 route에 `entrySource` 필드를 더하지 않는 근거).
  | { name: "roleplay-messenger"; unitId: MessengerUnitId }
  | { name: "roleplay-phone-call"; unitId: PhoneCallUnitId }
  | { name: "roleplay-visual-novel"; unitId: VisualNovelUnitId };

// LIB-255 계약 §2.6: 롤플레이 route 셋만 좁힌 타입. `renderRoleplayUnitScreen`의
// 매개변수 타입이 연습 경계를 진다(계약 §6 ②).
export type RoleplayUnitScreen = Extract<
  Screen,
  { name: "roleplay-messenger" | "roleplay-phone-call" | "roleplay-visual-novel" }
>;

// LIB-255 (logic): 계약 §2.6의 `default` 없는 `switch (item.form)`. 필드는 둘뿐이고
// 던지지 않는다 — `learningScreenFor`와 같은 자리·같은 근거다.
export function roleplayScreenFor(item: RoleplayItem): RoleplayUnitScreen {
  switch (item.form) {
    case "messenger": {
      return { name: "roleplay-messenger", unitId: item.unitId };
    }
    case "phone-call": {
      return { name: "roleplay-phone-call", unitId: item.unitId };
    }
    case "visual-novel": {
      return { name: "roleplay-visual-novel", unitId: item.unitId };
    }
  }
}

// docs/screens.md 130~136행과 ADR-0007 D3이 적은 모양 그대로다. 필드를 더하지 않는다.
export type Nav = {
  // 탭 밖 구간(스플래시 ~ 여정 선택). 비어 있으면 앱 구간이다.
  entry: Screen[];
  tab: Tab;
  // 스택은 하나가 아니라 탭별로 둔다. 세 번째 스택 축은 만들지 않는다.
  stacks: Record<Tab, Screen[]>;
};

// 여섯이다. 다섯에서 `backToRoot`가 늘었다 (ADR-0007 D6).
export type NavAction =
  | { type: "push"; screen: Screen }
  | { type: "back" }
  | { type: "replace"; screen: Screen }
  | { type: "backToRoot" }
  | { type: "switchTab"; tab: Tab }
  | { type: "enterApp" };

// 계약이 고정한 리터럴이다. 각 탭 스택은 자기 루트 화면 하나로 시작하고,
// `entry`는 비어 있다 — 진입 화면(스플래시 등)은 아직 없다(구현 순서 11번이 채운다).
//
// LIB-257: 첫 화면이 여정 맵이다(계약 §2.1 · Q1 — 홈 탭까지 없앤다). `stacks`에서
// `home` 키를 지웠다 — `Tab`/`Screen` 축소와 같은 커밋 단위다(계약 §9.1 원칙 2).
export const initialNav: Nav = {
  entry: [],
  tab: "journey",
  stacks: {
    journey: [{ name: "journey-map" }],
    roleplay: [{ name: "roleplay-list" }],
    settings: [{ name: "settings" }],
  },
};

// LIB-257 (logic): 계약 §0.3 D-c · §2.1. 탭을 바꾸고 그 탭 스택을 루트로 접는 동작
// 목록을 돌려준다 — 부수효과는 없다. App이 반환값을 **순서대로** `dispatch`한다.
// 새 `NavAction`이 아니다(D6.4가 고정한 여섯이 그대로다).
export function tabRootActions(tab: Tab): readonly NavAction[] {
  return [{ type: "switchTab", tab }, { type: "backToRoot" }];
}

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
    case "backToRoot": {
      // LIB-245 (logic): 목적지는 활성 스택의 루트다 (ADR-0007 D6). `entry`는
      // 비우지 않는다 — 비우면 `enterApp`과 갈리는 자리가 사라지고, D3이 열어 둔
      // "진입 구간으로 되돌아가기" 보류를 여기서 몰래 닫아버리게 된다.
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

// ------------------------------------------- 학습형 → 화면 (LIB-236 계약 §1.6)

// 이 함수가 navigation.ts인 근거: `Screen`의 소유자가 여기이고 `screens/ → app/`
// import는 금지다(위 7~9행의 불변식). 그래서 여정 맵에 둘 수 없다 (§1.6(b)).
//
// `default` 없는 `switch` 셋이고 던지지 않는다 (§1.8). `default`를 두지 않는 것이
// §1.6(c) 1번의 조건이다 — 넷째 학습형(`culture`, 위 case)은 이미 왔다. 다섯째
// 학습형이 늘면 여기가 `TS2366`으로 서고, 그것을 쓰려면 `Screen`에 멤버가 있어야
// 하고, 더하면 App.tsx의 exhaustiveness가 선다.
// `navReducer` · `stepSheetReducer`가 쓰는 형태 그대로다.
//
// `Record<LearningForm, …>`이 아니라 `switch`인 이유는 돌려주는 것이 스칼라가 아니라
// 필드를 가진 객체이고 `Screen` 멤버들이 균일하지 않기 때문이다 (§1.6(d)).
export function learningScreenFor(form: LearningForm, stepId: JourneyStepId): Screen {
  switch (form) {
    case "listening": {
      return { name: "listening", stepId };
    }
    case "sentence-order": {
      return { name: "sentence-order", stepId };
    }
    case "word-choice": {
      return { name: "word-choice", stepId };
    }
    case "culture": {
      return { name: "culture", stepId };
    }
  }
}
