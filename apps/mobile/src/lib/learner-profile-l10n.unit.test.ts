import { describe, expect, test } from "vitest";

import { learnerFillOf } from "../app/learner-profile-fill";
import type { LearnerCountry } from "./learner-profile.contract";
import { learnerCountries, learnerProfilePort } from "./learner-profile-data";
import { learnerCountryTextOf } from "./learner-profile";
import { fillPlaceholders } from "./placeholder-fill";

// `unit` 계층(LP-L1 ~ L4): 화면 언어별 미리보기 뜻 줄 · 문장 안 나라 이름(2026-11-19 l10n 점검 — es · id · ja · vi 학습자가 영어 뜻 줄과
// 영어 나라 이름을 봤다). 고르기 목록 · 검색은 영어 이름 그대로입니다(ADR-0059 D4).

const LANGUAGES = ["es", "id", "ja", "vi"] as const;

function countryOf(code: string): LearnerCountry {
  const found = learnerCountries.find((country) => country.code === code);
  if (found === undefined) throw new Error(`${code} 가 표에 없습니다`);
  return found;
}

describe("LP-L1 나라 이름이 모든 화면 언어에 있다", () => {
  test.each(LANGUAGES)("%s — 199개 모두 비지 않았다", (language) => {
    for (const country of learnerCountries) {
      expect(country.names?.[language] ?? "", `${country.code} ${language}`).not.toBe("");
    }
  });

  test("짧은 이름 정책 — CLDR의 긴 꼴(특별행정구 · 괄호 · 도시 이름)을 쓰지 않는다", () => {
    expect(countryOf("VN").names).toEqual({
      es: "Vietnam",
      id: "Vietnam",
      ja: "ベトナム",
      vi: "Việt Nam",
    });
    expect(countryOf("HK").names?.ja).toBe("香港");
    expect(countryOf("MM").names?.es).toBe("Myanmar");
    expect(countryOf("CD").names?.vi).toBe("Cộng hòa Dân chủ Congo");
    for (const country of learnerCountries) {
      for (const language of LANGUAGES) {
        expect(country.names?.[language] ?? "", `${country.code} ${language}`).not.toMatch(
          /[()]| - /,
        );
      }
    }
  });
});

describe("LP-L2 미리보기 뜻 줄이 화면 언어다", () => {
  test.each([
    ["vi", "Tôi đã đặt chỗ dưới tên Emma.", "Tôi đến từ Việt Nam."],
    ["ja", "Emmaの名前で予約しました。", "ベトナムから来ました。"],
    ["es", "Reservé a nombre de Emma.", "Soy de Vietnam."],
    ["id", "Saya memesan atas nama Emma.", "Saya dari Vietnam."],
    ["en", "I booked under Emma.", "I'm from Vietnam."],
  ] as const)("%s", (language, name, country) => {
    const preview = learnerProfilePort.previewOf("Emma", countryOf("VN"), language);
    expect(preview.lines.map((line) => line.en)).toEqual([name, country]);
    expect(preview.lines.map((line) => line.ko)).toEqual([
      "Emma로 예약했어요.",
      "저는 베트남에서 왔어요.",
    ]);
  });

  test("견본(이름 · 나라 없음)도 화면 언어, th · my는 영어", () => {
    expect(learnerProfilePort.previewOf(null, null, "ja").lines[0]?.en).toBe(
      "Emmaの名前で予約しました。",
    );
    expect(learnerProfilePort.previewOf(null, null, "th").lines[0]?.en).toBe(
      "I booked under Emma.",
    );
  });
});

describe("LP-L3 레슨 번역 줄의 {나라}는 화면 언어의 나라 이름이다", () => {
  test("vi 기록의 치환 프로필 → 번역 줄에 Việt Nam, 한국어 · 로마자 줄은 그대로", () => {
    const fill = learnerFillOf({ name: "Emma", countryCode: "VN" }, learnerProfilePort, "vi");
    expect(fillPlaceholders("Tôi đến từ {나라}.", fill, "en")).toBe("Tôi đến từ Việt Nam.");
    expect(fillPlaceholders("저는 {나라}에서 왔어요.", fill, "ko")).toBe("저는 베트남에서 왔어요.");
  });

  test("en · th는 영어 이름 + 관사", () => {
    const us = countryOf("US");
    expect(learnerCountryTextOf(us, "en").en).toBe("the United States");
    expect(learnerCountryTextOf(us, "th").en).toBe("the United States");
    expect(learnerCountryTextOf(us, "es").en).toBe("Estados Unidos");
  });
});

describe("LP-L4 고르기 목록 · 검색은 영어 이름 그대로", () => {
  test("빈 질의는 영어 이름 순, 「viet」는 베트남", () => {
    expect(learnerProfilePort.search("")[0]?.en).toBe("Afghanistan");
    expect(learnerProfilePort.search("viet").map((country) => country.code)).toEqual(["VN"]);
  });
});
