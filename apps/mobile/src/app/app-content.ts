// 모듈 로드 때 한 번만 읽는 고정 목록 셋(`notificationList`·`profileList`·
// `termsSectionList`)을 소유합니다. 프로필·약관은 화면에 그대로 내려가고, 알림은
// `App` 상태의 씨앗이 됩니다(지운 알림이 세션 동안 빠집니다). 롤플레이 구획은 여기
// 없습니다 — 진행에 따라 열리므로 상수가 아니라 `App`이 진행에서 파생합니다.

import { notificationItems } from "../screens/notifications/notification-items";
import type { NotificationItem } from "../screens/notifications/notifications.contract";
import { profileItems } from "../screens/profile/profile-items";
import { termsSections } from "../screens/terms/terms-sections";

// 모듈 로드 때 한 번만 읽어 모듈 상수로 둡니다.
export const notificationList: readonly NotificationItem[] = notificationItems();

// 프로필·약관 화면에는 로컬 상태가 없습니다.
export const profileList = profileItems();
export const termsSectionList = termsSections();
