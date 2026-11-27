import { expect, test } from "vitest";

import { messengerChatEn } from "./ui-copy-en-chat";
import { messengerChatEs } from "./ui-copy-es-chat";
import { messengerChatId } from "./ui-copy-id-chat";
import { messengerChatJa } from "./ui-copy-ja-chat";
import { messengerChatMy } from "./ui-copy-my-chat";
import { messengerChatTh } from "./ui-copy-th-chat";
import { messengerChatVi } from "./ui-copy-vi-chat";
import { messengerChatZhTw } from "./ui-copy-zh-tw-chat";

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
});

test("CS-U16 모든 언어 — 사이드바 개수는 n / 상한, 가득이면 그 언어의 표시가 붙고 이름 · 개수가 문장에 든다", () => {
  for (const copy of all) {
    const m = copy.chatSettings.memories;
    expect(m.sidebarSummary(2, 50, false)).toBe("2 / 50");
    expect(m.sidebarSummary(50, 50, true).startsWith("50 / 50 · ")).toBe(true);
    expect(m.sidebar("Mina")).toContain("Mina");
    expect(m.titleCharacter("Mina")).toContain("Mina");
    expect(copy.chatSettings.feedback.body("Mina")).toContain("Mina");
  }
});

test("CS-U17 공유 기억 줄 문구는 없고, 각주는 「캐릭터마다 내가 말한 것을 기억한다」 — 「also」 없이(ADR-0210 D6)", () => {
  const footnotes = {
    en: "Each character remembers what you told them. Open a chat and tap ☰ to see what they remember.",
    es: "Cada personaje recuerda lo que le contaste. Abre un chat y toca ☰ para verlo.",
    id: "Setiap karakter mengingat apa yang kamu ceritakan kepadanya. Buka obrolan dan ketuk ☰ untuk melihatnya.",
    ja: "キャラクターはそれぞれ、あなたが話したことを覚えています。チャットを開いて ☰ をタップすると見られます。",
    my: "ဇာတ်ကောင်တစ်ဦးစီသည် သင် ပြောပြခဲ့တာတွေကို မှတ်ထားပါတယ်။ ကြည့်ရန် ချတ်တစ်ခု ဖွင့်ပြီး ☰ ကို တို့ပါ။",
    th: "ตัวละครแต่ละคนจำสิ่งที่คุณเล่าให้ฟังได้ เปิดแชทแล้วแตะ ☰ เพื่อดู",
    vi: "Mỗi nhân vật nhớ những điều bạn đã kể với họ. Mở một cuộc trò chuyện và chạm ☰ để xem.",
    "zh-TW": "每個角色都記得你跟他說過的事。打開聊天並點一下 ☰ 即可查看。",
  };
  const copies = {
    en: messengerChatEn,
    es: messengerChatEs,
    id: messengerChatId,
    ja: messengerChatJa,
    my: messengerChatMy,
    th: messengerChatTh,
    vi: messengerChatVi,
    "zh-TW": messengerChatZhTw,
  };
  for (const [language, copy] of Object.entries(copies)) {
    expect(copy.chatSettings.footnote).toBe(footnotes[language as keyof typeof footnotes]);
    expect(Object.keys(copy.chatSettings)).not.toContain("sharedMemories");
    expect(Object.keys(copy.chatSettings)).not.toContain("sharedMemoriesSummary");
    expect(Object.keys(copy.chatSettings.memories)).not.toContain("titleShared");
  }
});
