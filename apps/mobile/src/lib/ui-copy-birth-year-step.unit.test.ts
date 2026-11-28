import { expect, test } from "vitest";

import { uiCopyEn } from "./ui-copy-en";
import { uiCopyEs } from "./ui-copy-es";
import { uiCopyId } from "./ui-copy-id";
import { uiCopyJa } from "./ui-copy-ja";
import { uiCopyMy } from "./ui-copy-my";
import { uiCopyTh } from "./ui-copy-th";
import { uiCopyVi } from "./ui-copy-vi";
import { uiCopyZhTw } from "./ui-copy-zh-tw";

// `unit` 계층(BYS-U1): 가입 직후 ④ 출생 연도 문구(ADR-0059 개정 2026-11-27) — 여덟 언어 모두 실제 번역이고, 채팅이 아니라
// 앱 전체를 말하며, 나이 문턱 · 건너뛰기를 드러내지 않습니다(COPPA 중립 연령 확인).

const tables = {
  es: uiCopyEs,
  id: uiCopyId,
  ja: uiCopyJa,
  my: uiCopyMy,
  th: uiCopyTh,
  vi: uiCopyVi,
  "zh-TW": uiCopyZhTw,
};

test("BYS-U1 영어는 앱 전체 안내이고, 다른 일곱 언어는 영어와 다른 실제 번역이다", () => {
  const en = uiCopyEn.learnerProfile.signup.birthYear;
  expect(en).toEqual({
    title: "What year were you born?",
    caption: "We use it to keep the app right for your age. It's never shown to anyone.",
  });
  for (const [language, copy] of Object.entries(tables)) {
    const step = copy.learnerProfile.signup.birthYear;
    expect(step.title, language).not.toBe(en.title);
    expect(step.caption, language).not.toBe(en.caption);
    // 제목은 메신저 생년 시트와 같은 번역입니다.
    expect(step.title, language).toBe(copy.messengerChat.safety.birthYear.title);
    expect(step.caption, language).not.toMatch(/18/);
  }
});
