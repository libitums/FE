import { describe, expect, test } from "vitest";

import { signupRewardCopy } from "./ui-copy-signup-reward";
import type { UnlimitedPass } from "./unlimited-pass";
import { clock12, clock24, welcomeGiftEndOf, type WelcomeGiftEnd } from "./welcome-gift-time";

// 가입 보상 창의 무제한 줄(ADR-0186 개정 3) — 끝 시각 판정 · 언어별 문장. 시각은 모두 기기 지역 시각으로 만들어(`new Date(y, m, d, h, mi)`)
// 어느 시간대에서 돌려도 같습니다.

const at = (day: number, hours: number, minutes = 0): number =>
  new Date(2026, 10, day, hours, minutes).getTime();
const timed = (startedAtMs: number, endsAtMs: number): UnlimitedPass => ({
  kind: "timed",
  startedAtMs,
  endsAtMs,
});
const dayPass = (startedAtMs: number): UnlimitedPass =>
  timed(startedAtMs, startedAtMs + 24 * 3_600_000);

describe("끝 시각 판정", () => {
  test("WG-U1 저녁에 가입하면 끝은 내일 같은 시각", () => {
    expect(welcomeGiftEndOf(dayPass(at(25, 21, 41)), at(25, 21, 42))).toEqual({
      day: "tomorrow",
      hours: 21,
      minutes: 41,
    });
  });

  test("WG-U2 어제 가입했으면 끝은 오늘", () => {
    expect(welcomeGiftEndOf(dayPass(at(24, 9, 5)), at(25, 8, 0))).toEqual({
      day: "today",
      hours: 9,
      minutes: 5,
    });
  });

  test("WG-U3 자정 0시 0분에 가입하면 끝은 내일 0:00", () => {
    expect(welcomeGiftEndOf(dayPass(at(25, 0, 0)), at(25, 0, 1))).toEqual({
      day: "tomorrow",
      hours: 0,
      minutes: 0,
    });
  });

  test("WG-U4 이용권이 없거나 시간 한정이 아니거나 끝났으면 줄 없음", () => {
    const now = at(25, 12);
    expect(welcomeGiftEndOf(undefined, now)).toBeNull();
    expect(welcomeGiftEndOf({ kind: "guest" }, now)).toBeNull();
    expect(welcomeGiftEndOf(timed(at(24, 11), at(25, 11)), now)).toBeNull();
    expect(welcomeGiftEndOf(timed(at(24, 12), at(25, 12)), now)).toBeNull();
  });

  test("WG-U5 기기 시계를 되돌려 끝이 모레 이후로 보이면 줄 없음", () => {
    expect(welcomeGiftEndOf(dayPass(at(26, 10)), at(25, 9))).toBeNull();
  });
});

describe("시계 부품", () => {
  test("WG-U6 12시간 — 0시는 12 AM, 12시는 12 PM, 분은 두 자리", () => {
    expect(clock12(0, 5)).toEqual({ hour: 12, minutes: "05", pm: false });
    expect(clock12(9, 41)).toEqual({ hour: 9, minutes: "41", pm: false });
    expect(clock12(12, 0)).toEqual({ hour: 12, minutes: "00", pm: true });
    expect(clock12(21, 41)).toEqual({ hour: 9, minutes: "41", pm: true });
  });

  test("WG-U7 24시간 — 시는 그대로, 분은 두 자리, 구분자는 언어별", () => {
    expect(clock24(21, 41)).toBe("21:41");
    expect(clock24(0, 5)).toBe("0:05");
    expect(clock24(9, 5, ".")).toBe("9.05");
  });
});

describe("언어별 끝 시각 문장", () => {
  const tomorrow: WelcomeGiftEnd = { day: "tomorrow", hours: 21, minutes: 41 };
  const today: WelcomeGiftEnd = { day: "today", hours: 9, minutes: 5 };
  const one: WelcomeGiftEnd = { day: "today", hours: 1, minutes: 5 };
  const midnight: WelcomeGiftEnd = { day: "tomorrow", hours: 0, minutes: 30 };

  test("WG-U8 en — 12시간 · 「today, 9:05 AM」 · 「tomorrow, 9:41 PM」", () => {
    const until = signupRewardCopy.en.unlimitedUntil;
    expect(until(tomorrow)).toBe("Every lesson is free until tomorrow, 9:41 PM.");
    expect(until(today)).toBe("Every lesson is free until today, 9:05 AM.");
    expect(until(midnight)).toBe("Every lesson is free until tomorrow, 12:30 AM.");
  });

  test("WG-U9 es — 24시간 · 1시는 「a la」", () => {
    const until = signupRewardCopy.es.unlimitedUntil;
    expect(until(tomorrow)).toBe("Todas las lecciones son gratis hasta mañana a las 21:41.");
    expect(until(today)).toBe("Todas las lecciones son gratis hasta hoy a las 9:05.");
    expect(until(one)).toBe("Todas las lecciones son gratis hasta hoy a la 1:05.");
  });

  test("WG-U10 id — 24시간 · 점 구분 · 두 자리 시", () => {
    const until = signupRewardCopy.id.unlimitedUntil;
    expect(until(tomorrow)).toBe("Semua pelajaran gratis sampai besok pukul 21.41.");
    expect(until(today)).toBe("Semua pelajaran gratis sampai hari ini pukul 09.05.");
  });

  test("WG-U11 ja — 24시간", () => {
    const until = signupRewardCopy.ja.unlimitedUntil;
    expect(until(tomorrow)).toBe("明日21:41まで、すべてのレッスンが無料です。");
    expect(until(today)).toBe("今日9:05まで、すべてのレッスンが無料です。");
  });

  test("WG-U12 vi — 24시간 · 시각 뒤에 날", () => {
    const until = signupRewardCopy.vi.unlimitedUntil;
    expect(until(tomorrow)).toBe("Mọi bài học đều miễn phí đến 21:41 ngày mai.");
    expect(until(today)).toBe("Mọi bài học đều miễn phí đến 9:05 hôm nay.");
  });

  test("WG-U13 th — 24시간 · 「น.」", () => {
    const until = signupRewardCopy.th.unlimitedUntil;
    expect(until(tomorrow)).toBe("เรียนได้ฟรีทุกบทเรียนจนถึงพรุ่งนี้ เวลา 21:41 น.");
    expect(until(today)).toBe("เรียนได้ฟรีทุกบทเรียนจนถึงวันนี้ เวลา 9:05 น.");
  });

  test("WG-U14 my — 12시간 · 낮/밤 말이 시각 앞", () => {
    const until = signupRewardCopy.my.unlimitedUntil;
    expect(until(tomorrow)).toBe("မနက်ဖြန် ညနေ 9:41 အထိ သင်ခန်းစာအားလုံး အခမဲ့ဖြစ်ပါသည်။");
    expect(until(today)).toBe("ယနေ့ နံနက် 9:05 အထိ သင်ခန်းစာအားလုံး အခမဲ့ဖြစ်ပါသည်။");
  });

  test("WG-U15 zh-TW — 12시간 · 上午/下午", () => {
    const until = signupRewardCopy["zh-TW"].unlimitedUntil;
    expect(until(tomorrow)).toBe("明天下午9:41前，所有課程都免費。");
    expect(until(today)).toBe("今天上午9:05前，所有課程都免費。");
    expect(until(midnight)).toBe("明天上午12:30前，所有課程都免費。");
  });

  test("WG-U16 엽전 줄 설명은 여덟 언어 모두 있고 bodyNew보다 짧다", () => {
    for (const copy of Object.values(signupRewardCopy)) {
      expect(copy.coinsLine.length).toBeGreaterThan(0);
      expect(copy.coinsLine.length).toBeLessThan(copy.bodyNew.length);
    }
  });
});
