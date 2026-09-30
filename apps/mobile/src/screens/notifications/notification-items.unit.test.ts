import { expect, test } from "vitest";
import { notificationItems } from "./notification-items";

test("실제 알림 데이터가 없으면 목업을 채우지 않고 빈 목록을 반환한다", () => {
  expect(notificationItems()).toEqual([]);
});
