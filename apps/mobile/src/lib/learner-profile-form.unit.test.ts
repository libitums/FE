import { describe, expect, test, vi } from "vitest";

import type {
  LearnerProfileDraft,
  LearnerProfileDraftEvent,
  LearnerProfileDraftStatus,
} from "../components/learner-profile.contract";
import {
  countrySearchAnnouncement,
  countrySearchHelper,
  initialLearnerProfileDraft,
  learnerCountryAnnounceDelayMs,
  learnerCountryRowsOf,
  learnerProfileDraftReducer,
  learnerProfileDraftStatus,
  learnerProfilePreviewFor,
  learnerProfileSummary,
  onboardingProfileOutcome,
  visibleLearnerCountryIssue,
  visibleLearnerNameIssue,
} from "./learner-profile-form";
import type {
  LearnerCountry,
  LearnerProfilePort,
  LearnerProfilePreview,
  LearnerProfileRecord,
} from "./learner-profile.contract";
import { uiCopyEn } from "./ui-copy-en";

// `unit` 계층: 초안 전이 · 제출 판정 · 보일 오류 · 미리보기 인자 · 나라 줄 · 안내 줄 · 낭독 · 설정 요약 ·
// 온보딩 완료 판정의 입출력만 봅니다. 나라 표는 작은 대역 포트로 대신합니다.

const copy = uiCopyEn.learnerProfile;

const FR: LearnerCountry = { code: "FR", ko: "프랑스", roman: "peurangseu", en: "France" };
const DE: LearnerCountry = { code: "DE", ko: "독일", roman: "dogil", en: "Germany" };
const KR: LearnerCountry = { code: "KR", ko: "한국", roman: "hanguk", en: "South Korea" };
const TABLE: readonly LearnerCountry[] = [FR, DE, KR].sort((a, b) => (a.en < b.en ? -1 : 1));

function portOf(): LearnerProfilePort & { previewOf: ReturnType<typeof vi.fn> } {
  const previewOf = vi.fn<LearnerProfilePort["previewOf"]>(
    (name, country): LearnerProfilePreview => ({
      kind: name === null && country === null ? "example" : "yours",
      lines: [{ ko: `${name ?? "-"}|${country?.code ?? "-"}`, en: "-" }],
    }),
  );
  return {
    search: (query) => {
      const q = query.trim().toLowerCase();
      return q === "" ? TABLE : TABLE.filter((country) => country.en.toLowerCase().includes(q));
    },
    byCode: (code) => TABLE.find((country) => country.code === code) ?? null,
    previewOf,
  };
}

const draftOf = (over: Partial<LearnerProfileDraft> = {}): LearnerProfileDraft => ({
  name: "",
  countryCode: null,
  view: "form",
  query: "",
  incompleteNotice: "quiet",
  ...over,
});

describe("initialLearnerProfileDraft", () => {
  test("FM-1. 기록이 없으면 빈 양식이다", () => {
    expect(initialLearnerProfileDraft(null)).toEqual({
      name: "",
      countryCode: null,
      view: "form",
      query: "",
      incompleteNotice: "quiet",
    });
  });

  test("FM-1. 기록이 있으면 이름과 나라가 선다", () => {
    expect(initialLearnerProfileDraft({ name: "Emma", countryCode: "DE" })).toEqual({
      name: "Emma",
      countryCode: "DE",
      view: "form",
      query: "",
      incompleteNotice: "quiet",
    });
  });
});

describe("learnerProfileDraftReducer", () => {
  test("FM-2. name-changed는 입력을 그대로 담고 안내를 걷는다", () => {
    const next = learnerProfileDraftReducer(draftOf({ incompleteNotice: "shown" }), {
      type: "name-changed",
      value: "  Emma ",
    });

    expect(next).toMatchObject({ name: "  Emma ", incompleteNotice: "quiet" });
  });

  test("FM-2. picker-opened는 나라 고르기를 열고 질의를 비운다", () => {
    const next = learnerProfileDraftReducer(draftOf({ query: "old" }), { type: "picker-opened" });

    expect(next).toMatchObject({ view: "picker", query: "" });
  });

  test("FM-2. picker-closed는 양식으로 돌아가고 질의를 비우며 고른 값은 그대로다", () => {
    const next = learnerProfileDraftReducer(
      draftOf({ view: "picker", query: "fr", name: "Emma", countryCode: "DE" }),
      { type: "picker-closed" },
    );

    expect(next).toMatchObject({ view: "form", query: "", name: "Emma", countryCode: "DE" });
  });

  test("FM-2. query-changed는 나라 고르기에서만 질의를 바꾼다", () => {
    const next = learnerProfileDraftReducer(draftOf({ view: "picker" }), {
      type: "query-changed",
      value: "ger",
    });

    expect(next).toMatchObject({ view: "picker", query: "ger" });
  });

  test("FM-2. country-chosen은 나라를 담고 양식으로 돌아가며 안내를 걷는다", () => {
    const next = learnerProfileDraftReducer(
      draftOf({ view: "picker", query: "fr", incompleteNotice: "shown", name: "Emma" }),
      { type: "country-chosen", code: "FR" },
    );

    expect(next).toMatchObject({
      countryCode: "FR",
      view: "form",
      query: "",
      incompleteNotice: "quiet",
      name: "Emma",
    });
  });

  test("FM-2. incomplete-noticed는 안내를 세운다", () => {
    expect(
      learnerProfileDraftReducer(draftOf(), { type: "incomplete-noticed" }).incompleteNotice,
    ).toBe("shown");
  });

  test("FM-2. 입력 초안을 고치지 않는다", () => {
    const draft = Object.freeze(draftOf({ name: "Emma", countryCode: "DE" }));
    const events: readonly LearnerProfileDraftEvent[] = [
      { type: "name-changed", value: "x" },
      { type: "picker-opened" },
      { type: "picker-closed" },
      { type: "query-changed", value: "x" },
      { type: "country-chosen", code: "FR" },
      { type: "incomplete-noticed" },
    ];

    for (const event of events) {
      expect(() => learnerProfileDraftReducer(draft, event)).not.toThrow();
    }
    expect(draft).toEqual(draftOf({ name: "Emma", countryCode: "DE" }));
  });

  test("FM-3. 양식에서의 query-changed와 이미 세운 안내의 재통지는 같은 참조다", () => {
    const form = draftOf();
    const shown = draftOf({ incompleteNotice: "shown" });

    expect(learnerProfileDraftReducer(form, { type: "query-changed", value: "x" })).toBe(form);
    expect(learnerProfileDraftReducer(shown, { type: "incomplete-noticed" })).toBe(shown);
  });
});

describe("learnerProfileDraftStatus", () => {
  const status = (over: Partial<LearnerProfileDraft>): LearnerProfileDraftStatus =>
    learnerProfileDraftStatus(draftOf(over), portOf());

  test("FM-4. 이름과 나라가 둘 다 있으면 정규화된 기록으로 ready다", () => {
    expect(status({ name: "Emma", countryCode: "DE" })).toEqual({
      kind: "ready",
      record: { name: "Emma", countryCode: "DE" },
    });
    expect(status({ name: "  Mary   Ann ", countryCode: "FR" })).toEqual({
      kind: "ready",
      record: { name: "Mary Ann", countryCode: "FR" },
    });
  });

  test("FM-4. 둘 다 비었으면 empty다 (공백 이름 · 표에 없는 코드 포함)", () => {
    expect(status({})).toEqual({ kind: "empty" });
    expect(status({ name: "   " })).toEqual({ kind: "empty" });
    expect(status({ name: "", countryCode: "ZZ" })).toEqual({ kind: "empty" });
  });

  test("FM-4. 이름만 있으면 나라가 빈 incomplete다", () => {
    expect(status({ name: "Emma" })).toEqual({ kind: "incomplete", missing: "country" });
    expect(status({ name: "Emma", countryCode: "ZZ" })).toEqual({
      kind: "incomplete",
      missing: "country",
    });
  });

  test("FM-4. 나라만 있으면 이름이 빈 incomplete다", () => {
    expect(status({ countryCode: "FR" })).toEqual({ kind: "incomplete", missing: "name" });
    expect(status({ name: "   ", countryCode: "FR" })).toEqual({
      kind: "incomplete",
      missing: "name",
    });
  });

  test("FM-4. 이름이 규칙을 어기면 나라와 무관하게 invalid다", () => {
    expect(status({ name: "{x}", countryCode: "FR" })).toEqual({
      kind: "invalid",
      issue: "forbidden-character",
    });
    expect(status({ name: "{x}" })).toEqual({ kind: "invalid", issue: "forbidden-character" });
    expect(status({ name: "a".repeat(31), countryCode: "FR" })).toEqual({
      kind: "invalid",
      issue: "too-long",
    });
  });
});

describe("visibleLearnerNameIssue · visibleLearnerCountryIssue", () => {
  const port = portOf();

  test("FM-5. 금지 문자 · 길이는 안내 없이도 즉시 보인다", () => {
    expect(visibleLearnerNameIssue(draftOf({ name: "{x}" }), port)).toBe("forbidden-character");
    expect(visibleLearnerNameIssue(draftOf({ name: "a".repeat(31) }), port)).toBe("too-long");
  });

  test("FM-5. 빈 이름은 안내가 선 뒤에만 보인다", () => {
    expect(visibleLearnerNameIssue(draftOf({ countryCode: "FR" }), port)).toBeNull();
    expect(
      visibleLearnerNameIssue(draftOf({ countryCode: "FR", incompleteNotice: "shown" }), port),
    ).toBe("empty");
  });

  test("FM-5. 이름이 멀쩡하면 안내가 서도 이름 오류는 없다", () => {
    expect(
      visibleLearnerNameIssue(draftOf({ name: "Emma", incompleteNotice: "shown" }), port),
    ).toBeNull();
  });

  test("FM-5. 나라가 빈 오류도 안내가 선 뒤에만 보인다", () => {
    expect(visibleLearnerCountryIssue(draftOf({ name: "Emma" }), port)).toBeNull();
    expect(
      visibleLearnerCountryIssue(draftOf({ name: "Emma", incompleteNotice: "shown" }), port),
    ).toBe("missing");
  });

  test("FM-5. 나라를 골랐으면 안내가 서도 나라 오류는 없다", () => {
    expect(
      visibleLearnerCountryIssue(draftOf({ countryCode: "FR", incompleteNotice: "shown" }), port),
    ).toBeNull();
  });
});

describe("learnerProfilePreviewFor", () => {
  test("FM-6. 검증을 지난 이름과 표에서 찾은 나라를 포트에 넘긴다", () => {
    const port = portOf();

    learnerProfilePreviewFor(draftOf({ name: " Emma ", countryCode: "FR" }), port);

    expect(port.previewOf).toHaveBeenLastCalledWith("Emma", FR);
  });

  test("FM-6. 무효 이름은 없는 것으로 넘긴다 — 나라만 남는다", () => {
    const port = portOf();

    const preview = learnerProfilePreviewFor(draftOf({ name: "{x}", countryCode: "FR" }), port);

    expect(port.previewOf).toHaveBeenLastCalledWith(null, FR);
    expect(preview.kind).toBe("yours");
  });

  test("FM-6. 무효 이름에 나라도 없으면 example이다", () => {
    const port = portOf();

    const preview = learnerProfilePreviewFor(draftOf({ name: "{x}" }), port);

    expect(port.previewOf).toHaveBeenLastCalledWith(null, null);
    expect(preview.kind).toBe("example");
  });

  test("FM-6. 표에 없는 코드는 나라 없음으로 넘긴다", () => {
    const port = portOf();

    learnerProfilePreviewFor(draftOf({ name: "Emma", countryCode: "ZZ" }), port);

    expect(port.previewOf).toHaveBeenLastCalledWith("Emma", null);
  });
});

describe("learnerCountryRowsOf", () => {
  const port = portOf();

  test("FM-7. 질의가 비고 고른 나라가 있으면 그 줄이 맨 위이고 중복이 없다", () => {
    const rows = learnerCountryRowsOf(port, "", "KR");

    expect(rows.map((row) => row.code)[0]).toBe("KR");
    expect(rows).toHaveLength(TABLE.length);
    expect(rows.filter((row) => row.code === "KR")).toHaveLength(1);
    expect(rows.slice(1).map((row) => row.code)).toEqual(
      TABLE.filter((row) => row.code !== "KR").map((row) => row.code),
    );
  });

  test("FM-7. 고른 나라가 없거나 표에 없으면 검색 결과 그대로다", () => {
    expect(learnerCountryRowsOf(port, "", null)).toEqual(TABLE);
    expect(learnerCountryRowsOf(port, "", "ZZ")).toEqual(TABLE);
  });

  test("FM-7. 질의가 있으면 검색 결과 그대로다 — 고른 나라를 올리지 않는다", () => {
    expect(learnerCountryRowsOf(port, "an", "KR")).toEqual(port.search("an"));
  });
});

describe("countrySearchHelper · countrySearchAnnouncement", () => {
  test("FM-8. 안내 줄: 빈 질의 -> 전체 수, 결과 0 -> noMatches, 그 밖 -> matches", () => {
    expect(countrySearchHelper("", 199, copy)).toBe(copy.picker.allCountries(199));
    expect(countrySearchHelper("   ", 199, copy)).toBe(copy.picker.allCountries(199));
    expect(countrySearchHelper("xyz", 0, copy)).toBe(copy.picker.noMatches);
    expect(countrySearchHelper("ko", 1, copy)).toBe(copy.picker.matches(1));
    expect(countrySearchHelper("ko", 3, copy)).toBe(copy.picker.matches(3));
  });

  test("FM-8. 낭독: 빈 질의 -> null, 결과 0 -> noMatchesAnnouncement, 그 밖 -> matches", () => {
    expect(countrySearchAnnouncement("", 199, copy)).toBeNull();
    expect(countrySearchAnnouncement("xyz", 0, copy)).toBe(copy.picker.noMatchesAnnouncement);
    expect(countrySearchAnnouncement("ko", 3, copy)).toBe(copy.picker.matches(3));
  });

  test("FM-8. 낭독 지연은 600ms다", () => {
    expect(learnerCountryAnnounceDelayMs).toBe(600);
  });
});

describe("learnerProfileSummary", () => {
  const port = portOf();
  const record: LearnerProfileRecord = { name: "Emma", countryCode: "FR" };
  const both = copy.summary.both("Emma", "France");

  test("FM-9. 둘 다 있으면 이름 · 영어 나라 이름이다", () => {
    expect(learnerProfileSummary(record, "none", port, copy)).toBe(both);
    expect(learnerProfileSummary(record, "synced", port, copy)).toBe(both);
  });

  test("FM-9. 기록이 없으면 notSet이다", () => {
    expect(learnerProfileSummary(null, "none", port, copy)).toBe(copy.notSet);
  });

  test("FM-9. 미전송이면 기기 저장 문장이 붙는다", () => {
    expect(learnerProfileSummary(record, "pending", port, copy)).toBe(copy.summary.pending(both));
  });

  test("FM-9. 표에 없는 코드를 그대로 드러내지 않고 던지지 않는다", () => {
    const unknown: LearnerProfileRecord = { name: "Emma", countryCode: "ZZ" };

    expect(() => learnerProfileSummary(unknown, "none", port, copy)).not.toThrow();
    expect(learnerProfileSummary(unknown, "none", port, copy)).not.toContain("ZZ");
  });
});

describe("onboardingProfileOutcome", () => {
  test("FM-10. ready는 저장, empty는 건너뜀, incomplete · invalid는 머문다", () => {
    const record: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };

    expect(onboardingProfileOutcome({ kind: "ready", record })).toEqual({ kind: "saved", record });
    expect(onboardingProfileOutcome({ kind: "empty" })).toEqual({ kind: "skipped" });
    expect(onboardingProfileOutcome({ kind: "incomplete", missing: "country" })).toBeNull();
    expect(onboardingProfileOutcome({ kind: "incomplete", missing: "name" })).toBeNull();
    expect(onboardingProfileOutcome({ kind: "invalid", issue: "too-long" })).toBeNull();
  });
});
