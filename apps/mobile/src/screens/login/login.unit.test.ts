import { expect, test } from "vitest";

import type { EntryLoginMethod } from "../../lib/entry-flow";
import { loginMethodLabel } from "./login";

// 라벨 리터럴 자체는 단언하지 않습니다(공백 아님·서로 다름만). 수단 넷은
// `entryLoginMethods`(지금은 스텁이라 빈 배열)를 순회하지 않고 리터럴로 짓습니다 —
// 그러지 않으면 스텁 상태에서 루프가 0회 돌아 공허하게 통과합니다
// (entry-flow.unit.test.ts EF1이 그 축을 이미 집니다).
const allLoginMethods: readonly EntryLoginMethod[] = ["phone", "google", "apple", "facebook"];

test("LG1. 수단 넷 각각에 공백 아닌 라벨이 있고 넷이 서로 다르다", () => {
  const labels = allLoginMethods.map((method) => loginMethodLabel(method));

  for (const label of labels) {
    expect(label.trim().length).toBeGreaterThan(0);
  }
  expect(new Set(labels).size).toBe(allLoginMethods.length);
});
