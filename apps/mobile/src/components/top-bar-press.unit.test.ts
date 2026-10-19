import { motionClassName } from "@libitums/ui-lynx/motion";
import { describe, expect, it } from "vitest";

import { hasTopBarNotificationsShade, topBarNotificationsClassName } from "./top-bar-press";

// `unit` 계층: 움직임 정책 → 알림 버튼 클래스 · 막 유무 (순수 함수).

describe("topBarNotificationsClassName", () => {
  it("[TBP1] standard는 기본 클래스뿐이고 reduced는 접미사가 더해진다", () => {
    expect(topBarNotificationsClassName("standard")).toBe("top-bar-notifications");
    expect(topBarNotificationsClassName("reduced")).toBe(
      "top-bar-notifications top-bar-notifications-motion-reduced",
    );
  });

  it("[TBP1] reduced 접미사는 ui-lynx motionClassName과 같다", () => {
    const suffix = motionClassName("top-bar-notifications", "reduced");

    expect(suffix).toBeDefined();
    expect(topBarNotificationsClassName("reduced")).toBe(`top-bar-notifications ${suffix}`);
    expect(motionClassName("top-bar-notifications", "standard")).toBeUndefined();
  });
});

describe("hasTopBarNotificationsShade", () => {
  it("[TBP2] reduced일 때만 참이다", () => {
    expect(hasTopBarNotificationsShade("standard")).toBe(false);
    expect(hasTopBarNotificationsShade("reduced")).toBe(true);
  });
});
