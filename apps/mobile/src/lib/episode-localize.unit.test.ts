import { expect, test } from "vitest";

import type { CatalogEntry } from "./episode-catalog";
import type { Episode } from "./episode-content.model";
import { localizeCatalog, localizeEpisode } from "./episode-localize";

// `unit` 계층: 콘텐츠 영어 칸을 UI 언어 번역으로 바꾸는 자리(ADR-0091 D2).

function episodeOf(translations?: Episode["translations"]): Episode {
  return {
    id: "u99-unit",
    schema: "delivery-2",
    title: "물 사기",
    titleEn: "Buying water",
    day: 1,
    timeOfDay: "낮",
    place: "편의점",
    counterpart: "점원",
    prologue: [],
    dialogue: [
      {
        seq: 1,
        role: "counterpart",
        text: { ko: "어서 오세요.", roman: "eoseo oseyo.", en: "Welcome." },
      },
    ],
    units: [
      {
        id: "S1",
        order: 1,
        items: [
          {
            id: "S1-01",
            type: "ROLE_LINE",
            mode: "choice",
            event: "R",
            prompt: { ko: "빈칸을 채우세요.", en: "Fill in the blank." },
            context: { ko: "물", roman: "mul", en: "water" },
            options: [
              {
                id: "o1",
                ko: "물",
                roman: "mul",
                en: "water",
                correct: true,
                whyWrong: "Fill in the blank.",
              },
            ],
          },
        ],
      },
    ],
    finalTest: { id: "RP", order: 2, items: [] },
    epilogue: [],
    words: [{ id: "voca:1", ko: "물", roman: "mul", glossEn: "water", role: "target" }],
    patterns: [],
    ...(translations === undefined ? {} : { translations }),
  } as unknown as Episode;
}

const VI = {
  vi: { "Fill in the blank.": "Điền vào chỗ trống.", water: "nước", "Buying water": "Mua nước" },
};

test("LZ1. 영어 칸(en · glossEn · titleEn)만 번역으로 바꾼다", () => {
  const out = localizeEpisode(episodeOf(VI), "vi") as unknown as Record<string, any>;
  expect(out.titleEn).toBe("Mua nước");
  expect(out.words[0].glossEn).toBe("nước");
  const item = out.units[0].items[0];
  expect(item.prompt).toEqual({ ko: "빈칸을 채우세요.", en: "Điền vào chỗ trống." });
  expect(item.context).toEqual({ ko: "물", roman: "mul", en: "nước" });
  expect(item.options[0].en).toBe("nước");
});

test("LZ2. 표에 없는 영어는 그대로, 한국어 · 로마자 · id · whyWrong은 바꾸지 않는다", () => {
  const out = localizeEpisode(episodeOf(VI), "vi") as unknown as Record<string, any>;
  expect(out.dialogue[0].text).toEqual({
    ko: "어서 오세요.",
    roman: "eoseo oseyo.",
    en: "Welcome.",
  });
  expect(out.units[0].items[0].options[0].whyWrong).toBe("Fill in the blank.");
  expect(out.title).toBe("물 사기");
  expect(out.id).toBe("u99-unit");
});

test("LZ3. 영어이거나 그 언어 표가 없으면 같은 객체를 돌려준다", () => {
  const withTable = episodeOf(VI);
  expect(localizeEpisode(withTable, "en")).toBe(withTable);
  const without = episodeOf();
  expect(localizeEpisode(without, "vi")).toBe(without);
});

test("LZ4. 입력을 바꾸지 않는다", () => {
  const source = episodeOf(VI);
  const before = JSON.stringify(source);
  localizeEpisode(source, "vi");
  expect(JSON.stringify(source)).toBe(before);
});

test("LZ5. 카탈로그: ready 항목만 바꾸고, 같은 (카탈로그, 언어)면 같은 결과 객체", () => {
  const catalog: CatalogEntry[] = [
    {
      status: "ready",
      id: "u99-unit",
      order: 1,
      title: "물 사기",
      version: "1",
      source: "bundled",
      episode: episodeOf(VI),
      warnings: [],
    },
    { status: "pending", id: "u98", order: 2, title: "대기", version: "1" },
  ];
  const first = localizeCatalog(catalog, "vi");
  expect(first).toBe(localizeCatalog(catalog, "vi"));
  expect(first[1]).toBe(catalog[1]);
  const ready = first[0];
  expect(ready?.status === "ready" && ready.episode.titleEn).toBe("Mua nước");
  expect(localizeCatalog(catalog, "en")).toBe(catalog);
});

test("LZ7. 스페인어는 es 표를 쓰고, 다른 언어 표만 있으면 같은 객체다(ADR-0097)", () => {
  const all = episodeOf({ vi: { water: "nước" }, id: { water: "air" }, es: { water: "agua" } });
  expect((localizeEpisode(all, "es") as unknown as Record<string, any>).words[0].glossEn).toBe(
    "agua",
  );
  const noEs = episodeOf({ vi: { water: "nước" }, id: { water: "air" } });
  expect(localizeEpisode(noEs, "es")).toBe(noEs);
});

test("LZ6. 인도네시아어는 id 표를 쓰고, 베트남어 표만 있으면 같은 객체다(ADR-0093)", () => {
  const both = episodeOf({ vi: { water: "nước" }, id: { water: "air" } });
  expect((localizeEpisode(both, "id") as unknown as Record<string, any>).words[0].glossEn).toBe(
    "air",
  );
  const viOnly = episodeOf({ vi: { water: "nước" } });
  expect(localizeEpisode(viOnly, "id")).toBe(viOnly);
});
