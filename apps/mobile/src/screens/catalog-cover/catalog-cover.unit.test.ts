import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import type { CatalogEntry } from "../../lib/episode-catalog";
import type { EpisodeCut, Text } from "../../lib/episode-content.model";
import { fillPlaceholders } from "../../lib/placeholder-fill";
import type { LearnerProfile } from "../../lib/placeholder-fill";
import { uiCopyEn } from "../../lib/ui-copy-en";
import type {
  CatalogCutPort,
  CatalogCutScript,
  CatalogCutText,
  CatalogCutView,
} from "./catalog-cover.contract";
import {
  CATALOG_SELF_SPEAKER,
  catalogCutAccessibilityLabel,
  catalogCutAudioCueOf,
  catalogCutHasToggle,
  catalogCutSpeakerName,
  catalogCutTranslation,
  catalogCutViewsOf,
  catalogCutsOf,
  nextCatalogCutIndex,
  nextCatalogCutScript,
} from "./catalog-cover";

// `unit` 계층: 컷 → 표시 모델, 번역 선택, 토글, 다음 자리, 낭독의 입출력만 봅니다.

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const u01 = realCatalog[0] as Extract<CatalogEntry, { status: "ready" }>;

function portFor(profile: LearnerProfile): CatalogCutPort {
  return {
    imageUrlOf: (path) => `https://cdn/${path}`,
    audioTimingOf: () => null,
    fill: (text, script) => fillPlaceholders(text, profile, script),
  };
}

function speech(
  index: number,
  speaker: string,
  line: Text,
  aside: Text,
  imageUrl?: string,
): EpisodeCut {
  return {
    kind: "speech",
    index,
    speaker,
    line,
    aside,
    imageBrief: "brief",
    ...(imageUrl === undefined ? {} : { imageUrl }),
  };
}

function narration(index: number, text: Text, imageUrl?: string): EpisodeCut {
  return {
    kind: "narration",
    index,
    narration: text,
    imageBrief: "brief",
    ...(imageUrl === undefined ? {} : { imageUrl }),
  };
}

const clerkText: CatalogCutText = { ko: "어서 오세요.", en: "Welcome.", roman: "eoseo oseyo." };
const clerkView: CatalogCutView = {
  kind: "line",
  voice: "speech",
  index: 3,
  speaker: { kind: "named", name: "점원" },
  text: clerkText,
  aside: null,
  imageUrl: null,
};

describe("catalogCutViewsOf — 나라 객체 프로필", () => {
  const germany = { ko: "독일", roman: "dogil", en: "Germany" } as const;
  const fromGermany: Text = {
    ko: "저는 {나라}에서 왔어요.",
    roman: "jeoneun {나라}eseo wasseoyo.",
    en: "I'm from {나라}.",
  };

  test("EN-3. 컷의 en에는 영어 나라 이름, roman에는 연음이 적용된 로마자, ko에는 한글이 선다", () => {
    const [view] = catalogCutViewsOf([narration(1, fromGermany)], portFor({ country: germany }));

    expect(view).toMatchObject({
      kind: "narration",
      text: {
        ko: "저는 독일에서 왔어요.",
        en: "I'm from Germany.",
        roman: "jeoneun dogireseo wasseoyo.",
      },
    });
  });

  test("EN-3. 방백(aside)도 같은 규칙이다", () => {
    const [view] = catalogCutViewsOf(
      [speech(1, "점원", { ko: "네." }, fromGermany)],
      portFor({ country: germany }),
    );

    expect(view).toMatchObject({
      kind: "line",
      aside: { en: "I'm from Germany.", roman: "jeoneun dogireseo wasseoyo." },
    });
  });

  test("EN-3. 프로필이 비면 영어 줄은 지금과 같은 기본 문구다", () => {
    const [view] = catalogCutViewsOf([narration(1, fromGermany)], portFor({}));

    expect(view).toMatchObject({
      text: {
        ko: "저는 나라에서 왔어요.",
        en: "I'm from nara.",
        roman: "jeoneun naraeseo wasseoyo.",
      },
    });
  });
});

describe("catalogCutViewsOf", () => {
  test("CC1. u01 프롤로그는 여섯 컷의 표시 모델이 된다", () => {
    const views = catalogCutViewsOf(u01.episode.prologue, portFor({}));

    expect(views).toHaveLength(6);
    expect(views.map((view) => view.kind)).toEqual([
      "line",
      "narration",
      "line",
      "line",
      "narration",
      "line",
    ]);
    const first = views[0];
    if (first?.kind !== "line") throw new Error("line expected");
    expect(first.speaker).toEqual({ kind: "self" });
    expect(first.aside).toBeNull();
    // 첫 컷은 독백이라 괄호 안이다(2026-10-12 사용자 결정).
    expect(first.text.ko).toBe("(비행기를 오래 탔더니 목이 마르다. 편의점이 어디 있지?)");
    expect(first.text.en).toBe("(Thirsty after that long flight. Where's a convenience store?)");
    expect(first.text.roman).toBe(
      "(bihaenggireul orae tatdeoni mogi mareuda. pyeonuijeomi eodi itji?)",
    );
    expect(first.voice).toBe("thought");
    // 콘텐츠 경로가 버킷 이름을 붙인 꼴이다 — 이 포트는 받은 경로를 그대로 붙이고, 앱의 해석기가 앞 조각을 뗀다.
    expect(first.imageUrl).toBe("https://cdn/content/images/u01-water/pre-1.jpg");
    const clerk = views[2];
    if (clerk?.kind !== "line") throw new Error("line expected");
    expect(clerk.speaker).toEqual({ kind: "named", name: "점원" });
    expect(clerk.aside?.ko).toBe("딸랑거리는 문소리에 고개를 들며");
  });

  const placeholderCut = speech(
    1,
    "점원",
    {
      ko: "저는 {이름}이에요.",
      roman: "jeoneun {이름}ieyo.",
      en: "Hello, I'm {이름}.",
    },
    { ko: "미소 지으며" },
  );

  test("CC2. 프로필 이름으로 한국어 · 로마자 · 영어를 치환한다", () => {
    const [view] = catalogCutViewsOf([placeholderCut], portFor({ name: "민지" }));

    expect(view?.text.ko).toBe("저는 민지예요.");
    expect(view?.text.roman).toBe("jeoneun 민지yeyo.");
    expect(view?.text.en).toBe("Hello, I'm 민지.");
  });

  test("CC3. 프로필이 비면 한국어는 기본값 이름, 영어와 로마자는 ireum으로 채운다", () => {
    const [view] = catalogCutViewsOf([placeholderCut], portFor({}));

    expect(view?.text.ko).toBe("저는 이름이에요.");
    expect(view?.text.en).toBe("Hello, I'm ireum.");
    expect(view?.text.roman).toBe("jeoneun ireumieyo.");
  });

  test("CC4. 빈 번역은 null, 빈 대사 컷은 빠지고, 빈 화자는 내레이션이 된다", () => {
    const views = catalogCutViewsOf(
      [
        speech(1, "점원", { ko: "안녕하세요.", en: "", roman: "  " }, { ko: "" }),
        speech(2, "점원", { ko: " ", en: "blank", roman: "blank" }, { ko: "x" }),
        speech(3, "", { ko: "화자가 없다.", en: "No speaker." }, { ko: "지문" }),
      ],
      portFor({}),
    );

    expect(views).toHaveLength(2);
    const first = views[0];
    if (first?.kind !== "line") throw new Error("line expected");
    expect(first.text.en).toBeNull();
    expect(first.text.roman).toBeNull();
    expect(first.aside).toBeNull();
    expect(views[1]?.kind).toBe("narration");
    expect(views[1]?.text.ko).toBe("화자가 없다.");
  });

  test("CC5. 이미지가 없거나 포트가 null을 주면 imageUrl은 null이다", () => {
    const nullPort: CatalogCutPort = { ...portFor({}), imageUrlOf: () => null };
    const cuts = [narration(1, { ko: "하나" }), narration(2, { ko: "둘" }, "images/x.jpg")];

    const withoutImage = catalogCutViewsOf(cuts, portFor({}));
    const rejected = catalogCutViewsOf(cuts, nullPort);

    expect(withoutImage).toHaveLength(2);
    expect(withoutImage[0]?.imageUrl).toBeNull();
    expect(withoutImage[1]?.imageUrl).toBe("https://cdn/images/x.jpg");
    expect(rejected).toHaveLength(2);
    expect(rejected[0]?.imageUrl).toBeNull();
    expect(rejected[1]?.imageUrl).toBeNull();
  });
});

describe("번역 · 토글 · 다음", () => {
  const both: CatalogCutText = { ko: "가", en: "A", roman: "ga" };
  const enOnly: CatalogCutText = { ko: "가", en: "A", roman: null };
  const romanOnly: CatalogCutText = { ko: "가", en: null, roman: "ga" };
  const neither: CatalogCutText = { ko: "가", en: null, roman: null };

  test.each([
    ["둘 다 · en", both, "en", "A"],
    ["둘 다 · roman", both, "roman", "ga"],
    ["en만 · roman 스크립트", enOnly, "roman", "A"],
    ["roman만 · en 스크립트", romanOnly, "en", "ga"],
    ["둘 다 없음 · en", neither, "en", null],
    ["둘 다 없음 · roman", neither, "roman", null],
  ] as const satisfies readonly (readonly [
    string,
    CatalogCutText,
    CatalogCutScript,
    string | null,
  ])[])("CC6. %s", (_label, text, script, expected) => {
    expect(catalogCutTranslation(text, script)).toBe(expected);
  });

  test("CC7. 토글은 번역이 둘 다 있을 때만 있고 스크립트는 en과 roman을 오간다", () => {
    expect(catalogCutHasToggle(both)).toBe(true);
    expect(catalogCutHasToggle(enOnly)).toBe(false);
    expect(catalogCutHasToggle(romanOnly)).toBe(false);
    expect(catalogCutHasToggle(neither)).toBe(false);
    expect(nextCatalogCutScript("en")).toBe("roman");
    expect(nextCatalogCutScript("roman")).toBe("en");
  });

  test("CC7. 다음 컷 자리는 끝에서 null이다", () => {
    expect(nextCatalogCutIndex(0, 6)).toBe(1);
    expect(nextCatalogCutIndex(5, 6)).toBeNull();
    expect(nextCatalogCutIndex(0, 1)).toBeNull();
  });
});

describe("낭독", () => {
  test("CC8. 번역이 둘 다 있으면 보이는 스크립트에 맞춰 토글 꼬리를 붙인다", () => {
    expect(catalogCutAccessibilityLabel(clerkView, "en", uiCopyEn)).toBe(
      "점원: 어서 오세요. Welcome., Show romanization",
    );
    expect(catalogCutAccessibilityLabel(clerkView, "roman", uiCopyEn)).toBe(
      "점원: 어서 오세요. eoseo oseyo., Show English",
    );
  });

  test("CC8. 자기 화자는 Me로, 내레이션은 화자 없이 시작한다", () => {
    const self: CatalogCutView = {
      kind: "line",
      voice: "speech",
      index: 1,
      speaker: { kind: "self" },
      text: { ko: "비행기를 오래 탔더니", en: "Long flight.", roman: "bihaenggi" },
      aside: null,
      imageUrl: null,
    };
    const narrationView: CatalogCutView = {
      kind: "narration",
      index: 2,
      text: { ko: "골목 어귀", en: "The alley.", roman: "golmok" },
      imageUrl: null,
    };

    expect(
      catalogCutAccessibilityLabel(self, "en", uiCopyEn).startsWith("Me: 비행기를 오래 탔더니"),
    ).toBe(true);
    expect(catalogCutAccessibilityLabel(narrationView, "en", uiCopyEn)).toBe(
      "골목 어귀 The alley., Show romanization",
    );
  });

  test("CC8. 토글이 없는 컷은 꼬리가 없다", () => {
    const enOnlyView: CatalogCutView = {
      ...clerkView,
      text: { ko: "어서 오세요.", en: "Welcome.", roman: null },
    };
    const noTranslation: CatalogCutView = {
      ...clerkView,
      text: { ko: "어서 오세요.", en: null, roman: null },
    };

    expect(catalogCutAccessibilityLabel(enOnlyView, "en", uiCopyEn)).toBe(
      "점원: 어서 오세요. Welcome.",
    );
    expect(catalogCutAccessibilityLabel(noTranslation, "roman", uiCopyEn)).toBe(
      "점원: 어서 오세요.",
    );
  });

  test("CC8. 화자 이름은 self이면 Me, named이면 그 이름이다", () => {
    expect(catalogCutSpeakerName({ kind: "self" }, uiCopyEn)).toBe("Me");
    expect(catalogCutSpeakerName({ kind: "named", name: "점원" }, uiCopyEn)).toBe("점원");
  });
});

describe("catalogCutsOf", () => {
  test("CC9. 빈 목록은 null, 하나면 길이 1 튜플이다", () => {
    expect(catalogCutsOf([])).toBeNull();
    expect(catalogCutsOf([clerkView])).toEqual([clerkView]);
  });
});

// 표시 모델 · 결선 · 맵 파일은 3a 모듈을 값으로 가져오지 않습니다 — 화면 경로는 메인 스레드에서도 도는데
// 그 모듈들은 백그라운드 전용입니다(빌드가 막지만 여기서 먼저 잡습니다).
describe("스레드 경계 소스 검사", () => {
  const srcRoot = resolve(process.cwd(), "src");

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  }

  function isSource(path: string): boolean {
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path);
  }

  const targets = [
    ...walk(join(srcRoot, "screens/catalog-cover")),
    ...walk(join(srcRoot, "screens/journey-map")).filter((path) => {
      const name = relative(join(srcRoot, "screens/journey-map"), path);
      return (
        /^catalog-map[^/]*\.tsx?$/.test(name) ||
        /^Catalog[^/]*\.tsx$/.test(name) ||
        name === "JourneyMapHeaderSlot.tsx"
      );
    }),
    join(srcRoot, "app/catalog-cover-wiring.ts"),
    join(srcRoot, "app/render-catalog-cover.tsx"),
    join(srcRoot, "app/episode-content.ts"),
  ].filter(isSource);

  function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  }

  const guardedLib =
    /\/lib\/(episode-(catalog|cache|bundled|refresh|remote|manifest|content)|placeholder-fill)$/;

  test("CC10. 검사 대상 파일이 비지 않는다", () => {
    const names = targets.map((path) => relative(srcRoot, path));

    expect(names).toEqual(
      expect.arrayContaining([
        "screens/catalog-cover/catalog-cover.ts",
        "screens/catalog-cover/CatalogCoverScreen.tsx",
        "screens/journey-map/catalog-map.ts",
        "screens/journey-map/CatalogMapSections.tsx",
        "screens/journey-map/JourneyMapHeaderSlot.tsx",
        "app/catalog-cover-wiring.ts",
        "app/render-catalog-cover.tsx",
        "app/episode-content.ts",
      ]),
    );
  });

  test("CC10. 3a 모듈과 치환기는 import type으로만 가져오고 로케일 비교 · Intl을 쓰지 않는다", () => {
    const violations: string[] = [];
    for (const path of targets) {
      const source = stripComments(readFileSync(path, "utf8"));
      const imports = source.matchAll(/import\s+(type\s+)?([^;]*?)\s+from\s+"([^"]+)"/g);
      for (const match of imports) {
        const isType = match[1] !== undefined;
        const from = match[3] ?? "";
        if (guardedLib.test(from) && !isType) {
          violations.push(`${relative(srcRoot, path)}: ${from}`);
        }
      }
      if (/localeCompare|\bIntl\b/.test(source)) {
        violations.push(`${relative(srcRoot, path)}: localeCompare/Intl`);
      }
    }

    expect(violations).toEqual([]);
  });
});

describe("상수", () => {
  test("CC11. 콘텐츠의 자기 화자 값", () => {
    expect(CATALOG_SELF_SPEAKER).toBe("플레이어");
  });
});

describe("독백", () => {
  const monologue: EpisodeCut = {
    kind: "monologue",
    index: 1,
    speaker: "플레이어",
    line: { ko: "목이 마르다.", roman: "mogi mareuda.", en: "I'm thirsty." },
    imageBrief: "brief",
  };

  test("CC12. 독백 컷은 thought 목소리이고 대사 · 영어 · 로마자가 괄호 안에 든다", () => {
    const [view] = catalogCutViewsOf([monologue], portFor({}));
    expect(view).toMatchObject({
      kind: "line",
      voice: "thought",
      speaker: { kind: "self" },
      text: { ko: "(목이 마르다.)", en: "(I'm thirsty.)", roman: "(mogi mareuda.)" },
    });
  });

  test("CC13. 일반 대사는 speech 목소리이고 괄호가 없다", () => {
    const [view] = catalogCutViewsOf(
      [
        speech(
          1,
          "점원",
          { ko: "어서 오세요.", roman: "eoseo oseyo.", en: "Welcome." },
          { ko: "고개를 들며", roman: "gogaereul deulmyeo", en: "Looking up" },
        ),
      ],
      portFor({}),
    );
    expect(view).toMatchObject({ kind: "line", voice: "speech", text: { ko: "어서 오세요." } });
  });

  test("CC14. 독백의 낭독은 괄호 대신 화자 뒤에 thinking을 붙인다", () => {
    const [view] = catalogCutViewsOf([monologue], portFor({}));
    if (view === undefined) throw new Error("view");
    const label = catalogCutAccessibilityLabel(view, "en", uiCopyEn);
    expect(label.startsWith("Me, thinking: 목이 마르다. I'm thirsty.")).toBe(true);
    expect(label).not.toContain("(");
  });
});

describe("컷 음성", () => {
  const AUDIO_ID = "u01-water/pre-3";
  const AUDIO_SOURCE = "https://cdn/audio/u01-water/pre-3.m4a";
  const nullPort: CatalogCutPort = { ...portFor({}), imageUrlOf: () => null };
  const line = { ko: "어서 오세요.", roman: "eoseo oseyo.", en: "Welcome." };
  const speechWith = (audioUrl: string | undefined, text: Text = line): EpisodeCut => ({
    ...speech(1, "점원", text, { ko: "고개를 들며" }),
    ...(audioUrl === undefined ? {} : { audioUrl }),
  });
  const monologueWith = (audioUrl: string): EpisodeCut => ({
    kind: "monologue",
    index: 1,
    speaker: "플레이어",
    line,
    imageBrief: "brief",
    audioUrl,
  });
  const narrationWith = (audioUrl: string): EpisodeCut => ({
    ...narration(1, line),
    audioUrl,
  });
  const lineView = (audioSource?: string): CatalogCutView => ({
    ...clerkView,
    ...(audioSource === undefined ? {} : { audioSource }),
  });

  test.each([
    ["speech", speechWith(AUDIO_ID)],
    ["monologue", monologueWith(AUDIO_ID)],
    ["narration", narrationWith(AUDIO_ID)],
    ["화자 없는 speech", { ...speech(1, "", line, { ko: "지문" }), audioUrl: AUDIO_ID }],
  ])("CCA1. %s 컷의 audioUrl이 뷰의 전체 주소가 된다", (_name, cut) => {
    const [view] = catalogCutViewsOf([cut], portFor({}));
    expect(view).toHaveProperty("audioSource", AUDIO_SOURCE);
  });

  test.each([
    ["audioUrl 없음", speechWith(undefined), portFor({})],
    ["규약 밖 id", speechWith("../pre-3"), portFor({})],
    ["원문 ko에 자리표시자", speechWith(AUDIO_ID, { ko: "{이름}(으)로 예약했어요." }), portFor({})],
    ["해석기가 null", speechWith(AUDIO_ID), nullPort],
  ])("CCA2. %s이면 audioSource 키가 없다", (_name, cut, port) => {
    const [view] = catalogCutViewsOf([cut], port);
    expect(view).toBeDefined();
    expect(view !== undefined && "audioSource" in view).toBe(false);
  });

  test("CCA3. 자리표시자 판정은 치환 전 원문 기준이다", () => {
    const cut = speechWith(AUDIO_ID, { ko: "{이름}(으)로 예약했어요." });
    const [view] = catalogCutViewsOf([cut], portFor({ name: "Mina" }));
    expect(view?.text.ko).not.toMatch(/[{}]/);
    expect(view !== undefined && "audioSource" in view).toBe(false);
  });

  test("CCA4. 실데이터 u01 표지 컷: 3번 · 6번만 소리 주소가 있다", () => {
    const views = catalogCutViewsOf(u01.episode.prologue, portFor({}));
    expect(views).toHaveLength(6);
    const sources = Object.fromEntries(
      views.flatMap((view) =>
        view.audioSource === undefined ? [] : [[view.index, view.audioSource]],
      ),
    );
    expect(sources).toEqual({
      3: "https://cdn/audio/u01-water/pre-3.m4a",
      6: "https://cdn/audio/u01-water/d-01.m4a",
    });
  });

  test("CCA5. catalogCutAudioCueOf: 소리가 있으면 index를 key로 한 단서, 없으면 null", () => {
    expect(catalogCutAudioCueOf(lineView(AUDIO_SOURCE), 2)).toEqual({
      key: "2",
      source: AUDIO_SOURCE,
    });
    expect(catalogCutAudioCueOf(lineView(), 2)).toBeNull();
    const first = catalogCutAudioCueOf(lineView(AUDIO_SOURCE), 0);
    const second = catalogCutAudioCueOf(lineView(AUDIO_SOURCE), 1);
    expect(first?.key).not.toBe(second?.key);
  });
});
