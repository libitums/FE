import { expect, test } from "vitest";

import { messengerChatEn } from "./ui-copy-en-chat";
import { messengerChatEs } from "./ui-copy-es-chat";
import { messengerChatId } from "./ui-copy-id-chat";
import { messengerChatJa } from "./ui-copy-ja-chat";
import { messengerChatVi } from "./ui-copy-vi-chat";

// `unit` 계층(CS-U14 ~ U16): 대화 설정 문구(ADR-0126) — 언어별 시각, 이름이 들 때의 수 일치, 사이드바 개수 표기.

const all = [messengerChatEn, messengerChatEs, messengerChatId, messengerChatJa, messengerChatVi];

test("CS-U14 시각 — en 12시간, es · ja 21:00, id 21.00, vi 두 자리", () => {
  const hour = (copy: typeof messengerChatEn) => copy.chatSettings.proactiveSheet.hour;
  expect(hour(messengerChatEn)(21)).toBe("9 PM");
  expect(hour(messengerChatEn)(12)).toBe("12 PM");
  expect(hour(messengerChatEn)(9)).toBe("9 AM");
  expect(hour(messengerChatEs)(21)).toBe("21:00");
  expect(hour(messengerChatJa)(9)).toBe("9:00");
  expect(hour(messengerChatId)(9)).toBe("09.00");
  expect(hour(messengerChatVi)(9)).toBe("09:00");
});

test("CS-U15 es — 이름이 들면 단수 동사, 없으면 복수", () => {
  const m = messengerChatEs.chatSettings.memories;
  expect(m.fullBody("Mina")).toMatch(/^Mina no puede /);
  expect(m.fullBody(null)).toMatch(/^Los personajes no pueden /);
  expect(m.intro("Mina")).toMatch(/^Mina los usa /);
  expect(m.empty("Mina")).toContain("Mina recordará");
  expect(m.editHint("Mina")).toMatch(/^Mina lo recordará /);
  expect(m.deleteBody("Mina")).toMatch(/^Mina dejará /);
  expect(messengerChatEs.chatSettings.sharedMemoriesSummary(1)).toBe(
    "1 recuerdo · compartido por todos los personajes",
  );
});

test("CS-U16 모든 언어 — 사이드바 개수는 n / 상한, 가득이면 그 언어의 표시가 붙고 이름 · 개수가 문장에 든다", () => {
  for (const copy of all) {
    const m = copy.chatSettings.memories;
    expect(m.sidebarSummary(2, 50, false)).toBe("2 / 50");
    expect(m.sidebarSummary(50, 50, true).startsWith("50 / 50 · ")).toBe(true);
    expect(m.sidebar("Mina")).toContain("Mina");
    expect(m.titleCharacter("Mina")).toContain("Mina");
    expect(copy.chatSettings.sharedMemoriesSummary(3)).toContain("3");
    expect(copy.chatSettings.feedback.body("Mina")).toContain("Mina");
  }
});
