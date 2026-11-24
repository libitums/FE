import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { romanizeHangul, romanizeKorean } from "./korean-romanize";

// `unit` 계층(ADR-0188 D4): 콘텐츠에 로마자가 없을 때 쓰는 변환 함수의 입출력만 봅니다 — 국어의 로마자 표기법(2000)과
// 표준 발음의 소리 바뀜 가운데 이 함수가 적는 규칙(R1 ~ R8)을 규칙별로 고정합니다. 소리 바뀜은 낱말(띄어쓰기 단위) 안에서만
// 일어납니다.

describe("romanizeKorean — 규칙", () => {
  test.each([
    ["R1 음절표", "아", "a"],
    ["R1 음절표", "가나다", "ganada"],
    ["R1 음절표 · 겹모음", "의자", "uija"],
    ["R1 음절표 · 받침 대표음", "부엌", "bueok"],
    ["R1 음절표 · 받침 대표음", "밖", "bak"],
    ["R1 음절표 · 받침 대표음", "옷", "ot"],
    ["R1 음절표 · 겹받침 대표음", "닭", "dak"],
    ["R1 음절표 · 겹받침 대표음", "없다", "eopda"],
  ])("KR1. %s: %s → %s", (_rule, ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test.each([
    ["받침 + 모음", "한국어", "hangugeo"],
    ["겹받침은 뒤 자음만 넘어간다", "읽을", "ilgeul"],
    ["ㄶ + 모음 — ㅎ은 소리 나지 않는다", "괜찮아요", "gwaenchanayo"],
    ["ㅅ + 모음", "맛있어요", "masisseoyo"],
    ["ㅎ + 모음 — 소리 나지 않는다", "좋아요", "joayo"],
    ["ㅇ 받침은 넘어가지 않는다", "중앙", "jungang"],
    ["ㅀ + 모음 — ㅎ은 소리 나지 않고 ㄹ이 넘어가 r", "싫어요", "sireoyo"],
    ["ㅀ + 모음", "끓여", "kkeuryeo"],
    ["ㄶ + 모음", "않아요", "anayo"],
  ])("KR2. R2 연음 — %s: %s → %s", (_rule, ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test.each([
    ["k + ㄴ", "먹는", "meongneun"],
    ["p + ㄴ", "감사합니다", "gamsahamnida"],
    ["겹받침 p + ㄴ", "없는데", "eomneunde"],
    ["t + ㅁ", "옛말", "yenmal"],
  ])("KR3. R3 비음화 — %s: %s → %s", (_rule, ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test.each([
    ["ㄴ + ㄹ", "신라", "silla"],
    ["ㄹ + ㄴ", "설날", "seollal"],
    ["ㄹ + ㄹ", "빨래", "ppallae"],
  ])("KR4. R4 유음화 — %s: %s → %s", (_rule, ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test.each([
    ["ㅇ + ㄹ", "종로", "jongno"],
    ["k + ㄹ은 ng + n", "대학로", "daehangno"],
    ["ㅁ + ㄹ", "음료수", "eumnyosu"],
  ])("KR5. R5 ㄹ의 비음화 — %s: %s → %s", (_rule, ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test.each([
    ["ㅎ + ㄷ", "좋다", "jota"],
    ["ㅎ + ㄱ", "놓고", "noko"],
    ["ㅎ + ㄱ", "어떻게", "eotteoke"],
    ["ㄶ + ㄷ", "많다", "manta"],
    ["ㅀ + ㄷ", "싫다", "silta"],
    ["ㅎ + ㅈ", "좋지", "jochi"],
    ["ㅎ + ㅅ은 ss", "좋습니다", "josseumnida"],
    ["ㅎ + ㄴ은 nn", "놓는", "nonneun"],
    ["ㄱ + ㅎ", "축축하다", "chukchukada"],
    ["ㄱ + ㅎ", "생각해요", "saenggakaeyo"],
    ["ㅂ + ㅎ", "입학", "ipak"],
    ["ㅈ + ㅎ", "앉히다", "anchida"],
  ])("KR6. R6 거센소리 — %s: %s → %s", (_rule, ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test.each([
    ["ㅌ + 이", "같이", "gachi"],
    ["ㄷ + 이", "굳이", "guji"],
    ["ㄷ + 이", "해돋이", "haedoji"],
    ["ㄷ + 히", "닫히다", "dachida"],
  ])("KR7. R7 구개음화 — %s: %s → %s", (_rule, ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test.each([
    ["학교", "hakgyo"],
    ["먹겠습니다", "meokgetseumnida"],
    ["반갑습니다", "bangapseumnida"],
  ])("KR8. R8 된소리는 적지 않는다: %s → %s", (ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });
});

describe("romanizeKorean — 문장", () => {
  test.each([
    ["안녕하세요! 한국은 처음이세요?", "annyeonghaseyo! hangugeun cheoeumiseyo?"],
    ["잘 먹겠습니다!", "jal meokgetseumnida!"],
    ["아니요, 영수증은 괜찮아요.", "aniyo, yeongsujeungeun gwaenchanayo."],
    ["몇 층이에요?", "myeot cheungieyo?"],
    ["어... 새로 오셨나 봐요?", "eo... saero osyeonna bwayo?"],
  ])("KR9. 소리 바뀜은 띄어쓰기를 넘지 않고 문장부호는 그대로다: %s", (ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test.each([
    ["「혼밥」이라고 해요", "「honbap」irago haeyo"],
    ["1+1 스티커", "1+1 seutikeo"],
    ["Alex 씨, 어디예요?", "Alex ssi, eodiyeyo?"],
    ["OK", "OK"],
    ["", ""],
    ["   ", "   "],
  ])("KR10. 한글이 아닌 글자는 그대로 두고 연음도 넘지 않는다: %j", (ko, expected) => {
    expect(romanizeKorean(ko)).toBe(expected);
  });

  test("KR11. 한글 자모만 있는 글자(ㅋㅋ)는 그대로 둔다 — 음절이 아니다", () => {
    expect(romanizeKorean("ㅋㅋ 좋아")).toBe("ㅋㅋ joa");
  });
});

describe("romanizeHangul — 낱말 단위(나라 표)", () => {
  test("KR12. 체언 규칙: ㄱ + ㅎ은 밝혀 적고(북한), 한글이 아닌 글자가 있으면 던진다", () => {
    expect(romanizeHangul("북한")).toBe("bukhan");
    expect(romanizeHangul("핀란드")).toBe("pillandeu");
    expect(() => romanizeHangul("한 국")).toThrow(/.+/);
  });
});

// 내장 콘텐츠의 (한글, 로마자) 쌍과 낱말 단위로 대조합니다. 콘텐츠는 사람이 적은 로마자이고 같이(gati) · 따뜻한(ttatteuthan)처럼
// 표기법과 다르게 적은 곳이 있어 100%를 기대하지 않습니다. 하한은 이 대체 원천이 「대개 콘텐츠와 같다」는 약속입니다.
describe("romanizeKorean — 내장 콘텐츠 대조", () => {
  const episodesDir = resolve(process.cwd(), "content/episodes");
  type Pair = { ko: string; roman: string };
  const pairs: Pair[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const { ko, roman } = record;
    if (typeof ko === "string" && typeof roman === "string" && roman.trim() !== "") {
      // 자리표시자({name} 등)가 있는 줄은 채우기 전이라 대조하지 않습니다.
      if (!ko.includes("{")) pairs.push({ ko, roman });
    }
    Object.values(record).forEach(walk);
  };
  for (const name of readdirSync(episodesDir).filter((file) => file.endsWith(".json"))) {
    walk(JSON.parse(readFileSync(resolve(episodesDir, name), "utf8")));
  }
  const wordsOf = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);

  test("KR13. 낱말 단위 일치율이 95% 이상이다", () => {
    let compared = 0;
    let matched = 0;
    for (const pair of pairs) {
      const ours = wordsOf(romanizeKorean(pair.ko));
      const theirs = wordsOf(pair.roman);
      if (ours.length !== theirs.length) continue;
      ours.forEach((word, index) => {
        compared += 1;
        if (word === theirs[index]) matched += 1;
      });
    }
    expect(pairs.length).toBeGreaterThan(1000);
    expect(compared).toBeGreaterThan(5000);
    expect(matched / compared).toBeGreaterThanOrEqual(0.95);
  });
});
