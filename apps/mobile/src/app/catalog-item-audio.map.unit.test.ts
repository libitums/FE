import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { catalogGlossOf } from "./catalog-card-map";
import { listeningItemOf } from "./catalog-choice-map";
import { catalogItemOf } from "./catalog-item-map";
import {
  AUDIO_SOURCE,
  audioPortOf,
  dictation,
  imgMatch,
  listenBuildItem,
  listenSelect,
  minPairAb,
  replySelect,
  shadow,
  speakWord,
  syllableBuildItem,
  translateToEn,
  translateToKo,
  wordOrder,
} from "./catalog-item-audio.test-support";
import type { CatalogFill, CatalogMappedItem } from "./catalog-lesson-types";
import { noCatalogAudioUrl } from "./catalog-lesson-plan";
import { t } from "./catalog-screens.test-support";

// `unit` 계층: 열두 유형이 문항 음성을 얻은 매핑 결과. 소리 없음 판은 지금 결과 그대로여야 합니다.

const withSound = audioPortOf();
const noSound = audioPortOf(noCatalogAudioUrl);

type Mapped = Exclude<CatalogMappedItem, { kind: "skipped" }>;

function mapped(item: LearningItem, port = withSound): Mapped {
  const result = catalogItemOf(item, port);
  if (result.kind === "skipped") throw new Error(`건너뜀: ${result.reason}`);
  return result;
}

/** 아직 타입에 없는 `audio` 키를 값으로 읽습니다. */
function audioOf(result: Mapped): unknown {
  return (result.question as unknown as { audio?: unknown }).audio;
}

const listenOf = (itemId: string, itemType: string) => ({
  kind: "listen",
  source: AUDIO_SOURCE,
  ref: { itemId, itemType },
});
const echo = { kind: "answer-echo", source: AUDIO_SOURCE };

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const readyEntries = catalog.filter(
  (entry): entry is Extract<CatalogEntry, { status: "ready" }> => entry.status === "ready",
);

function u00Item<T extends LearningItem["type"]>(
  itemId: string,
  type: T,
): Extract<LearningItem, { type: T }> {
  const entry = readyEntries.find((candidate) => candidate.id === TUTORIAL_EPISODE_ID);
  const found = entry?.episode.units
    .flatMap((unit) => unit.items)
    .find(
      (item): item is Extract<LearningItem, { type: T }> =>
        item.id === itemId && item.type === type,
    );
  if (found === undefined) throw new Error(`u00 ${itemId}가 없다`);
  return found;
}

function u00Port(audioUrlOf: (path: string) => string | null) {
  const entry = readyEntries.find((candidate) => candidate.id === TUTORIAL_EPISODE_ID);
  if (entry === undefined) throw new Error("u00 is not ready");
  return {
    fill,
    episodeId: TUTORIAL_EPISODE_ID,
    glossOf: catalogGlossOf(entry.episode.words, fill),
    imageUrlOf: (path: string) => `https://cdn/${path}`,
    audioUrlOf,
  };
}

describe("MP1. LISTEN_SELECT · MIN_PAIR_AB", () => {
  test("MP1. u00 S2-01은 주소 포트에서 listening이고 audio.source가 d-04 음성이다", () => {
    const item = u00Item("S2-01", "LISTEN_SELECT");
    expect(item.stimulus.audioUrl).toBe("u00-tutorial/d-04");

    const result = listeningItemOf(
      item,
      u00Port((path) => `https://cdn/${path}`),
    );

    expect(result.kind).toBe("listening");
    if (result.kind !== "listening") return;
    expect(audioOf(result)).toEqual({
      kind: "listen",
      source: "https://cdn/audio/u00-tutorial/d-04.m4a",
      ref: { itemId: "S2-01", itemType: "LISTEN_SELECT" },
    });
  });

  test("MP1. 같은 문항을 소리 없는 포트로 매핑하면 건너뛰지 않고 audio null 듣기 문항이다", () => {
    const result = listeningItemOf(u00Item("S2-01", "LISTEN_SELECT"), u00Port(noCatalogAudioUrl));

    expect(result).toMatchObject({ kind: "listening", itemId: "S2-01" });
    if (result.kind !== "listening") return;
    expect(audioOf(result)).toBeNull();
  });

  test("MP2. 보기 0개는 소리가 있어도 no-options다", () => {
    const { options: _options, ...noOptions } = listenSelect();

    expect(catalogItemOf(noOptions, withSound)).toMatchObject({
      kind: "skipped",
      reason: "no-options",
    });
  });

  test("MP2. 보기 3개는 소리가 있어도 malformed다", () => {
    const base = listenSelect();
    const three = {
      ...base,
      options: [...base.options!, { ...base.options![0]!, id: "o3", correct: false }],
    };

    expect(catalogItemOf(three, withSound)).toMatchObject({ kind: "skipped", reason: "malformed" });
  });

  test("MP2. 모양이 맞고 소리가 없으면 건너뛰지 않고 audio null 듣기 문항이다", () => {
    const result = catalogItemOf(listenSelect(), noSound);

    expect(result.kind).toBe("listening");
    if (result.kind !== "listening") return;
    expect(audioOf(result)).toBeNull();
  });

  test("MP2. MIN_PAIR_AB도 소리가 없으면 audio null 듣기 문항이다", () => {
    const result = catalogItemOf(minPairAb(), noSound);

    expect(result.kind).toBe("listening");
    if (result.kind !== "listening") return;
    expect(audioOf(result)).toBeNull();
  });

  test("MP2. 소리가 없어도 보기 3개는 audio-missing이 아니라 malformed다", () => {
    const base = listenSelect();
    const three = {
      ...base,
      options: [...base.options!, { ...base.options![0]!, id: "o3", correct: false }],
    };

    expect(catalogItemOf(three, noSound)).toMatchObject({ kind: "skipped", reason: "malformed" });
  });

  test("MP2. MIN_PAIR_AB는 소리가 있으면 보기 둘의 listening이다", () => {
    const result = mapped(minPairAb());

    expect(result.kind).toBe("listening");
    expect(audioOf(result)).toEqual(listenOf("M1", "MIN_PAIR_AB"));
  });
});

describe("MP3. REPLY_SELECT", () => {
  test("MP3. 소리 있는 판은 소리 없는 판과 audio 키 하나만 다르다", () => {
    const without = mapped(replySelect(), noSound);
    const withAudio = mapped(replySelect());

    expect(without.kind).toBe("word-choice");
    expect(withAudio).toEqual({
      ...without,
      question: { ...without.question, audio: listenOf("R1", "REPLY_SELECT") },
    });
  });

  test("MP3. 소리 없는 판에는 audio 키가 없다", () => {
    expect("audio" in mapped(replySelect(), noSound).question).toBe(false);
  });
});

describe("MP4. 타자", () => {
  test("MP4. DICTATION은 소리 있으면 listen, 없으면 audio: null이고 나머지는 같다", () => {
    const without = mapped(dictation(), noSound);
    const withAudio = mapped(dictation());

    expect(audioOf(without)).toBeNull();
    expect(audioOf(withAudio)).toEqual(listenOf("D1", "DICTATION"));
    expect({ ...withAudio.question, audio: null }).toEqual(without.question);
  });

  test("MP4. TRANSLATE_TO_KO는 answer-echo다", () => {
    const withAudio = mapped(translateToKo());

    expect(withAudio.kind).toBe("typing");
    expect(audioOf(withAudio)).toEqual(echo);
    expect({ ...withAudio.question, audio: null }).toEqual(
      mapped(translateToKo(), noSound).question,
    );
  });

  test("MP4. SENT_BUILD는 audio: null이다", () => {
    const item: LearningItem = {
      id: "T1",
      event: "R",
      type: "SENT_BUILD",
      prompt: t("쓰세요.", undefined, "Write."),
      context: t("패턴", "paeteon", "Pattern"),
      answers: [t("물이에요", "mul-ieyo", "It is water")],
    };

    expect(audioOf(mapped(item))).toBeNull();
  });
});

describe("MP5. SHADOW", () => {
  test("MP5. 소리 있는 판은 소리 없는 판과 audio 키 하나만 다르다", () => {
    const without = mapped(shadow(), noSound);
    const withAudio = mapped(shadow());

    expect(withAudio.kind).toBe("read-aloud");
    expect(withAudio).toEqual({
      ...without,
      question: { ...without.question, audio: listenOf("H1", "SHADOW") },
    });
    expect("audio" in without.question).toBe(false);
  });
});

describe("MP6. 정답 뒤 재생 유형", () => {
  const cases = [
    ["WORD_ORDER", wordOrder, "sentence-order"],
    ["SYLLABLE_BUILD", syllableBuildItem, "syllable-build"],
    ["SPEAK_WORD", speakWord, "speak-word"],
    ["IMG_MATCH", imgMatch, "word-choice"],
    ["TRANSLATE_TO_EN", translateToEn, "word-choice"],
  ] as const;

  test.each(cases)(
    "MP6. %s는 audio가 answer-echo이고 나머지는 소리 없는 판과 같다",
    (_type, build, kind) => {
      const without = mapped(build(), noSound);
      const withAudio = mapped(build());

      expect(withAudio.kind).toBe(kind);
      expect(withAudio).toEqual({ ...without, question: { ...without.question, audio: echo } });
      expect("audio" in without.question).toBe(false);
    },
  );
});

describe("LISTEN_BUILD", () => {
  const tileKo = ["안녕하세요!", "한국은", "처음이세요?", "잘하시네요!", "감사합니다!"];

  test("LB2. u00 S7-01은 섞은 칩 다섯과 정답 순서를 가진 문장 순서 문항이다", async () => {
    const { shuffledOrder } = await import("./catalog-shuffle");
    const item = u00Item("S7-01", "LISTEN_BUILD");

    const result = catalogItemOf(
      item,
      u00Port((path) => `https://cdn/${path}`),
    );

    expect(result.kind).toBe("sentence-order");
    if (result.kind !== "sentence-order") return;
    const order = shuffledOrder("u00-tutorial/S7-01", 5);
    expect(result.question.chips).toEqual(order.map((index) => tileKo[index]));
    expect(result.question.answerOrder.map((index) => result.question.chips[index])).toEqual([
      "안녕하세요!",
      "한국은",
      "처음이세요?",
    ]);
    expect(result.question.prompt).toBe("Hello! Is this your first time in Korea?");
    expect(result.question.instruction).toBe("Listen and build the sentence.");
    expect(result.question).not.toHaveProperty("dialogue");
    expect(audioOf(result)).toEqual({
      kind: "listen",
      source: "https://cdn/audio/u00-tutorial/d-01.m4a",
      ref: { itemId: "S7-01", itemType: "LISTEN_BUILD" },
    });
  });

  test("LB3. 소리가 없으면 모양이 틀려도 audio-missing이다", () => {
    const broken = { ...listenBuildItem(), tiles: [] };

    expect(catalogItemOf(broken, noSound)).toMatchObject({
      kind: "skipped",
      reason: "audio-missing",
    });
  });

  test("LB4. 소리가 있고 정답 조각이 타일에 없으면 malformed다", () => {
    const item = { ...listenBuildItem(), answers: [t("가나 마")] };

    expect(catalogItemOf(item, withSound)).toMatchObject({ kind: "skipped", reason: "malformed" });
  });

  test("LB4. 소리가 있고 빈 타일이 있으면 malformed다", () => {
    const item = { ...listenBuildItem(), tiles: [t("가나"), t(""), t("다")] };

    expect(catalogItemOf(item, withSound)).toMatchObject({ kind: "skipped", reason: "malformed" });
  });

  test("LB5. 같은 글자 타일 둘에 정답 조각 둘이면 앞 타일부터 하나씩 쓴다", async () => {
    const { shuffledOrder } = await import("./catalog-shuffle");
    const item = {
      ...listenBuildItem(),
      tiles: [t("가"), t("가"), t("나")],
      answers: [t("가 가 나")],
    };

    const result = mapped(item);

    const order = shuffledOrder("u01-water/B1", 3);
    expect(result.kind).toBe("sentence-order");
    expect(result.question).toMatchObject({
      chips: order.map((index) => ["가", "가", "나"][index]),
      answerOrder: [0, 1, 2].map((tile) => order.indexOf(tile)),
    });
  });

  test("LB6. 내장 에피소드의 LISTEN_BUILD는 주소 포트에서 malformed가 하나도 없다", () => {
    const malformed: string[] = [];
    let total = 0;
    for (const entry of readyEntries) {
      const port = { ...u00Port((path) => `https://cdn/${path}`), episodeId: entry.id };
      for (const item of entry.episode.units.flatMap((unit) => unit.items)) {
        if (item.type !== "LISTEN_BUILD") continue;
        total += 1;
        const result = catalogItemOf(item, port);
        if (result.kind === "skipped" && result.reason === "malformed") {
          malformed.push(`${entry.id}/${item.id}`);
        }
      }
    }

    expect(total).toBeGreaterThan(0);
    expect(malformed).toEqual([]);
  });
});
