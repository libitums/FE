import type { Episode, LearningItem } from "@libitums/episode-core/episode";
import { describe, expect, it } from "vitest";

import { TRIAL_CONTENT } from "./trial-content";
import { TRIAL_IMAGES, trialImageUrlOf } from "./trial-images";
import type { TrialAssetPort, TrialModel } from "./trial-model.contract";
import { trialModelOf } from "./trial-model";
import { decodedU00, TEST_CONTENT_BASE, u00AudioUrl, u00TrialModel } from "./trial.test-support";

// `unit` 계층: u00 사본 → 체험판 화면 모델(순수). 모델은 실제 사본 · 실제 디코더로 만든다.

const port: TrialAssetPort = { imageUrlOf: trialImageUrlOf, contentBase: TEST_CONTENT_BASE };

/** 표의 그림 주소 — 비어 있으면 안 된다. */
function imageOf(path: string): string {
  const url = trialImageUrlOf(path);
  expect(url, `그림 표에 ${path}가 없다`).toEqual(expect.any(String));
  return url as string;
}

const u00Image = (name: string) => imageOf(`images/u00-tutorial/${name}.webp`);

describe("trialModelOf — u00", () => {
  it("TM1 · TM-R1 실제 사본이 ok이고 prologue 6 · epilogue 4 · 턴 3, 시작 그림 필드 없음", () => {
    const result = trialModelOf(decodedU00(), port);
    expect(result.ok).toBe(true);
    const model = u00TrialModel();
    expect(model.episodeId).toBe("u00-tutorial");
    expect(model.version).toBe(TRIAL_CONTENT.version);
    expect(model.prologue).toHaveLength(6);
    expect(model.epilogue).toHaveLength(4);
    expect(model.roleplay.turns).toHaveLength(3);
    expect(Object.keys(model)).not.toContain("startImageUrl");
  });

  it("TM2 prologue 컷 — 독백 둘 · 지문 둘 · 말 둘, 음성은 5 · 6에만", () => {
    const [c1, c2, c3, c4, c5, c6] = u00TrialModel().prologue;
    for (const cut of [c1, c2]) {
      expect(cut).toMatchObject({
        voice: "thought",
        speaker: { kind: "self" },
        aside: null,
        audioUrl: null,
      });
    }
    expect(c1?.index).toBe(1);
    expect(c1?.text).toEqual({
      ko: "화면에서만 보던 나라, 한국. 일주일 동안 어떤 일이 생길까?",
      roman: "hwamyeoneseoman bodeon nara, hanguk. iljuil dongan eotteon iri saenggilkka?",
      en: "Korea, a country I've only seen on screens. What will this week bring?",
    });
    for (const cut of [c3, c4]) {
      expect(cut).toMatchObject({ voice: "narration", speaker: null, aside: null, audioUrl: null });
    }
    expect(c3?.text.ko).toBe("눈을 감는다. 비 오는 골목에서 누군가 우산을 내민다.");
    expect(c5).toMatchObject({
      index: 5,
      voice: "speech",
      speaker: { kind: "named", name: "누군가" },
      text: { ko: "다음에 또…", roman: "daeume tto…", en: "Next time…" },
      aside: {
        ko: "걸음을 멈추고 웃으며",
        roman: "georeumeul meomchugo useumyeo",
        en: "Stopping and smiling.",
      },
      audioUrl: u00AudioUrl("pre-5-dream"),
    });
    expect(c6).toMatchObject({
      index: 6,
      voice: "speech",
      speaker: { kind: "named", name: "승무원" },
      text: { ko: "안녕하세요! 한국은 처음이세요?" },
      aside: { ko: "몸을 살짝 숙여 눈을 맞추며" },
      audioUrl: u00AudioUrl("d-01"),
    });
    expect(u00TrialModel().prologue.map((cut) => cut.imageUrl)).toEqual(
      ["pre-1", "pre-2", "pre-3", "pre-4", "pre-5", "pre-6"].map(u00Image),
    );
  });

  it("TM2 · TM-R1 epilogue는 post_cuts 넷 — 지문 post-1 · 승무원 post-2 · 독백 post-3 · post-4", () => {
    const [e1, e2, e3, e4] = u00TrialModel().epilogue;
    expect(e1).toMatchObject({
      index: 1,
      voice: "narration",
      speaker: null,
      audioUrl: u00AudioUrl("post-1-v3"),
    });
    expect(e1?.imageUrl).toBe(u00Image("post-1"));
    expect(e2).toMatchObject({
      index: 2,
      voice: "speech",
      speaker: { kind: "named", name: "승무원" },
      text: { ko: "안녕히 가세요.", roman: "annyeonghi gaseyo.", en: "Goodbye." },
      aside: { ko: "문 앞에서 고개를 숙이며" },
      audioUrl: u00AudioUrl("post-2"),
    });
    expect(e2?.imageUrl).toBe(u00Image("post-2"));
    expect(e3).toMatchObject({
      index: 3,
      voice: "thought",
      speaker: { kind: "self" },
      text: { ko: "꿈은 벌써 희미하다. 그래도 그 목소리는 남아 있다. 다음에 또… 누구였을까?" },
      audioUrl: null,
    });
    expect(e4).toMatchObject({
      index: 4,
      voice: "thought",
      text: { ko: "여행은 이제 시작이다. 먼저 익선동 숙소부터 가 볼까?" },
      audioUrl: null,
    });
    expect(e3?.imageUrl).toBe(u00Image("post-3"));
    expect(e4?.imageUrl).toBe(u00Image("post-4"));
    expect(e3?.imageUrl).not.toBeNull();
    expect(e4?.imageUrl).not.toBeNull();
  });

  it("TM3 vocab — 낱말 · 예문 · 음성 두 주소", () => {
    expect(u00TrialModel().vocab).toEqual({
      itemId: "S1-01",
      word: { ko: "안녕하세요", roman: "annyeonghaseyo", en: "Hello" },
      example: {
        ko: "안녕하세요! 네, 처음이에요!",
        roman: "annyeonghaseyo! ne, cheoeumieyo!",
        en: "Hello! Yes, it's my first time!",
      },
      audioUrl: u00AudioUrl("s1-01-word"),
      exampleAudioUrl: u00AudioUrl("d-02"),
    });
  });

  it("TM4 imageMatch — 제시문 = 정답 보기 en · 보기 2 · 정답 0 · 그림 · 음성", () => {
    expect(u00TrialModel().imageMatch).toEqual({
      itemId: "S3-01",
      instruction: "Which word matches the picture?",
      prompt: "Hello",
      options: [
        { ko: "안녕하세요", roman: "annyeonghaseyo", en: "Hello" },
        { ko: "감사합니다", roman: "gamsahamnida", en: "thank you" },
      ],
      answerIndex: 0,
      imageUrl: imageOf("images/items/hello.webp"),
      audioUrl: u00AudioUrl("s1-01-word"),
    });
  });

  it("TM4 replySelect — 상대 말 · 보기 3 · 정답 2 · 음성 d-03", () => {
    const item = u00TrialModel().replySelect;
    expect(item).toMatchObject({
      itemId: "S9-01",
      instruction: "How do you reply?",
      line: {
        ko: "오, 한국어 잘하시네요!",
        roman: "o, hangugeo jalhasineyo!",
        en: "Oh, your Korean is so good!",
      },
      answerIndex: 2,
      audioUrl: u00AudioUrl("d-03"),
    });
    expect(item.options.map((option) => option.ko)).toEqual([
      "안녕하세요! 한국은 처음이세요?",
      "안녕하세요! 네, 처음이에요!",
      "진짜요? 감사합니다!",
    ]);
    expect(item.options[2]).toEqual({
      ko: "진짜요? 감사합니다!",
      roman: "jinjjayo? gamsahamnida!",
      en: "Really? Thank you!",
    });
  });

  it("TM5 culture — 제목 = context · 본문 = stimulus.text · 팁 = feedback.correct · 그림", () => {
    const culture = u00TrialModel().culture;
    expect(culture.itemId).toBe("S12-01");
    expect(culture.title).toEqual({
      ko: "「한국어 잘하시네요!」",
      roman: "「hangugeo jalhasineyo!」",
      en: '"Your Korean is so good!"',
    });
    expect(culture.body.ko.startsWith("한국어로 「안녕하세요」 한마디만 해도")).toBe(true);
    expect(culture.body.en?.startsWith('Say just "annyeonghaseyo"')).toBe(true);
    expect(culture.tip).toEqual({
      ko: "이 말을 들으면 「감사합니다!」라고 하면 돼요. 그리고 「안녕하세요」는 아침에도 밤에도 써요.",
      roman: null,
      en: 'Just say "Thank you!" And "annyeonghaseyo" works any time of day.',
    });
    expect(culture.imageUrl).toBe(u00Image("cult-u00-jalhasineyo"));
  });

  it("TM6 롤플레이 턴 — 섞인 타일 · 받아 주는 답 · 번역 · 로마자 · 상대/내 음성", () => {
    const model = u00TrialModel();
    const [t1, t2, t3] = model.roleplay.turns;
    expect(t1).toEqual({
      itemId: "RP-01",
      line: {
        ko: "안녕하세요! 한국은 처음이세요?",
        roman: "annyeonghaseyo! hangugeun cheoeumiseyo?",
        en: "Hello! Is this your first time in Korea?",
      },
      tiles: [
        { ko: "네,", roman: "ne," },
        { ko: "처음이에요!", roman: "cheoeumieyo!" },
        { ko: "안녕하세요!", roman: "annyeonghaseyo!" },
      ],
      accepted: ["안녕하세요! 네, 처음이에요!"],
      replyTranslation: "Hello! Yes, it's my first time!",
      replyRoman: "annyeonghaseyo! ne, cheoeumieyo!",
      counterpartAudioUrl: u00AudioUrl("d-01"),
      replyAudioUrl: u00AudioUrl("d-02"),
    });
    expect(t2?.tiles.map((tile) => tile.ko)).toEqual(["감사합니다!", "진짜요?"]);
    expect(t2).toMatchObject({
      itemId: "RP-02",
      accepted: ["진짜요? 감사합니다!"],
      replyTranslation: "Really? Thank you!",
      replyRoman: "jinjjayo? gamsahamnida!",
      counterpartAudioUrl: u00AudioUrl("d-03"),
      replyAudioUrl: u00AudioUrl("d-04"),
    });
    expect(t3).toMatchObject({
      itemId: "RP-03",
      tiles: [{ ko: "지금부터요!", roman: "jigeumbuteoyo!" }],
      accepted: ["지금부터요!"],
      replyTranslation: "Starting now!",
      replyRoman: "jigeumbuteoyo!",
      counterpartAudioUrl: u00AudioUrl("d-05"),
      replyAudioUrl: u00AudioUrl("d-06"),
    });
    expect(model.roleplay.imageUrl).toBe(u00Image("pre-6"));
    expect(model.counterpartName).toBe("승무원");
  });

  it("TM7 contentBase가 비면 음성 주소만 전부 null이고 나머지는 같다", () => {
    const withAudio = u00TrialModel();
    const silent = u00TrialModel("");
    const audioKeys: string[] = [];
    const nullAudio = (value: unknown, path: string): unknown => {
      if (Array.isArray(value)) return value.map((child, i) => nullAudio(child, `${path}[${i}]`));
      if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
          Object.entries(value).map(([key, child]) => {
            if (/audioUrl$/i.test(key)) {
              audioKeys.push(`${path}.${key}`);
              return [key, null];
            }
            return [key, nullAudio(child, `${path}.${key}`)];
          }),
        );
      }
      return value;
    };
    expect(silent).toEqual(nullAudio(withAudio, "model"));
    // 컷 10(prologue 6 · epilogue 4) · 단어 2 · 고르기 2 · 턴 6 — 음성 자리가 모두 있다
    expect(audioKeys).toHaveLength(20);
  });
});

// ---------------------------------------------------------------- 경계

function errorsOf(episode: Episode, assets: TrialAssetPort = port) {
  const result = trialModelOf(episode, assets);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors;
}

function mapUnitItems(episode: Episode, change: (item: LearningItem) => LearningItem): Episode {
  return {
    ...episode,
    units: episode.units.map((unit) => ({ ...unit, items: unit.items.map(change) })),
  };
}

describe("trialModelOf — 경계", () => {
  it("TM8 S3이 없으면 step-missing", () => {
    const u00 = decodedU00();
    const errors = errorsOf({ ...u00, units: u00.units.filter((unit) => unit.id !== "S3") });
    expect(errors.map((error) => error.code)).toContain("step-missing");
    expect(errors.find((error) => error.code === "step-missing")?.path).toMatch(/S3/);
  });

  it("TM8 IMG_MATCH 그림이 표에 없으면 item-malformed", () => {
    const errors = errorsOf(decodedU00(), {
      ...port,
      imageUrlOf: (path) => (path.endsWith("items/hello.webp") ? null : trialImageUrlOf(path)),
    });
    expect(errors.map((error) => error.code)).toContain("item-malformed");
  });

  it("TM8 REPLY_SELECT에 stimulus.audio가 없으면 item-malformed", () => {
    const episode = mapUnitItems(decodedU00(), (item) => {
      if (item.type !== "REPLY_SELECT") return item;
      const { audio: _audio, ...stimulus } = item.stimulus;
      return { ...item, stimulus };
    });
    expect(errorsOf(episode).map((error) => error.code)).toContain("item-malformed");
  });

  it("TM8 post_cuts가 넷보다 적으면(하나 · 셋) step-missing", () => {
    const u00 = decodedU00();
    for (const count of [1, 3]) {
      const errors = errorsOf({ ...u00, epilogue: u00.epilogue.slice(0, count) });
      expect(errors.map((error) => error.code)).toContain("step-missing");
    }
  });
});

describe("그림 표", () => {
  const expectedKeys = [
    "images/items/hello.webp",
    "images/u00-tutorial/cult-u00-jalhasineyo.webp",
    "images/u00-tutorial/post-1.webp",
    "images/u00-tutorial/post-2.webp",
    "images/u00-tutorial/post-3.webp",
    "images/u00-tutorial/post-4.webp",
    "images/u00-tutorial/pre-1.webp",
    "images/u00-tutorial/pre-2.webp",
    "images/u00-tutorial/pre-3.webp",
    "images/u00-tutorial/pre-4.webp",
    "images/u00-tutorial/pre-5.webp",
    "images/u00-tutorial/pre-6.webp",
  ];

  it("TM9 표의 키 집합 = 모델이 참조하는 그림 경로 12개", () => {
    expect(Object.keys(TRIAL_IMAGES).sort()).toEqual(expectedKeys);
    const u00 = decodedU00();
    const items = [...u00.units.flatMap((unit) => unit.items), ...u00.finalTest.items];
    const stimulusImage = (item: LearningItem) =>
      "stimulus" in item && item.stimulus !== undefined ? item.stimulus.imageUrl : undefined;
    const pick = new Set(["S3-01", "S12-01", "RP-01", "RP-02", "RP-03"]);
    const referenced = [
      ...u00.prologue.map((cut) => cut.imageUrl),
      ...u00.epilogue.map((cut) => cut.imageUrl),
      ...items.filter((item) => pick.has(item.id)).map(stimulusImage),
    ]
      .filter((path): path is string => path !== undefined)
      .map((path) => path.replace(/^content\//, ""));
    expect([...new Set(referenced)].sort()).toEqual(expectedKeys);
  });

  it("TM9 trialImageUrlOf는 선두 content/를 떼고 찾고, 표에 없으면 null", () => {
    const url = imageOf("images/items/hello.webp");
    expect(trialImageUrlOf("content/images/items/hello.webp")).toBe(url);
    expect(trialImageUrlOf("images/items/thanks.webp")).toBeNull();
    expect(new Set(expectedKeys.map(imageOf)).size).toBe(12);
  });

  it("TM9 모델의 그림 주소는 모두 표에서 왔다", () => {
    const model: TrialModel = u00TrialModel();
    const used = [
      ...model.prologue.map((cut) => cut.imageUrl),
      ...model.epilogue.map((cut) => cut.imageUrl),
      model.imageMatch.imageUrl,
      model.culture.imageUrl,
      model.roleplay.imageUrl,
    ];
    const tableUrls = new Set(expectedKeys.map(imageOf));
    expect(used.every((url) => url !== null && tableUrls.has(url))).toBe(true);
  });
});
