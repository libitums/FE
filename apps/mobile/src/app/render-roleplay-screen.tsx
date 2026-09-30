// 롤플레이 route 셋을 화면 컴포넌트로 옮깁니다. 자기 `never` 망라를 따로
// 가집니다.

import { zeroSafeAreaInsets } from "../lib/safe-area";
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
export function renderRoleplayUnitScreen(
  screen: RoleplayUnitScreen,
  wiring: RoleplayUnitWiring,
  insets = zeroSafeAreaInsets,
) {
  switch (screen.name) {
    case "roleplay-messenger":
      return (
        <MessengerScreen
          conversation={messengerConversationFor(screen.unitId)}
          completionStatus={practiceMessengerCompletionStatus()}
          exitTo="roleplay"
          onExit={(outcome) => wiring.onMessengerExit(screen.unitId, outcome)}
          onComplete={wiring.onMessengerComplete}
          onFinish={wiring.onMessengerFinish}
        />
      );
    case "roleplay-phone-call":
      return (
        <PhoneCallScreen
          unitId={screen.unitId}
          conversation={getPhoneCallConversation()}
          completionStatus={practicePhoneCallCompletionStatus()}
          exitTo="roleplay"
          onComplete={wiring.onPhoneCallComplete}
          onExit={wiring.onPhoneCallExit}
        />
      );
    case "roleplay-visual-novel":
      // 완료는 결과 화면으로 이동합니다. 여기서 나가기는 미완료 이탈입니다.
      return (
        <VisualNovelScreen
          insets={insets}
          story={visualNovelStoryFor(screen.unitId)}
          progress={practiceVisualNovelProgress()}
          exitTo="roleplay"
          onAdvance={wiring.onVisualNovelAdvance}
          onExit={(_outcome, beatId) => wiring.onVisualNovelExit(screen.unitId, beatId)}
          onFinish={wiring.onVisualNovelFinish}
        />
      );
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
