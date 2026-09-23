// 모듈 로드 때 한 번만 읽는 고정 목록 넷(`roleplayItems`·`notificationList`·
// `profileList`·`termsSectionList`)을 소유합니다. 넷 다 로컬 상태가 없는
// 화면(롤플레이 목록·알림·프로필·약관)에 그대로 내려갑니다.

import { journeyMapItems } from "../screens/journey-map/journey-map";
import { notificationItems } from "../screens/notifications/notification-items";
import type { NotificationItem } from "../screens/notifications/notifications.contract";
import { profileItems } from "../screens/profile/profile-items";
import { roleplayItemsFrom } from "../screens/roleplay-list/roleplay-list";
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
import { termsSections } from "../screens/terms/terms-sections";

// `journeyMapItems`(값)를 읽을 수 있는 자리는 여기뿐입니다 — 화면 폴더 사이 값
// import는 금지지만(`code.md` 「import」), `roleplay-list` 폴더는 이 표를 직접
// 볼 수 없습니다. 그래서 모듈 로드 시 한 번 변환해 모듈 상수로 둡니다.
export const roleplayItems: readonly RoleplayItem[] = roleplayItemsFrom(journeyMapItems);

// 위 `roleplayItems`와 같은 선례입니다 — 모듈 로드 때 한 번만 읽어 모듈 상수로
// 둡니다. 알림 화면에는 로컬 상태가 없습니다.
export const notificationList: readonly NotificationItem[] = notificationItems();

// `roleplayItems` · `notificationList`와 같은 선례입니다. 프로필·약관 화면에도
// 로컬 상태가 없습니다.
export const profileList = profileItems();
export const termsSectionList = termsSections();
