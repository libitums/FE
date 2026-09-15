// LIB-255 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 세 화면 계약에서 가져오는 것은 `import type`이고 그 타입의 소유자가 그 화면이다
// (docs/conventions/code.md 「import」가 허용하는 형태 그대로).
//
// **불리언도 상태도 없다.** 항목에 `status`·`locked`·`completed` 필드가 없으므로
// 완료·잠김 표식을 그릴 입력이 타입에 존재하지 않는다 — 수용 기준 1의 「0건」을
// 타입이 먼저 진다.
//
// **판별자는 `form`이다.** 여정의 `JourneyMapItem.kind`(`"special"`이 메신저를 뜻하는
// 역사적 이름)를 옮겨 오지 않는다 — 목록이 보이는 것이 곧 형태라서 이름이 그 뜻을
// 말하게 한다.

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
