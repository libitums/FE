import { expect, test } from "vitest";

import type { EntryLoginMethod } from "../../lib/entry-flow";
import { loginMethodLabel } from "./login";

// 계약: .agent-harness/work/lib-261/spec.md §8(고정 문구 — 로그인 수단 넷).
// `loginMethodLabel`의 이름과 시그니처가 어떻게 정해졌는지는 `./login.ts` 머리
// 주석이 그대로 적고 있다.
// 계획: .agent-harness/work/lib-261/test-plan.md unit § `screens/login/login.unit.test.ts`
// (신설). 케이스 id는 계획의 LG1 그대로다.
//
// 라벨 리터럴 자체는 단언하지 않는다(공백 아님·서로 다름만) — test-plan.md LG1·
// LG-U1이 그렇게 정했다. 수단 넷은 `entryLoginMethods`(지금은 스텁이라 빈 배열)를
// 순회하지 않고 계약 리터럴로 짓는다 — 그러지 않으면 스텁 상태에서 루프가 0회
// 돌아 공허하게 통과한다(entry-flow.unit.test.ts EF1이 그 축을 이미 진다).
const allLoginMethods: readonly EntryLoginMethod[] = ["phone", "google", "apple", "facebook"];

// LG1
test("LG1. 수단 넷 각각에 공백 아닌 라벨이 있고 넷이 서로 다르다", () => {
  const labels = allLoginMethods.map((method) => loginMethodLabel(method));

  for (const label of labels) {
    expect(label.trim().length).toBeGreaterThan(0);
  }
  expect(new Set(labels).size).toBe(allLoginMethods.length);
});
