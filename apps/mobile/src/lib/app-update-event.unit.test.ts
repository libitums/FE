import { expect, test } from "vitest";

import { appUpdateRequiredEvent } from "./entry-flow";

// `unit` 계층: 강제 업데이트 화면이 선 이벤트(ADR-0086). 숫자는 문자열로 실립니다.

test("AE1. 플랫폼 · 빌드 · 최소 빌드를 문자열 속성으로 싣는다", () => {
  expect(appUpdateRequiredEvent({ platform: "android", build: 6 }, 7)).toEqual({
    name: "app_update_required_shown",
    platform: "android",
    build: "6",
    minBuild: "7",
  });
});
