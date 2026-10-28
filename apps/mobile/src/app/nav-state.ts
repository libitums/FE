// 화면 전환 상태의 모양을 소유합니다 — `Tab`·`Screen`·`Nav`·`NavAction` 타입과
// 초기값(`initialNav`·`entryInitialNav`·`signedOutNav`)입니다. 전이 로직은 `nav-reducer.ts`가
// 집니다.

// `app/` -> `screens/` 방향의 **type-only** import입니다. `import type`은 emit되지 않으므로 런타임 결합이 0이고,
// 어떤 화면도 `navigation.ts`를 import하지 않으므로 순환이 생기지 않습니다(import/no-cycle이 그것을 지킵니다).
// 판정 어휘는 `lib/answer-result.ts`에서 옵니다 — 화면 폴더가 아니라 `lib/`에서
// 가져옵니다.
import type { AnswerResult } from "../lib/answer-result";
import type { CatalogUnitKey } from "../lib/catalog-progress";
// 전화번호 로그인(Supabase OTP)의 공용 어휘입니다 — 코드 검증 화면이 보여 줄 번호를
// 나릅니다.
import type { PhoneNumber } from "../lib/auth-session.contract";
import type { RoleplayEpisodeId } from "../screens/roleplay-list/roleplay-list.contract";

// 탭 목록과 1:1입니다. 순서가 곧 바텀 네비게이션의 좌→우 순서입니다
// (bottom-navigator.contract.ts).
export type Tab = "journey" | "roleplay" | "settings";

// **route 목록과 1:1입니다.** route가 늘면 이 union에 멤버를 더하고, `render-screen.tsx` switch의 exhaustiveness 검사가
// 빠진 화면을 컴파일 타임에 잡습니다. 이름은 최종 화면 이름으로 고정합니다.
export type Screen =
  | { name: "journey-map" }
  | { name: "roleplay-list" }
  | { name: "settings" }
  // 설정 탭의 화면입니다. 필드가 없습니다 — 프로필에 진행도 파라미터가 없고, 내용은 App이
  // 넘깁니다. 방침 · 약관은 route가 아니라 앱 위 브라우저입니다(ADR-0033).
  | { name: "profile" }
  | { name: "feedback" }
  // 설정 탭의 「레슨에 쓰는 이름 · 나라」 화면입니다. 필드가 없습니다 - 지금 값은 App이 넘깁니다.
  | { name: "learner-profile" }
  // 필드가 없습니다 — 목록은 App이 넘기고 알림 화면에는 진행이 없습니다.
  | { name: "notifications" }
  // 카탈로그 에피소드의 표지 컷입니다. 에피소드는 카탈로그 id입니다.
  | { name: "catalog-cover"; episodeId: string }
  // 카탈로그 레슨의 활동 하나입니다. 유닛 하나가 같은 학습형이 이어지는 구간 여럿을 잇습니다.
  | { name: "catalog-lesson"; episodeId: string; unitKey: CatalogUnitKey; activityIndex: number }
  // 카탈로그 막간 이야기 유닛(INT)의 컷입니다(ADR-0088).
  | { name: "catalog-story"; episodeId: string; unitKey: CatalogUnitKey }
  // 카탈로그 최종 테스트(RP)입니다.
  | { name: "catalog-final"; episodeId: string }
  // 레슨 · 최종 테스트 공용 결과 화면입니다. 역할은 결선이 `finalKey`와 견줘 파생합니다.
  | {
      name: "catalog-unit-complete";
      episodeId: string;
      unitKey: CatalogUnitKey;
      results: readonly AnswerResult[];
      skippedCount: number;
      /** 채점 문항 수입니다(카드처럼 채점하지 않는 문항은 세지 않습니다) — 통과 기준의 분모입니다. */
      questionCount: number;
    }
  // 최종 테스트 통과 뒤 컷입니다.
  | { name: "catalog-epilogue"; episodeId: string }
  // 에피소드 하나의 롤플레이를 세로로 펼친 화면입니다. 필드는 에피소드 id 하나뿐입니다
  // — 항목과 잠김은 App이 진행에서 파생해 내립니다(넣으면 진행이 바뀌어도 스택에 옛
  // 값이 남습니다).
  | { name: "roleplay-episode"; episodeId: RoleplayEpisodeId }
  // 본편 에피소드의 롤플레이입니다 — 미리보기 → 표지 컷 → 말하기 대화를 한 route가 집니다.
  | { name: "roleplay-story"; episodeId: string }
  | {
      name: "roleplay-story-complete";
      episodeId: string;
      results: readonly AnswerResult[];
      skippedCount: number;
    }
  // 진입 흐름 화면들입니다. 전부 필드가 없습니다 — 온보딩 `step`은 화면 로컬,
  // 언어는 App 상태, 코드 값은 화면 로컬입니다.
  | { name: "splash" }
  | { name: "onboarding" }
  | { name: "login" }
  | { name: "verification-code"; phoneNumber: PhoneNumber }
  // 가입 직후 ① 이름 · ② 나라입니다(ADR-0059 D7 2026-10-20). ①은 미리 채울 이름을, ②는 ①에서 정한 이름을 듭니다
  // — 뒤로 돌아왔을 때 친 값이 그대로 서도록 route가 값을 집니다.
  | { name: "learner-name"; initialName: string }
  | { name: "learner-country"; learnerName: string }
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

// 로그아웃 · 계정 삭제 뒤 새 App 세션의 첫 `Nav`입니다. 진입 구간이 `[온보딩, 로그인]`이고 탭 스택은
// `initialNav`와 같습니다. `NavAction` · 리듀서는 바뀌지 않습니다(`app-start.ts`가 쓴다).
export const signedOutNav: Nav = {
  ...initialNav,
  entry: [{ name: "onboarding" }, { name: "login" }],
};
