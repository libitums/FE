import { expect, test } from "vitest";

import { messengerChatEn } from "./ui-copy-en-chat";
import { messengerChatEs } from "./ui-copy-es-chat";
import { messengerChatId } from "./ui-copy-id-chat";
import { messengerChatJa } from "./ui-copy-ja-chat";
import { messengerChatVi } from "./ui-copy-vi-chat";

// `unit` 계층(SU-U16 · U17): 법 · 안전 문구의 시각(ADR-0125 D3) — en은 12시간, 나머지는 24시간.

test("SU-U16 en 시각은 12시간 — 자정 12:00 AM · 정오 12:00 PM · 오후 3:05 PM", () => {
  const time = messengerChatEn.safety.time;
  expect(time(0, 0)).toBe("12:00 AM");
  expect(time(12, 0)).toBe("12:00 PM");
  expect(time(15, 5)).toBe("3:05 PM");
  expect(time(9, 30)).toBe("9:30 AM");
});

test("SU-U17 es · ja는 15:05, id는 15.05, vi는 15:05(두 자리), 자정은 0시", () => {
  expect(messengerChatEs.safety.time(15, 5)).toBe("15:05");
  expect(messengerChatJa.safety.time(15, 5)).toBe("15:05");
  expect(messengerChatId.safety.time(15, 5)).toBe("15.05");
  expect(messengerChatVi.safety.time(15, 5)).toBe("15:05");
  expect(messengerChatVi.safety.time(0, 0)).toBe("00:00");
  expect(messengerChatEs.safety.time(1, 5)).toBe("1:05");
});
