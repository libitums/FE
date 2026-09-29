// 롤플레이 목록 화면의 타입 전용 계약입니다 — 구현·JSX를 두지 않습니다. 세 화면
// 계약에서 가져오는 것은 `import type`이고 그 타입의 소유자는 그 화면입니다.
// **판별자는 `form`입니다** — 여정의 `JourneyMapItem.kind`(`"special"`이 메신저를
// 뜻하는 역사적 이름)를 옮겨 오지 않습니다. 목록이 보이는 것이 곧 형태라서 이름이
// 그 뜻을 말하게 합니다.

import type { JourneyEpisodeId } from "../journey-map/journey-map-units";
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

/**
 * 에피소드를 가려내는 이름입니다. 여정의 `JourneyEpisode.id`와 같은 값입니다 —
 * **주석이 말하던 것을 타입이 말하게 합니다.** 별칭이라 에피소드가 늘면 한 곳
 * (`JourneyEpisodeId`)만 고칩니다.
 */
export type RoleplayEpisodeId = JourneyEpisodeId;

/**
 * 롤플레이 화면의 한 구획입니다 — 에피소드 하나와 그 에피소드의 롤플레이 항목들입니다.
 *
 * **잠김은 항목이 아니라 구획이 집니다.** 롤플레이는 에피소드 단위로 열리므로
 * (여정에서 그 에피소드를 다 끝내면 한꺼번에), 항목마다 상태를 두면 「같은 에피소드인데
 * 하나만 열린」 상태를 타입이 표현할 수 있게 됩니다. `RoleplayItem`에 상태 필드가 없다는
 * 위의 약속은 그대로입니다.
 */
/** 결제 롤플레이를 가려내는 이름입니다. 여정의 유닛 id와 겹치지 않습니다. */
export type PremiumRoleplayId = string;

/**
 * 결제 사용자를 위한 롤플레이 하나입니다. 그 에피소드와 닮은 상황을 더 연습하게 합니다.
 *
 * **열 화면을 가리키는 필드가 없습니다.** 컨텐츠도 결제도 아직 없어, 오늘 이 항목은
 * 카드로 서기만 하는 예고입니다(`roleplay-premium-items.ts`).
 */
export type PremiumRoleplayItem = {
  readonly id: PremiumRoleplayId;
  readonly title: string;
  /** 카드의 둘째 줄입니다 — 무엇을 연습하는지 한 줄로 말합니다. */
  readonly situation: string;
};

/**
 * 결제 롤플레이 카드가 막혀 있는 까닭입니다. 둘은 여는 방법이 다르므로 같은 자물쇠로
 * 그리지 않습니다 — `episode`는 여정을 더 하면 열리고, `payment`는 결제하면 열립니다.
 *
 * 「열림」이 없습니다. 결제한 사용자가 없고 열 화면도 없어, 그 상태는 오늘 표현할 수
 * 없습니다.
 */
export type PremiumRoleplayLock = "episode" | "payment";

export type RoleplaySection = {
  readonly episodeId: RoleplayEpisodeId;
  /** 구획 머리의 첫 줄입니다 — `Episode 0.` */
  readonly label: string;
  /** 구획 머리의 둘째 줄입니다 — 에피소드의 이름입니다. */
  readonly title: string;
  readonly unlocked: boolean;
  readonly items: readonly RoleplayItem[];
  /** 결제 롤플레이입니다. 없으면 빈 목록이고, 그때 구획은 둘째 줄을 그리지 않습니다. */
  readonly premiumItems: readonly PremiumRoleplayItem[];
};

export type RoleplayListScreenProps = {
  readonly sections: readonly RoleplaySection[];
  readonly onSelectItem: (item: RoleplayItem) => void;
  readonly onViewAll: (episodeId: RoleplayEpisodeId) => void;
  /** 플러스 안내가 뜨고 질 때 부릅니다 — 전역 머리를 그 동안 낭독에서 가리는 데 씁니다. */
  readonly onLayerChange?: (open: boolean) => void;
};

/** 에피소드 하나의 항목을 세로로 펼친 화면입니다 — 구획 머리의 `전체 보기`가 엽니다. */
export type RoleplayEpisodeScreenProps = {
  readonly section: RoleplaySection;
  readonly onSelectItem: (item: RoleplayItem) => void;
  readonly onExit: () => void;
};

/**
 * `row`는 가로 줄에 서는 고정 폭 카드이고 `list`는 세로 목록에 서는 줄 폭 카드입니다.
 * 생김새는 같고 폭만 다릅니다.
 */
export type RoleplayCardLayout = "row" | "list";

export type RoleplayCardProps = {
  readonly item: RoleplayItem;
  readonly locked: boolean;
  readonly layout: RoleplayCardLayout;
  readonly onSelect: (item: RoleplayItem) => void;
};

export type PremiumRoleplayCardProps = {
  readonly item: PremiumRoleplayItem;
  readonly lock: PremiumRoleplayLock;
  readonly onSelect: (item: PremiumRoleplayItem) => void;
};

export type RoleplayListTestId =
  | "roleplay-list-screen-title"
  | "roleplay-list-screen-scroll"
  | "roleplay-list-screen-list"
  | `roleplay-list-section-${RoleplayEpisodeId}`
  | `roleplay-list-section-header-${RoleplayEpisodeId}`
  | `roleplay-list-section-view-all-${RoleplayEpisodeId}`
  | `roleplay-list-section-row-${RoleplayEpisodeId}`
  | `roleplay-list-section-premium-${RoleplayEpisodeId}`
  | `roleplay-list-section-premium-header-${RoleplayEpisodeId}`
  | `roleplay-list-section-premium-row-${RoleplayEpisodeId}`
  | `roleplay-premium-card-${PremiumRoleplayId}`
  | `roleplay-premium-card-badge-${PremiumRoleplayId}`
  | `roleplay-premium-card-lock-${PremiumRoleplayId}`
  | `roleplay-premium-card-title-${PremiumRoleplayId}`
  | `roleplay-premium-card-situation-${PremiumRoleplayId}`
  | "roleplay-list-premium-notice"
  | "roleplay-episode-screen-exit"
  | "roleplay-episode-screen-title"
  | "roleplay-episode-screen-scroll"
  | "roleplay-episode-screen-list"
  | `roleplay-list-item-${RoleplayItem["unitId"]}`
  | `roleplay-list-item-lock-${RoleplayItem["unitId"]}`
  | `roleplay-list-item-title-${RoleplayItem["unitId"]}`
  | `roleplay-list-item-form-${RoleplayItem["unitId"]}`;
