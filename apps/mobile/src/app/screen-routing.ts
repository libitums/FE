// 입력을 `Screen`으로 옮기는 사상 둘(`roleplayScreenFor`·`entryScreenAfterLogin`)을 소유합니다.

import type { PhoneNumber } from "../lib/auth-session.contract";
import type { SocialLoginMethod } from "../screens/login/login.contract";
// 롤플레이 route의 `roleplayScreenFor`가 받는 입력입니다. 이 import는 `import type`입니다.
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import type { Screen } from "./nav-state";

// 롤플레이 항목은 본편 에피소드의 이야기 롤플레이 하나입니다. 던지지 않습니다.
export function roleplayScreenFor(item: RoleplayItem): Extract<Screen, { name: "roleplay-story" }> {
  return { name: "roleplay-story", episodeId: item.episodeId };
}

// `default` 없는 switch입니다. 수단이 늘면 TS2366으로 섭니다. `phone`만 코드
// 검증을 거칩니다(`requiresVerificationCode`와 같은 축). `phoneNumber`는 코드
// 검증 화면이 보여 줄 번호입니다(2026-09-21 디자인 반영).
// 로그인 뒤 다음 화면을 가르는 판별 입력입니다. 전화번호는 검증할 번호를 싣습니다.
export type EntryLoginChoice =
  | { readonly method: "phone"; readonly phoneNumber: PhoneNumber }
  | { readonly method: SocialLoginMethod };

// 옵셔널 `phoneNumber?: string` 인자가 사라지고 `EntryLoginChoice` 하나를
// 받는 판별 입력으로 바뀝니다. `phone`은 `PhoneNumber`를 그대로 싣고, 소셜 셋은
// `phoneNumber` 없이 `language-select`로 갑니다.
export function entryScreenAfterLogin(choice: EntryLoginChoice): Screen {
  switch (choice.method) {
    case "phone": {
      return { name: "verification-code", phoneNumber: choice.phoneNumber };
    }
    case "google":
    case "apple":
    case "facebook": {
      return { name: "language-select" };
    }
  }
}
