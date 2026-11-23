import { afterEach, expect, test } from "vitest";

import { setPlanAccess } from "../lib/plan-access";
import { setTesterAccessActive } from "../lib/tester-access";
import { messengerChatWiring } from "./messenger-chat-wiring";

// `unit` 계층(MW-T1, ADR-0144 D2 · D6): 대화 등급은 서버 권한을 따른다 — Premium(대화 무제한)은 앱 관문을 열고, 무료 · Chat Plus는
// 지금처럼 체험 · 엽전 관문이다(Chat Plus의 하루 무료 30통은 서버가 셈 — 앱은 그 남은 수를 모름).

afterEach(() => {
  setPlanAccess(null);
  setTesterAccessActive(false);
});

const tier = () =>
  messengerChatWiring({ dispatch: () => {}, imageUrlOf: () => null }).messengerChat.tier;

test("MW-T1 권한 없음 · Chat Plus는 free, Premium · 시험 계정은 unlimited", () => {
  expect(tier()).toBe("free");
  setPlanAccess({ tier: "chat_plus", unlimitedTickets: false, entitlements: [] });
  expect(tier()).toBe("free");
  setPlanAccess({ tier: "premium", unlimitedTickets: true, entitlements: [] });
  expect(tier()).toBe("unlimited");
  setPlanAccess(null);
  setTesterAccessActive(true);
  expect(tier()).toBe("unlimited");
});
