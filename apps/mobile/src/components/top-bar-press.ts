import { motionClassName } from "@libitums/ui-lynx/motion";
import type { Motion } from "@libitums/ui-lynx/motion";

/**
 * standard → "top-bar-notifications"
 * reduced → "top-bar-notifications top-bar-notifications-motion-reduced"
 * 던지지 않습니다.
 */
export function topBarNotificationsClassName(motion: Motion): string {
  const base = "top-bar-notifications";
  const modifier = motionClassName(base, motion);
  return modifier === undefined ? base : `${base} ${modifier}`;
}

/** reduced일 때만 참 — 줄이지 않는 대신 막으로 눌림을 알립니다. */
export function hasTopBarNotificationsShade(motion: Motion): boolean {
  return motion === "reduced";
}
