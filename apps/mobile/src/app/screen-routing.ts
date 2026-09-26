// 입력을 `Screen`으로 옮기는 사상 셋(`roleplayScreenFor`·`entryScreenAfterLogin`·
// `learningScreenFor`)을 소유합니다.

import type { JourneyStepId } from "../screens/journey-map/journey-map";
// 학습형 어휘도 `lib/`에서 옵니다. `learningScreenFor`가 form을 **인자로 받고
// 스스로 조회하지 않는** 이유가 여기 있습니다 — 조회하면 journey-map.ts에서
// **값**을 가져오게 되어 `app/ -> screens/` type-only 규약이 깨집니다. 값은
// App이 읽어 내립니다.
import type { LearningForm } from "../lib/learning-form";
import type { EntryLoginMethod } from "../lib/entry-flow";
// 롤플레이 route 셋의 `roleplayScreenFor`가 받는 판별 입력입니다. `roleplay-list`
// 폴더는 `screens/` 사이 값 import 금지에 걸리지 않습니다 — 이 import는 `import type`입니다.
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import type { RoleplayUnitScreen, Screen } from "./nav-state";

// `default` 없는 `switch (item.form)`입니다. 필드는 둘뿐이고 던지지 않습니다 —
// `learningScreenFor`와 같은 자리·같은 근거입니다.
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

// `default` 없는 switch입니다. 수단이 늘면 TS2366으로 섭니다. `phone`만 코드
// 검증을 거칩니다(`requiresVerificationCode`와 같은 축). `phoneNumber`는 코드
// 검증 화면이 보여 줄 번호입니다(2026-09-21 디자인 반영). 없으면 싣지 않습니다.
export function entryScreenAfterLogin(method: EntryLoginMethod, phoneNumber?: string): Screen {
  switch (method) {
    case "phone": {
      return phoneNumber
        ? { name: "verification-code", phoneNumber }
        : { name: "verification-code" };
    }
    case "google":
    case "apple":
    case "facebook": {
      return { name: "language-select" };
    }
  }
}

// 이 함수가 `screen-routing.ts`인 근거는 `Screen`의 소유자가 `nav-state.ts`이고
// `screens/ -> app/` import는 금지라는 것입니다. 그래서 여정 맵에 둘 수 없습니다.
//
// `default` 없는 `switch` 셋이고 던지지 않습니다. `default`를 두지 않는 것이
// 핵심입니다 — 다섯째 학습형이 늘면 여기가 `TS2366`으로 서고, 그것을 쓰려면
// `Screen`에 멤버가 있어야 하고, 더하면 App.tsx의 exhaustiveness가 섭니다.
// `navReducer` · `stepSheetReducer`가 쓰는 형태 그대로입니다.
//
// `Record<LearningForm, …>`이 아니라 `switch`인 이유는 돌려주는 것이 스칼라가
// 아니라 필드를 가진 객체이고 `Screen` 멤버들이 균일하지 않기 때문입니다.
export function learningScreenFor(
  form: LearningForm,
  stepId: JourneyStepId,
  activityIndex: number,
): Screen {
  switch (form) {
    case "listening": {
      return { name: "listening", stepId, activityIndex };
    }
    case "sentence-order": {
      return { name: "sentence-order", stepId, activityIndex };
    }
    case "word-choice": {
      return { name: "word-choice", stepId, activityIndex };
    }
    case "culture": {
      return { name: "culture", stepId, activityIndex };
    }
  }
}
