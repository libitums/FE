// 롤플레이 route 셋을 화면 컴포넌트로 옮깁니다. 자기 `never` 망라를 따로
// 가집니다.

import { MessengerScreen } from "../screens/messenger/MessengerScreen";
import {
  messengerConversationFor,
  practiceMessengerCompletionStatus,
} from "../screens/messenger/messenger";
import { PhoneCallScreen } from "../screens/phone-call/PhoneCallScreen";
import {
  getPhoneCallConversation,
  practicePhoneCallCompletionStatus,
} from "../screens/phone-call/phone-call";
import { specialUnitExitLabel } from "../lib/special-unit-entry-source";
import { VisualNovelScreen } from "../screens/visual-novel/VisualNovelScreen";
import {
  practiceVisualNovelProgress,
  visualNovelStoryFor,
} from "../screens/visual-novel/visual-novel";
import type { RoleplayUnitScreen } from "./nav-state";
import type { RoleplayUnitWiring } from "./screen-wiring";

// **모듈 수준 함수입니다** — `App` 함수 안의 클로저로 두지 않습니다. 안에 두면
// App 상태를 캡처할 수 있어 연습 경계(매개변수 타입에 여정 상태 필드가
// 없다는 것)가 사라집니다. 자기 `switch`에 `never` 망라를 갖고
// `renderScreen`의 망라도 그대로 섭니다 — 둘 다 섭니다.
export function renderRoleplayUnitScreen(screen: RoleplayUnitScreen, wiring: RoleplayUnitWiring) {
  switch (screen.name) {
    case "roleplay-messenger":
      return (
        <MessengerScreen
          conversation={messengerConversationFor(screen.unitId)}
          completionStatus={practiceMessengerCompletionStatus()}
          exitLabel={specialUnitExitLabel("roleplay")}
          onExit={(outcome) => wiring.onMessengerExit(screen.unitId, outcome)}
          onComplete={wiring.onMessengerComplete}
          onReplay={wiring.onMessengerReplay}
        />
      );
    case "roleplay-phone-call":
      return (
        <PhoneCallScreen
          unitId={screen.unitId}
          conversation={getPhoneCallConversation()}
          completionStatus={practicePhoneCallCompletionStatus()}
          exitLabel={specialUnitExitLabel("roleplay")}
          onComplete={wiring.onPhoneCallComplete}
          onExit={wiring.onPhoneCallExit}
        />
      );
    case "roleplay-visual-novel":
      // 화면의 `onExit` 첫 인자(`outcome`)를 버립니다 — 연습의 `progress`는 늘
      // 처음이라 `visualNovelExitOutcome(progress)`가 늘 `incomplete`라 뜻이
      // 없습니다. 연습의 판정은 `wiring.onVisualNovelExit`을 거쳐
      // `practiceVisualNovelExitOutcome(beatId)`가 집니다.
      return (
        <VisualNovelScreen
          story={visualNovelStoryFor(screen.unitId)}
          progress={practiceVisualNovelProgress()}
          exitLabel={specialUnitExitLabel("roleplay")}
          onAdvance={wiring.onVisualNovelAdvance}
          onExit={(_outcome, beatId) => wiring.onVisualNovelExit(screen.unitId, beatId)}
          onReplay={wiring.onVisualNovelReplay}
        />
      );
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
