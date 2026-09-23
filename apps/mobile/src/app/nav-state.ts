// 화면 전환 상태의 모양을 소유합니다 — `Tab`·`Screen`·`Nav`·`NavAction` 타입과
// 초기값 둘(`initialNav`·`entryInitialNav`)입니다. 전이 로직은 `nav-reducer.ts`가
// 집니다.

// `app/` -> `screens/` 방향의 **type-only** import입니다. `import type`은
// emit되지 않으므로 런타임 결합이 0이고, 어떤 화면도 `navigation.ts`를 import하지
// 않으므로 순환이 생기지 않습니다(import/no-cycle이 그것을 지킵니다).
// 스텝 id는 여정 맵의 도메인 어휘이므로 선언은 소유자(journey-map.ts)에 둡니다.
import type { JourneyStepId } from "../screens/journey-map/journey-map";
// 판정 어휘는 `lib/answer-result.ts`에서 옵니다 — 화면 폴더가 아니라 `lib/`에서
// 가져옵니다.
import type { AnswerResult } from "../lib/answer-result";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";

// 탭 목록과 1:1입니다. 순서가 곧 바텀 네비게이션의 좌→우 순서입니다
// (bottom-navigator.contract.ts).
export type Tab = "journey" | "roleplay" | "settings";

// **route 목록과 1:1입니다 — 화면 컴포넌트와는 더 이상 1:1이 아닙니다.**
// `roleplay-messenger`·`roleplay-phone-call`·`roleplay-visual-novel` 셋은
// `MessengerScreen`·`PhoneCallScreen`·`VisualNovelScreen` 각각을 route
// 둘(여정·롤플레이)로 엽니다. route가 늘면 이 union에 멤버를 더하고, `App.tsx`
// switch의 exhaustiveness 검사가 빠진 화면을 컴파일 타임에 잡습니다.
//
// 이름은 최종 화면 이름으로 고정합니다.
//
// **스텝을 지는 멤버(`listening`·`sentence-order`·`word-choice`·`culture`·
// `culture-quiz`·`assessment`)는 필드가 `stepId` 하나뿐입니다** — 진행도 문항
// 인덱스도 넣지 않습니다(ADR-0007 D3). 진행은 App의 것이고 문항 인덱스는 화면
// 로컬이라, 넣으면 `back` 한 번에 사라질 값이 라우팅 상태에 남습니다.
// `stepOrdinal`도 넣지 않습니다 — `stepId`에서 파생 가능한 값을 따로 두면 둘이
// 어긋납니다. `assessment`만 예외로 `results`를 더 가집니다 — 듣기 세션이 이미
// 사라진 뒤라 어디에서도 파생되지 않고, 정확히 이 화면 인스턴스의 것이라 `back`과
// 함께 죽는 것이 맞습니다.
export type Screen =
  | { name: "journey-map" }
  | { name: "roleplay-list" }
  | { name: "settings" }
  // 설정 탭의 화면 둘입니다. 필드가 없습니다 — 프로필·약관에 진행도 파라미터도
  // 없고, 내용은 App이 넘깁니다.
  | { name: "profile" }
  | { name: "terms" }
  // 필드가 없습니다 — 목록은 App이 넘기고 알림 화면에는 진행이 없습니다.
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
  // 롤플레이 탭에서 여는 특별 유닛 route 셋입니다. 여정 쪽 route(`messenger` ·
  // `phone-call` · `visual-novel`)와 컴포넌트를 공유하지만 화면 자리가 다릅니다.
  | { name: "roleplay-messenger"; unitId: MessengerUnitId }
  | { name: "roleplay-phone-call"; unitId: PhoneCallUnitId }
  | { name: "roleplay-visual-novel"; unitId: VisualNovelUnitId }
  // 진입 흐름 화면들입니다. 전부 필드가 없습니다 — 온보딩 `step`은 화면 로컬,
  // 언어는 App 상태, 코드 값은 화면 로컬입니다.
  | { name: "splash" }
  | { name: "onboarding" }
  | { name: "login" }
  | { name: "verification-code"; phoneNumber?: string }
  | { name: "language-select" }
  | { name: "journey-entry" }
  // 손글씨 탐침 route입니다. 필드가 없습니다 — 탐침 화면은 스텝도 유닛도 받지
  // 않습니다. **어느 코드도 이 화면을 push하지 않습니다** — 멤버가 여기 서는
  // 이유는 `App.tsx`의 `never` 망라가 case를 강제해서 개발자가
  // `handwritingProbeNav`로 부팅 상태만 바꿔 끼우면 닿게 하기 위해서입니다.
  | { name: "handwriting-probe" }
  // 말하기 탐침 route입니다. 손글씨 탐침과 같은 성질입니다 — 필드가 없고,
  // **어느 코드도 이 화면을 push하지 않습니다.**
  | { name: "speech-probe" };

// 롤플레이 route 셋만 좁힌 타입입니다. `renderRoleplayUnitScreen`의 매개변수
// 타입이 연습 경계를 집니다.
export type RoleplayUnitScreen = Extract<
  Screen,
  { name: "roleplay-messenger" | "roleplay-phone-call" | "roleplay-visual-novel" }
>;

// `docs/screens.md`와 ADR-0007 D3이 적은 모양 그대로입니다. 필드를 더하지 않습니다.
export type Nav = {
  // 탭 밖 구간(스플래시 ~ 여정 선택)입니다. 비어 있으면 앱 구간입니다.
  entry: Screen[];
  tab: Tab;
  // 스택은 하나가 아니라 탭별로 둡니다. 세 번째 스택 축은 만들지 않습니다.
  stacks: Record<Tab, Screen[]>;
};

// 여섯입니다. 다섯에서 `backToRoot`가 늘었습니다(ADR-0007 D6).
export type NavAction =
  | { type: "push"; screen: Screen }
  | { type: "back" }
  | { type: "replace"; screen: Screen }
  | { type: "backToRoot" }
  | { type: "switchTab"; tab: Tab }
  | { type: "enterApp" };

// 계약이 고정한 리터럴입니다. 각 탭 스택은 자기 루트 화면 하나로 시작하고,
// `entry`는 비어 있습니다 — **이 상수 자신은 그렇습니다.** 진입 화면이 있는
// 부팅은 `entryInitialNav`(아래)가 집니다: `App`이 어느 초기값을 쓰느냐로 갈리고,
// `initialNav`는 그 갈림과 무관하게 한 글자도 바뀌지 않습니다. **이 상수가 곧
// 앱의 부팅 상태라는 뜻은 아닙니다** — `App`은 `entryInitialNav`로 부팅하고, 앱
// 구간만 보려는 기존 integration 파일들은 `renderApp` 헬퍼로 진입 구간을
// 통과합니다.
//
// 첫 화면이 여정 맵입니다. `stacks`에 `home` 키가 없습니다.
export const initialNav: Nav = {
  entry: [],
  tab: "journey",
  stacks: {
    journey: [{ name: "journey-map" }],
    roleplay: [{ name: "roleplay-list" }],
    settings: [{ name: "settings" }],
  },
};

// `initialNav`를 고치지 않는 것이 이 값의 핵심 설계입니다 — 기존 integration
// 파일들의 부팅 화면을 이 단위가 바꾸지 않기 위해서입니다. `tab`·`stacks`는
// `initialNav`와 같은 값이고 `entry`만 다릅니다. **App이 실제로 `useReducer`에
// 넘기는 부팅 상태가 이것입니다** — `initialNav`가 아닙니다.
export const entryInitialNav: Nav = { ...initialNav, entry: [{ name: "splash" }] };
