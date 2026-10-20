import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { romanizeHangul } from "./hangul-romanize.test-support";
import type { LearnerCountry } from "./learner-profile.contract";
import {
  foldLatin,
  learnerCountries,
  learnerCountryTextOf,
  learnerProfilePort,
  learnerProfilePreviewOf,
  learnerRandomNames,
  searchLearnerCountries,
} from "./learner-profile-data";
import { learnerNameFrom } from "./learner-profile";

// `unit` 계층: 나라 표의 무결성 · 접기 · 검색 순위 · 문장에 서는 세 표기 · 미리보기의 입출력만 봅니다.

function countryOf(code: string): LearnerCountry {
  const found = learnerCountries.find((country) => country.code === code);
  if (found === undefined) throw new Error(`${code} 가 표에 없습니다`);
  return found;
}

const codesOf = (countries: readonly LearnerCountry[]): string[] =>
  countries.map((country) => country.code);
const namesOf = (countries: readonly LearnerCountry[]): string[] =>
  countries.map((country) => country.en);

describe("나라 표 무결성", () => {
  test("CT-1. 199행이고 코드가 대문자 두 글자이며 중복이 없다", () => {
    expect(learnerCountries).toHaveLength(199);
    for (const country of learnerCountries) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
    }
    expect(new Set(codesOf(learnerCountries)).size).toBe(199);
  });

  test.each(["KR", "US", "DE", "TW", "HK", "MO", "XK", "VA", "PS", "KP"])(
    "CT-1. %s 가 있다",
    (code) => {
      expect(codesOf(learnerCountries)).toContain(code);
    },
  );

  test("CT-2. 영어 이름(접은 값) 오름차순으로 실려 있다", () => {
    expect(learnerCountries.length).toBeGreaterThan(1);
    learnerCountries.slice(1).forEach((country, index) => {
      const previous = learnerCountries[index]!;
      expect(foldLatin(previous.en) < foldLatin(country.en)).toBe(true);
    });
  });

  test("CT-3. ko는 한글 음절뿐 · roman은 소문자 · en은 비지 않고 겹치지 않는다", () => {
    expect(learnerCountries.length).toBeGreaterThan(0);
    for (const country of learnerCountries) {
      expect(country.ko).toMatch(/^[가-힣]+$/);
      expect(country.roman).toMatch(/^[a-z]+$/);
      expect(country.en.length).toBeGreaterThan(0);
      expect(country.en).toBe(country.en.trim());
    }
    expect(new Set(namesOf(learnerCountries)).size).toBe(learnerCountries.length);
  });

  test("CT-4. 모든 행에서 roman은 로마자 규칙의 출력과 같다", () => {
    const mismatches = learnerCountries
      .filter((country) => country.roman !== romanizeHangul(country.ko))
      .map((country) => `${country.code} ${country.ko} ${country.roman}`);

    expect(learnerCountries.length).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });

  test.each([
    ["DE", "독일", "dogil", "Germany"],
    ["US", "미국", "miguk", "United States"],
    ["KR", "한국", "hanguk", "South Korea"],
    ["KP", "북한", "bukhan", "North Korea"],
    ["FI", "핀란드", "pillandeu", "Finland"],
    ["MK", "북마케도니아", "bungmakedonia", "North Macedonia"],
    ["CY", "사이프러스", "saipeureoseu", "Cyprus"],
    ["TR", "튀르키예", "twireukiye", "Türkiye"],
    ["CN", "중국", "jungguk", "China"],
    ["JP", "일본", "ilbon", "Japan"],
    ["TH", "태국", "taeguk", "Thailand"],
    ["AU", "호주", "hoju", "Australia"],
    ["FR", "프랑스", "peurangseu", "France"],
    ["IE", "아일랜드", "aillaendeu", "Ireland"],
    ["TW", "대만", "daeman", "Taiwan"],
    ["HK", "홍콩", "hongkong", "Hong Kong"],
    ["XK", "코소보", "kosobo", "Kosovo"],
    ["PS", "팔레스타인", "palleseutain", "Palestine"],
    ["CF", "중앙아프리카공화국", "jungangapeurikagonghwaguk", "Central African Republic"],
    ["ST", "상투메프린시페", "sangtumepeurinsipe", "São Tomé and Príncipe"],
  ])("CT-5. 표본 %s: %s · %s · %s", (code, ko, roman, en) => {
    const country = countryOf(code);

    expect(country.ko).toBe(ko);
    expect(country.roman).toBe(roman);
    expect(country.en).toBe(en);
  });

  test("CT-6. 관사 the 15행과 별칭 21행의 코드 집합이 정본과 같다", () => {
    const articled = learnerCountries.filter((country) => country.article === "the");
    const aliased = learnerCountries.filter((country) => (country.aliases?.length ?? 0) > 0);

    expect(codesOf(articled).sort()).toEqual(
      [
        "AE",
        "BS",
        "CF",
        "CG",
        "DO",
        "GB",
        "GM",
        "KM",
        "MH",
        "MV",
        "NL",
        "PH",
        "SB",
        "SC",
        "US",
      ].sort(),
    );
    expect(codesOf(aliased).sort()).toEqual(
      [
        "AE",
        "BA",
        "CD",
        "CG",
        "CI",
        "CV",
        "CZ",
        "GB",
        "KN",
        "KR",
        "LC",
        "MK",
        "MM",
        "MO",
        "NL",
        "SZ",
        "TL",
        "TR",
        "US",
        "VA",
        "VC",
      ].sort(),
    );
  });

  test("CT-6. 별칭은 접힌 소문자다", () => {
    for (const country of learnerCountries) {
      for (const alias of country.aliases ?? []) {
        expect(alias).toBe(foldLatin(alias));
      }
    }
  });
});

describe("learnerCountryTextOf", () => {
  test("CT-7. 관사가 있으면 en 앞에 붙고 ko · roman은 표 그대로다", () => {
    expect(learnerCountryTextOf(countryOf("US"))).toEqual({
      ko: "미국",
      roman: "miguk",
      en: "the United States",
    });
    expect(learnerCountryTextOf(countryOf("DE"))).toEqual({
      ko: "독일",
      roman: "dogil",
      en: "Germany",
    });
  });
});

describe("foldLatin", () => {
  test.each([
    ["Côte d’Ivoire", "cote d'ivoire"],
    ["Côte d'Ivoire", "cote d'ivoire"],
    ["São Tomé and Príncipe", "sao tome and principe"],
    ["Türkiye", "turkiye"],
    ["GERMANY", "germany"],
  ])("CT-8. %s -> %s", (input, expected) => {
    expect(foldLatin(input)).toBe(expected);
  });
});

describe("searchLearnerCountries", () => {
  const search = (query: string): readonly LearnerCountry[] =>
    searchLearnerCountries(learnerCountries, query);

  test.each([[""], ["   "]])("CT-9. 빈 질의(%j)는 전체를 같은 순서로 낸다", (query) => {
    const result = search(query);

    expect(result).toHaveLength(199);
    expect(codesOf(result)).toEqual(codesOf(learnerCountries));
  });

  test("CT-9. ko: Kosovo가 첫째이고 North Korea · South Korea가 든다", () => {
    const result = search("ko");

    expect(result[0]?.code).toBe("XK");
    expect(namesOf(result)).toEqual(expect.arrayContaining(["North Korea", "South Korea"]));
  });

  test.each([["korea"], ["KOREA"]])("CT-9. %s: 대소문자를 가리지 않고 둘이다", (query) => {
    expect(codesOf(search(query))).toEqual(["KP", "KR"]);
  });

  test.each([
    ["usa", "US"],
    ["america", "US"],
    ["turkey", "TR"],
    ["cote", "CI"],
    ["uae", "AE"],
  ])("CT-9. 별칭 · 접은 이름: %s -> %s", (query, code) => {
    expect(codesOf(search(query))[0]).toBe(code);
  });

  test("CT-9. 앞뒤 공백은 걷는다", () => {
    expect(namesOf(search("  ger  "))).toContain("Germany");
  });

  test("CT-9. 맞는 것이 없으면 빈 목록이다", () => {
    expect(search("xyz")).toEqual([]);
  });

  test("CT-10. 이름 접두가 부분 일치보다 앞이다 (ire)", () => {
    const codes = codesOf(search("ire"));

    expect(codes).toContain("IE");
    expect(codes).toContain("CI");
    expect(codes.indexOf("IE")).toBeLessThan(codes.indexOf("CI"));
  });

  test("CT-10. 이름 접두가 낱말 접두보다 앞이다 (new)", () => {
    const codes = codesOf(search("new"));

    expect(codes.indexOf("NZ")).toBeGreaterThanOrEqual(0);
    expect(codes.indexOf("NZ")).toBeLessThan(codes.indexOf("PG"));
  });

  test("CT-10. 이름 일치가 별칭 일치보다 앞이다 (uk)", () => {
    const codes = codesOf(search("uk"));

    expect(codes).toContain("UA");
    expect(codes).toContain("GB");
    expect(codes.indexOf("UA")).toBeLessThan(codes.indexOf("GB"));
  });

  test("CT-10. 같은 순위 안에서는 영어 이름 순이다", () => {
    const codes = codesOf(search("s"));
    const prefixed = learnerCountries.filter((country) => foldLatin(country.en).startsWith("s"));

    expect(codes.slice(0, prefixed.length)).toEqual(codesOf(prefixed));
  });

  test("CT-11. 입력 목록을 고치지 않고 같은 질의는 같은 결과다", () => {
    const input = [...learnerCountries];
    const before = codesOf(input);

    const first = searchLearnerCountries(input, "ko");
    const second = searchLearnerCountries(input, "ko");

    expect(codesOf(input)).toEqual(before);
    expect(codesOf(second)).toEqual(codesOf(first));
  });
});

describe("learnerProfilePort", () => {
  test("CT-12. byCode는 대문자 코드만 찾는다", () => {
    expect(learnerProfilePort.byCode("DE")?.en).toBe("Germany");
    expect(learnerProfilePort.byCode("de")).toBeNull();
    expect(learnerProfilePort.byCode("ZZ")).toBeNull();
  });

  test("CT-12. search는 검색 규칙과 같다", () => {
    expect(codesOf(learnerProfilePort.search("korea"))).toEqual(["KP", "KR"]);
    expect(learnerProfilePort.search("")).toHaveLength(199);
  });
});

describe("무작위 이름 목록", () => {
  test("CT-13. 40개이고 겹치지 않으며 모두 이름 규칙을 그대로 지난다(정규화해도 같다)", () => {
    expect(learnerRandomNames).toHaveLength(40);
    expect(new Set(learnerRandomNames).size).toBe(40);
    for (const name of learnerRandomNames) {
      expect(learnerNameFrom(name)).toEqual({ ok: true, name });
    }
  });

  test("CT-13. 짧은 라틴 이름이다 — 한국어 대사에 끼워 발음하기 쉽다(2 ~ 6자, 공백 없음)", () => {
    for (const name of learnerRandomNames) {
      expect([name, /^[A-Z][a-z]{1,5}$/.test(name)]).toEqual([name, true]);
    }
  });

  test("CT-13. 포트의 randomName은 목록 안에서 지난 이름과 다른 값을 낸다", () => {
    for (let round = 0; round < 50; round += 1) {
      const name = learnerProfilePort.randomName("Emma");
      expect(learnerRandomNames).toContain(name);
      expect(name).not.toBe("Emma");
    }
  });
});

describe("learnerProfilePreviewOf", () => {
  test("CT-13. 이름도 나라도 없으면 견본 이름으로 만든 example 한 쌍이다", () => {
    expect(learnerProfilePreviewOf(null, null)).toEqual({
      kind: "example",
      lines: [{ ko: "Emma로 예약했어요.", en: "I booked under Emma." }],
    });
  });

  test("CT-13. 이름만 있으면 이름 문장 한 쌍이다", () => {
    expect(learnerProfilePreviewOf("Liam", null)).toEqual({
      kind: "yours",
      lines: [{ ko: "Liam으로 예약했어요.", en: "I booked under Liam." }],
    });
  });

  test("CT-13. 나라만 있으면 나라 문장 한 쌍이다", () => {
    expect(learnerProfilePreviewOf(null, countryOf("FR"))).toEqual({
      kind: "yours",
      lines: [{ ko: "저는 프랑스에서 왔어요.", en: "I'm from France." }],
    });
  });

  test("CT-13. 둘 다 있으면 이름 문장 다음에 나라 문장이고 영어 줄에 관사가 선다", () => {
    expect(learnerProfilePreviewOf("Emma", countryOf("US"))).toEqual({
      kind: "yours",
      lines: [
        { ko: "Emma로 예약했어요.", en: "I booked under Emma." },
        { ko: "저는 미국에서 왔어요.", en: "I'm from the United States." },
      ],
    });
  });
});

describe("소스 검사", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/learner-profile-data.ts"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  test("CT-14. 첫 문이 background-only import이고 PrimJS에 없는 API를 쓰지 않는다", () => {
    expect(code.trimStart().startsWith('import "background-only";')).toBe(true);
    expect(code).not.toContain("localeCompare");
    expect(code).not.toContain("Intl.");
    expect(code).not.toContain(".normalize(");
  });
});
