import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { learnerFillOf } from "../app/learner-profile-fill";
import { decodeCountryNames, forgetCountryNames, rememberCountryNames } from "./country-names";
import type { LearnerCountry } from "./learner-profile.contract";
import { learnerCountries, learnerProfilePort } from "./learner-profile-data";
import { learnerCountryTextOf } from "./learner-profile";
import { fillPlaceholders } from "./placeholder-fill";

// `unit` 계층(LP-L1 ~ L5): 화면 언어별 미리보기 뜻 줄 · 문장 안 나라 이름(2026-11-19 l10n 점검 — es · id · ja · vi 학습자가 영어 뜻 줄과
// 영어 나라 이름을 봤다). 나라 이름 표는 번들 천장 때문에 콘텐츠 버킷 파일(`docs/content/country-names/<lang>.json`이 원본)이고,
// 받기 전에는 영어 이름입니다. 고르기 목록 · 검색은 영어 이름 그대로입니다(ADR-0059 D4).

const LANGUAGES = ["es", "id", "ja", "vi", "th", "my"] as const;
const fileOf = (language: string): string =>
  readFileSync(resolve(process.cwd(), `../../docs/content/country-names/${language}.json`), "utf8");
// 기기가 그 언어의 표를 받아 둔 상태입니다(영어는 표가 없습니다).
const received = (language: string): void => {
  if (language !== "en") rememberCountryNames(language, fileOf(language));
};

function countryOf(code: string): LearnerCountry {
  const found = learnerCountries.find((country) => country.code === code);
  if (found === undefined) throw new Error(`${code} 가 표에 없습니다`);
  return found;
}
const nameIn = (country: LearnerCountry, language: string): string =>
  learnerCountryTextOf(country, language).en;

afterEach(forgetCountryNames);

describe("LP-L1 버킷 원본 파일 — 언어마다 199개, 짧은 이름", () => {
  test.each(LANGUAGES)("%s — 디코드되고 나라 표의 코드를 모두 덮는다", (language) => {
    const table = decodeCountryNames(fileOf(language), language);
    expect(table).not.toBeNull();
    expect(Object.keys(table ?? {}).sort()).toEqual(learnerCountries.map((c) => c.code).sort());
  });

  test("CLDR의 긴 꼴(특별행정구 · 괄호 · 도시 구분)을 쓰지 않는다", () => {
    for (const language of LANGUAGES) received(language);
    expect(LANGUAGES.map((language) => nameIn(countryOf("VN"), language))).toEqual([
      "Vietnam",
      "Vietnam",
      "ベトナム",
      "Việt Nam",
      "เวียดนาม",
      "ဗီယက်နမ်",
    ]);
    expect(nameIn(countryOf("HK"), "th")).toBe("ฮ่องกง");
    expect(nameIn(countryOf("PS"), "my")).toBe("ပါလက်စတိုင်း");
    expect(nameIn(countryOf("HK"), "ja")).toBe("香港");
    expect(nameIn(countryOf("MM"), "es")).toBe("Myanmar");
    expect(nameIn(countryOf("CD"), "vi")).toBe("Cộng hòa Dân chủ Congo");
    for (const country of learnerCountries) {
      for (const language of LANGUAGES) {
        expect(nameIn(country, language), `${country.code} ${language}`).not.toMatch(/[()]| - /);
      }
    }
  });
});

describe("LP-L2 미리보기 뜻 줄이 화면 언어다(표를 받은 뒤)", () => {
  test.each([
    ["vi", "Tôi đã đặt chỗ dưới tên Emma.", "Tôi đến từ Việt Nam."],
    ["ja", "Emmaの名前で予約しました。", "ベトナムから来ました。"],
    ["es", "Reservé a nombre de Emma.", "Soy de Vietnam."],
    ["id", "Saya memesan atas nama Emma.", "Saya dari Vietnam."],
    ["th", "จองไว้ในชื่อ Emma", "มาจากเวียดนาม"],
    ["my", "Emma အမည်နဲ့ ကြိုတင်မှာထားပါတယ်။", "ဗီယက်နမ်က လာပါတယ်။"],
    ["en", "I booked under Emma.", "I'm from Vietnam."],
  ] as const)("%s", (language, name, country) => {
    received(language);
    const preview = learnerProfilePort.previewOf("Emma", countryOf("VN"), language);
    expect(preview.lines.map((line) => line.en)).toEqual([name, country]);
    expect(preview.lines.map((line) => line.ko)).toEqual([
      "Emma로 예약했어요.",
      "저는 베트남에서 왔어요.",
    ]);
  });

  test("견본(이름 · 나라 없음)도 화면 언어 — th · my도 그 언어(2026-11-20)", () => {
    expect(learnerProfilePort.previewOf(null, null, "ja").lines[0]?.en).toBe(
      "Emmaの名前で予約しました。",
    );
    expect(learnerProfilePort.previewOf(null, null, "th").lines[0]?.en).toBe("จองไว้ในชื่อ Emma");
    expect(learnerProfilePort.previewOf(null, null, "my").lines[0]?.en).toBe(
      "Emma အမည်နဲ့ ကြိုတင်မှာထားပါတယ်။",
    );
  });
});

describe("LP-L3 표가 없으면(받기 전 · 실패 · 오프라인) 영어 이름, 영어 밖 문장에는 관사 없이", () => {
  test("vi 문장에 Vietnam, es 문장에 Bahamas, 영어 문장에만 the", () => {
    expect(learnerProfilePort.previewOf(null, countryOf("VN"), "vi").lines[0]?.en).toBe(
      "Tôi đến từ Vietnam.",
    );
    expect(nameIn(countryOf("BS"), "es")).toBe("Bahamas");
    expect(nameIn(countryOf("US"), "es")).toBe("United States");
    expect(nameIn(countryOf("US"), "en")).toBe("the United States");
    expect(nameIn(countryOf("US"), "th")).toBe("United States");
  });

  test("못 읽는 원문을 기억하면 표가 없는 것과 같다", () => {
    rememberCountryNames("vi", "{");
    expect(nameIn(countryOf("VN"), "vi")).toBe("Vietnam");
  });
});

describe("LP-L4 레슨 번역 줄의 {나라}는 화면 언어의 나라 이름이다", () => {
  test("vi 표를 받은 뒤 치환 프로필 → 번역 줄에 Việt Nam, 한국어 줄은 그대로", () => {
    received("vi");
    const fill = learnerFillOf({ name: "Emma", countryCode: "VN" }, learnerProfilePort, "vi");
    expect(fillPlaceholders("Tôi đến từ {나라}.", fill, "en")).toBe("Tôi đến từ Việt Nam.");
    expect(fillPlaceholders("저는 {나라}에서 왔어요.", fill, "ko")).toBe("저는 베트남에서 왔어요.");
  });
});

describe("LP-L5 고르기 목록 · 검색은 영어 이름 그대로", () => {
  test("빈 질의는 영어 이름 순, 「viet」는 베트남", () => {
    received("vi");
    expect(learnerProfilePort.search("")[0]?.en).toBe("Afghanistan");
    expect(learnerProfilePort.search("viet").map((country) => country.code)).toEqual(["VN"]);
  });

  test("디코드는 스키마 · 언어 · 코드 · 빈 이름을 본다", () => {
    const body = (patch: object) =>
      JSON.stringify({
        schema: "country-names-1",
        language: "vi",
        names: { VN: "Việt Nam" },
        ...patch,
      });
    expect(decodeCountryNames(body({}), "vi")).toEqual({ VN: "Việt Nam" });
    expect(decodeCountryNames(body({}), "ja")).toBeNull();
    expect(decodeCountryNames(body({ schema: "x" }), "vi")).toBeNull();
    expect(decodeCountryNames(body({ names: { vn: "x" } }), "vi")).toBeNull();
    expect(decodeCountryNames(body({ names: { VN: " " } }), "vi")).toBeNull();
    expect(decodeCountryNames(body({ names: {} }), "vi")).toBeNull();
  });
});
