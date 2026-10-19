import type { Motion } from "@libitums/ui-lynx/motion";

/**
 * standard → "top-bar-notifications"
 * reduced → "top-bar-notifications top-bar-notifications-motion-reduced"
 * 던지지 않습니다.
 */
export function topBarNotificationsClassName(_motion: Motion): string {
  return "top-bar-notifications";
}

/** reduced일 때만 참 — 줄이지 않는 대신 막으로 눌림을 알립니다. */
export function hasTopBarNotificationsShade(_motion: Motion): boolean {
  return false;
}
