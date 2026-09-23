// 롤플레이 목록 화면의 타입 전용 계약입니다 — 구현·JSX를 두지 않습니다. 세 화면
// 계약에서 가져오는 것은 `import type`이고 그 타입의 소유자는 그 화면입니다.
// **판별자는 `form`입니다** — 여정의 `JourneyMapItem.kind`(`"special"`이 메신저를
// 뜻하는 역사적 이름)를 옮겨 오지 않습니다. 목록이 보이는 것이 곧 형태라서 이름이
// 그 뜻을 말하게 합니다.

import type { MessengerConversation, MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallConversation, PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelTitle, VisualNovelUnitId } from "../visual-novel/visual-novel.contract";

export type RoleplayUnitForm = "messenger" | "phone-call" | "visual-novel";

export type RoleplayFormLabel = "메신저" | "전화" | "비주얼 노벨";

export type MessengerRoleplayItem = {
  readonly form: "messenger";
  readonly unitId: MessengerUnitId;
  readonly title: MessengerConversation["title"];
};

export type PhoneCallRoleplayItem = {
  readonly form: "phone-call";
  readonly unitId: PhoneCallUnitId;
  readonly title: PhoneCallConversation["title"];
};

export type VisualNovelRoleplayItem = {
  readonly form: "visual-novel";
  readonly unitId: VisualNovelUnitId;
  readonly title: VisualNovelTitle;
};

/**
 * 여정 항목 하나를 롤플레이 형태로 나타냅니다. **불리언도 상태도 없습니다** —
 * 항목에 `status`·`locked`·`completed` 필드가 없으므로 완료·잠김 표식을 그릴 입력이
 * 타입에 존재하지 않습니다.
 */
export type RoleplayItem = MessengerRoleplayItem | PhoneCallRoleplayItem | VisualNovelRoleplayItem;

export type RoleplayListScreenProps = {
  readonly items: readonly RoleplayItem[];
  readonly onSelectItem: (item: RoleplayItem) => void;
};

export type RoleplayListItemProps = {
  readonly item: RoleplayItem;
  readonly onSelect: (item: RoleplayItem) => void;
};

export type RoleplayListTestId =
  | "roleplay-list-screen-title"
  | "roleplay-list-screen-scroll"
  | "roleplay-list-screen-list"
  | `roleplay-list-item-${RoleplayItem["unitId"]}`
  | `roleplay-list-item-text-${RoleplayItem["unitId"]}`
  | `roleplay-list-item-title-${RoleplayItem["unitId"]}`
  | `roleplay-list-item-form-${RoleplayItem["unitId"]}`;
