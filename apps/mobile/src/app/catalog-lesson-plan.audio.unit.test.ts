import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import type { CatalogEntry } from "../lib/episode-catalog";
import type { LearningItem } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { noLearnerProfile } from "./catalog-cover-wiring";
import {
  catalogLessonPlanFor,
  catalogLessonPlanOf,
  noCatalogAudioUrl,
} from "./catalog-lesson-plan";
import type { CatalogFill } from "./catalog-lesson-plan";
import { noEpisodeContent } from "./episode-content";

// `unit` 계층: 수업 계획이 포트의 음성 주소를 문항에 싣고, 소리 때문에 건너뛰던 문항이 서는지 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const imageUrlOf = (path: string): string => `https://cdn/${path}`;
const audioUrlOf = (path: string): string => `https://audio/${path}`;

function readyOf(episodeId: string): ReadyEntry {
  const entry = catalog.find((candidate) => candidate.id === episodeId);
  if (entry === undefined || entry.status !== "ready") throw new Error(`${episodeId} 준비 안 됨`);
  return entry;
}

/** 내장 u01에는 문항 음성 주소가 없어, 문항 음성이 든 판을 같은 구조로 만듭니다(계획 메모를 피해 새 객체). */
function withItemAudio(entry: ReadyEntry): ReadyEntry {
  const units = entry.episode.units.map((unit) => ({
    ...unit,
    items: unit.items.map((item): LearningItem => {
      if (!("stimulus" in item) || item.stimulus === undefined) return item;
      return {
        ...item,
        stimulus: { ...item.stimulus, audioUrl: `${entry.id}/${item.id.toLowerCase()}` },
      } as LearningItem;
    }),
  }));
  return { ...entry, episode: { ...entry.episode, units } };
}

const formsOf = (plan: ReturnType<typeof catalogLessonPlanOf>): string[] =>
  (plan?.activities ?? []).map((activity) => `${activity.form}${activity.questions.length}`);

describe("catalogLessonPlanOf — 음성 포트", () => {
  test("PL1. 다섯째 인자가 없으면 u01 S2는 지금 계획과 같다(가드)", () => {
    const entry = readyOf("u01-water");

    const plan = catalogLessonPlanOf(entry, "S2", fill, imageUrlOf);

    expect(plan).toEqual(catalogLessonPlanOf(entry, "S2", fill, imageUrlOf, noCatalogAudioUrl));
    expect(plan).toMatchObject({ questionCount: 8, shownItemCount: 8, skippedItemCount: 6 });
    expect(formsOf(plan)).toEqual([
      "sentence-order1",
      "word-choice3",
      "sentence-order2",
      "word-choice1",
      "sentence-order1",
    ]);
  });

  test("PL1. noCatalogAudioUrl은 늘 null이다", () => {
    expect(noCatalogAudioUrl("audio/x.m4a")).toBeNull();
  });

  test("PL2. 주소 포트를 주면 소리 때문에 빠지던 u01 S2 문항 여섯이 서고 건너뜀이 0이 된다", () => {
    const entry = withItemAudio(readyOf("u01-water"));

    const plan = catalogLessonPlanOf(entry, "S2", fill, imageUrlOf, audioUrlOf);

    expect(plan).toMatchObject({ questionCount: 14, shownItemCount: 14, skippedItemCount: 0 });
    expect(formsOf(plan)).toEqual([
      "listening1",
      "sentence-order1",
      "listening1",
      "word-choice3",
      "sentence-order3",
      "listening1",
      "word-choice1",
      "sentence-order1",
      "listening2",
    ]);
  });

  test("PL2. 같은 판을 소리 없는 포트로 짜면 지금과 같이 여섯 문항이 빠진다", () => {
    const entry = withItemAudio(readyOf("u01-water"));

    const plan = catalogLessonPlanOf(entry, "S2", fill, imageUrlOf);

    expect(plan).toMatchObject({ questionCount: 8, skippedItemCount: 6 });
  });

  test("PL2. u00 S2의 듣기 문항은 d-04 음성을 단 listening 활동이 된다", () => {
    const plan = catalogLessonPlanOf(
      readyOf(TUTORIAL_EPISODE_ID),
      "S2",
      fill,
      imageUrlOf,
      audioUrlOf,
    );

    expect(plan).toMatchObject({ questionCount: 1, shownItemCount: 1, skippedItemCount: 0 });
    const activity = plan?.activities[0];
    expect(activity?.form).toBe("listening");
    const question = activity?.questions[0] as unknown as { audio?: { source: string } };
    expect(question.audio?.source).toBe("https://audio/audio/u00-tutorial/d-04.m4a");
  });

  test("PL3. LISTEN_BUILD는 앞뒤 TURN_ORDER와 한 sentence-order 활동으로 묶인다", () => {
    const entry = withItemAudio(readyOf("u01-water"));

    const plan = catalogLessonPlanOf(entry, "S2", fill, imageUrlOf, audioUrlOf);

    const grouped = plan?.activities.find(
      (activity) => activity.form === "sentence-order" && activity.questions.length === 3,
    );
    expect(grouped).toBeDefined();
    const middle = grouped?.questions[1] as unknown as {
      audio?: { kind: string; ref?: { itemType: string } };
    };
    expect(middle.audio).toMatchObject({ kind: "listen", ref: { itemType: "LISTEN_BUILD" } });
  });
});

describe("catalogLessonPlanFor — 콘텐츠 포트", () => {
  test("CL2. 콘텐츠의 audioUrlOf가 문항 audio.source에 나온다", () => {
    const entry = { ...readyOf(TUTORIAL_EPISODE_ID) };
    const content = { ...noEpisodeContent, catalog: [entry], imageUrlOf, audioUrlOf };

    const plan = catalogLessonPlanFor(content, TUTORIAL_EPISODE_ID, "S2", noLearnerProfile);

    const question = plan?.activities[0]?.questions[0] as unknown as { audio?: { source: string } };
    expect(question.audio?.source).toBe("https://audio/audio/u00-tutorial/d-04.m4a");
  });

  test("CL2. 이미지 포트는 음성 주소에 쓰이지 않는다", () => {
    const entry = { ...readyOf(TUTORIAL_EPISODE_ID) };
    const content = {
      ...noEpisodeContent,
      catalog: [entry],
      imageUrlOf,
      audioUrlOf: () => null,
    };

    const plan = catalogLessonPlanFor(content, TUTORIAL_EPISODE_ID, "S2", noLearnerProfile);

    expect(plan).toMatchObject({ questionCount: 0, skippedItemCount: 1 });
  });

  test("V4-4. 같은 콘텐츠 참조라도 파일 유무가 다르면 다른 계획이다 — 메모가 낡은 판정을 쓰지 않는다", () => {
    const entry = { ...readyOf(TUTORIAL_EPISODE_ID) };
    let downloaded = false;
    const content = {
      ...noEpisodeContent,
      catalog: [entry],
      imageUrlOf,
      itemAudioEnabled: true,
      audioUrlOf: (path: string) => (downloaded ? `file:///f/${path}` : null),
    };

    const before = catalogLessonPlanFor(content, TUTORIAL_EPISODE_ID, "S2", noLearnerProfile);
    downloaded = true;
    const after = catalogLessonPlanFor(content, TUTORIAL_EPISODE_ID, "S2", noLearnerProfile);

    expect(before).toMatchObject({ questionCount: 0, skippedItemCount: 1 });
    expect(after).toMatchObject({ questionCount: 1, skippedItemCount: 0 });
  });
});
