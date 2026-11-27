import { describe, expect, test } from "vitest";

import { storyPushPlan } from "./companion-stories-handler.ts";
import { allCampaignCopy, pushCampaignConfig } from "./push-campaign-config.ts";
import { copyLanguageFor, storyLanguageFor } from "./push-campaign-locale.ts";
import { renderCopy } from "./push-campaign-text.ts";

test("SL-U5. 이름 없는 학습자에게도 모든 언어 문구가 쉼표(, ， 、)로 시작하지 않는다", () => {
  const vars = { name: "", episode: "Buying Water", character: "미나", steps: 2 };
  for (const [segment, copy] of allCampaignCopy(pushCampaignConfig)) {
    for (const [language, entry] of Object.entries(copy)) {
      for (const text of [renderCopy(entry.title, vars), renderCopy(entry.body, vars)]) {
        expect(text, `${segment} ${language}`).not.toMatch(/^[\s,，、]/u);
        expect(text, `${segment} ${language}`).not.toContain("{name}");
      }
    }
  }
});

// `unit` 계층(SL-U1 ~ U5): 서비스 기반 언어 검증의 서버 쪽 장치(ADR-0185). 서버가 만드는 사용자 글은 받는 사람 나라(학습 프로필)로
// 언어를 고릅니다 — 대만 · 홍콩 · 마카오는 대만 중국어(번체). 언어 목록에서 zh-TW가 빠지거나, 번역 문구가 비거나 자리표시자를 잃으면 실패합니다.

const TRADITIONAL = ["TW", "tw", "HK", "MO"];
const HAN = /[一-鿿]/u;
const placeholders = (text: string) => (text.match(/\{[a-z]+\}/g) ?? []).sort();

test("SL-U1. 나라 → 문구 언어: 대만 · 홍콩 · 마카오는 zh-TW, 중국 · 싱가포르(간체)는 영어다", () => {
  for (const country of TRADITIONAL) {
    expect(copyLanguageFor(country), country).toBe("zh-TW");
    expect(storyLanguageFor(country), country).toBe("zh-TW");
  }
  for (const country of ["CN", "SG", null, ""]) {
    expect(copyLanguageFor(country), String(country)).toBe("en");
    expect(storyLanguageFor(country), String(country)).toBe("en");
  }
});

describe("SL-U2. 자동 캠페인 문구 — 영어 밖 언어가 있는 묶음은 zh-TW도 있고 자리표시자를 지킨다", () => {
  const segments = allCampaignCopy(pushCampaignConfig).filter(
    ([, copy]) => Object.keys(copy).length > 1,
  );

  test("영어 밖 언어가 있는 묶음이 하나 이상이다", () => {
    expect(segments.length).toBeGreaterThan(0);
  });

  test.each(segments)("%s", (_segment, copy) => {
    const zh = copy["zh-TW"];
    const en = copy["en"]!;
    expect(zh, "zh-TW 문구가 없습니다").toBeDefined();
    expect(zh!.title.trim()).not.toBe("");
    expect(zh!.body.trim()).not.toBe("");
    expect(zh!.body).toMatch(HAN);
    expect(placeholders(zh!.title)).toEqual(placeholders(en.title));
    expect(placeholders(zh!.body)).toEqual(placeholders(en.body));
  });

  test("영어 밖 언어 묶음은 모두 같은 언어 집합이다(한 언어만 빠진 묶음이 없다)", () => {
    const sets = segments.map(([segment, copy]) => [segment, Object.keys(copy).sort().join(",")]);
    expect(new Set(sets.map(([, keys]) => keys)).size, JSON.stringify(sets)).toBe(1);
  });
});

test("SL-U3. 친구 스토리 알림 본문은 대만 사용자에게 번체이고 한국어 줄을 그대로 싣는다", () => {
  const plan = storyPushPlan({
    mode: "testers",
    tester: true,
    userId: "u1",
    name: "정윤경",
    line: "오늘 익선동 산책했어요",
    country: "TW",
  });
  expect(plan?.lang).toBe("zh-TW");
  expect(plan?.body).toMatch(HAN);
  expect(plan?.body).toContain("오늘 익선동 산책했어요");
});

test("SL-U4. 친구 스토리 알림은 나라 언어 여덟(영어 + 일곱) 모두 자기 문구가 있다", () => {
  const countries = ["US", "ES", "ID", "JP", "VN", "TH", "MM", "TW"];
  const langs = countries.map(
    (country) =>
      storyPushPlan({ mode: "testers", tester: true, userId: "u1", name: "A", line: "x", country })
        ?.lang,
  );
  expect(langs).toEqual(["en", "es", "id", "ja", "vi", "th", "my", "zh-TW"]);
});
