import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { Episode, EpisodeCut, LearningItem } from "../lib/episode-content.model";
import { learnerProfilePort } from "../lib/learner-profile-data";
import type { LearnerProfilePrompt, LearnerProfileRecord } from "../lib/learner-profile.contract";
import { noLearnerProfilePort } from "../lib/learner-profile";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { noEpisodeContent } from "./episode-content";
import type { EpisodeContent } from "./episode-content";
import {
  catalogEntryNeedsLearnerProfile,
  learnerFillOf,
  learnerProfileGateOf,
} from "./learner-profile-gate";

// `unit` 계층: 치환용 프로필 만들기 · 「필요한 에피소드」 판정 · 시작 가드 판정의 입출력만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

/** 항목 참조로 메모하는 함수라 테스트마다 새 항목 객체를 씁니다. */
function readyCopyOf(episodeId: string): ReadyEntry {
  const entry = realCatalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") {
    throw new Error(`${episodeId} 가 ready가 아닙니다`);
  }
  return { ...entry };
}

const contentOf = (fillText: EpisodeContent["fillText"] = fillPlaceholders): EpisodeContent => ({
  catalog: [],
  imageUrlOf: (path) => `https://cdn/${path}`,
  fillText,
});

function entryWith(patch: Partial<Episode>): ReadyEntry {
  const base = readyCopyOf("u01-water");
  return { ...base, episode: { ...base.episode, ...patch } };
}

const narration = (ko: string): EpisodeCut => ({
  kind: "narration",
  index: 1,
  narration: { ko, roman: "roman" },
  imageBrief: "brief",
});

const vocabCard = (ko: string): LearningItem => ({
  id: "V1",
  event: "E",
  type: "VOCAB_CARD",
  context: { ko, roman: "roman" },
  example: { ko: "예문", roman: "yemun" },
  cardKind: "단어",
});

const roleplay = (ko: string): LearningItem =>
  ({
    id: "RP-01",
    event: "R",
    type: "ROLEPLAY_TURN",
    prompt: { ko: "질문", en: "Question" },
    context: { ko, roman: "roman" },
    stimulus: {},
    tiles: [{ ko: "내", roman: "nae" }],
    answers: [{ ko: "내", roman: "nae" }],
  }) as unknown as LearningItem;

function withUnitItem(item: LearningItem): ReadyEntry {
  const base = readyCopyOf("u01-water");
  const [first, ...rest] = base.episode.units;
  if (first === undefined) throw new Error("유닛이 없습니다");
  return { ...base, episode: { ...base.episode, units: [{ ...first, items: [item] }, ...rest] } };
}

function withFinalItem(item: LearningItem): ReadyEntry {
  const base = readyCopyOf("u01-water");
  return {
    ...base,
    episode: { ...base.episode, finalTest: { ...base.episode.finalTest, items: [item] } },
  };
}

describe("learnerFillOf", () => {
  const emma: LearnerProfileRecord = { name: "Emma", countryCode: "US" };

  test("PG-1. 기록이 없으면 noLearnerProfile 그 참조다", () => {
    expect(learnerFillOf(null, learnerProfilePort)).toBe(noLearnerProfile);
    expect(learnerFillOf(null, noLearnerProfilePort)).toBe(noLearnerProfile);
  });

  test("PG-2. 기록이 있으면 이름과 나라의 세 표기가 선다", () => {
    expect(learnerFillOf(emma, learnerProfilePort)).toEqual({
      name: "Emma",
      country: { ko: "미국", roman: "miguk", en: "the United States" },
    });
    expect(learnerFillOf({ name: "Liam", countryCode: "DE" }, learnerProfilePort)).toEqual({
      name: "Liam",
      country: { ko: "독일", roman: "dogil", en: "Germany" },
    });
  });

  test("PG-3. 표에 없는 코드는 나라 키가 빠진다", () => {
    const fill = learnerFillOf({ name: "Emma", countryCode: "ZZ" }, learnerProfilePort);

    expect(fill).toEqual({ name: "Emma" });
    expect(Object.keys(fill)).toEqual(["name"]);
  });

  test("PG-3. 빈 포트(자산이 아직 닫히지 않음)에서도 나라 키가 빠진다", () => {
    const fill = learnerFillOf(emma, noLearnerProfilePort);

    expect(fill).toEqual({ name: "Emma" });
    expect(Object.keys(fill)).toEqual(["name"]);
  });
});

describe("catalogEntryNeedsLearnerProfile", () => {
  test.each([
    ["u01-water", false],
    ["u02-checkin", true],
    ["u03-mina", true],
  ])("PG-4. 실데이터 %s -> %s", (episodeId, expected) => {
    expect(catalogEntryNeedsLearnerProfile(contentOf(), readyCopyOf(episodeId))).toBe(expected);
  });

  test.each([
    ["표지 컷에만", () => entryWith({ prologue: [narration("저는 {이름}이에요.")] })],
    ["유닛 문항에만", () => withUnitItem(vocabCard("{나라}에서"))],
    ["최종 테스트에만", () => withFinalItem(roleplay("{이름}은/는요?"))],
    ["통과 뒤 컷에만", () => entryWith({ epilogue: [narration("{나라}")] })],
  ])("PG-5. 토큰이 %s 있어도 참이다", (_label, makeEntry) => {
    expect(catalogEntryNeedsLearnerProfile(contentOf(), makeEntry())).toBe(true);
  });

  test("PG-5. 대사(dialogue)에만 토큰이 있으면 거짓이다", () => {
    const entry = entryWith({
      dialogue: [{ seq: 1, role: "player", text: { ko: "{이름}", roman: "ireum" } }],
    });

    expect(catalogEntryNeedsLearnerProfile(contentOf(), entry)).toBe(false);
  });

  test("PG-5. 치환 대상이 아닌 중괄호({수단} · {명사})만 있으면 거짓이다", () => {
    const entry = withUnitItem(vocabCard("{수단}(으)로 {명사}를 해요."));

    expect(catalogEntryNeedsLearnerProfile(contentOf(), entry)).toBe(false);
  });

  test("PG-6. 항등 치환(noEpisodeContent)이면 늘 거짓이다", () => {
    expect(catalogEntryNeedsLearnerProfile(noEpisodeContent, readyCopyOf("u02-checkin"))).toBe(
      false,
    );
    expect(
      catalogEntryNeedsLearnerProfile(
        noEpisodeContent,
        entryWith({ prologue: [narration("{이름}")] }),
      ),
    ).toBe(false);
  });

  test("PG-7. 같은 항목 참조로 다시 부르면 치환기를 다시 부르지 않는다", () => {
    const fillText = vi.fn<typeof fillPlaceholders>(fillPlaceholders);
    const content = contentOf(fillText);
    const entry = readyCopyOf("u02-checkin");

    const first = catalogEntryNeedsLearnerProfile(content, entry);
    const callsAfterFirst = fillText.mock.calls.length;
    const second = catalogEntryNeedsLearnerProfile(content, entry);

    expect(first).toBe(true);
    expect(callsAfterFirst).toBeGreaterThan(0);
    expect(second).toBe(true);
    expect(fillText.mock.calls.length).toBe(callsAfterFirst);
  });
});

describe("learnerProfileGateOf", () => {
  const record: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };
  const combos: readonly {
    needsProfile: boolean;
    record: LearnerProfileRecord | null;
    prompt: LearnerProfilePrompt;
  }[] = [true, false].flatMap((needsProfile) =>
    [null, record].flatMap((candidate) =>
      (["open", "asked"] as const).map((prompt) => ({ needsProfile, record: candidate, prompt })),
    ),
  );

  test("PG-8. 조합 여덟 가운데 필요 · 기록 없음 · 안 물음 하나만 묻는다", () => {
    expect(combos).toHaveLength(8);
    const asked = combos.filter((input) => learnerProfileGateOf(input) === "ask");

    expect(asked).toEqual([{ needsProfile: true, record: null, prompt: "open" }]);
    const others = combos.filter((input) => input !== asked[0]).map(learnerProfileGateOf);
    expect(others).toEqual(Array.from({ length: 7 }, () => "pass"));
  });
});

describe("소스 검사", () => {
  test("PG-9. 치환기 · 나라 표를 값으로 import하지 않는다(타입만)", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/learner-profile-gate.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const violations: string[] = [];

    for (const match of source.matchAll(/import\s+(type\s+)?([^;]*?)\s+from\s+"([^"]+)"/g)) {
      const guarded = /\/lib\/(placeholder-fill|learner-profile-data)$/.test(match[3] ?? "");
      if (guarded && match[1] === undefined) violations.push(match[3] ?? "");
    }

    expect(source).toContain("learnerFillOf");
    expect(violations).toEqual([]);
  });
});
