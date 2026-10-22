import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import * as contentUrl from "@libitums/episode-core/content-url";
import * as episode from "@libitums/episode-core/episode";
import * as judge from "@libitums/episode-core/judge";
import * as shuffle from "@libitums/episode-core/shuffle";
import { describe, expect, test } from "vitest";

import * as catalogFinalModel from "../app/catalog-final-model";
import * as catalogLessonPlan from "../app/catalog-lesson-plan";
import * as catalogShuffle from "../app/catalog-shuffle";
import * as assessment from "../screens/assessment/assessment";
import * as catalogCover from "../screens/catalog-cover/catalog-cover";
import * as roleplayStory from "../screens/roleplay-story/roleplay-story";
import * as contentAudio from "./content-audio";
import * as episodeContent from "./episode-content";
import * as episodeRemote from "./episode-remote";
import * as hangulKeyboard from "./hangul-keyboard";
import * as speakingJudge from "./speaking-judge";

// `unit` 계층: 앱이 공유 패키지 `@libitums/episode-core`를 어디서 import하는가를 고정합니다.
// 새 소비처는 옛 경로의 재수출 모듈을 거칩니다 — 패키지를 직접 import하는 앱 파일은 아래 17개뿐입니다.

const srcRoot = resolve(process.cwd(), "src");

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

const isTestFile = (file: string) => /\.(test|test-support)\.tsx?$/.test(file);
const toPosix = (file: string) => relative(srcRoot, file).split(sep).join("/");

describe("@libitums/episode-core importer", () => {
  test("EM1. 패키지를 import하는 비테스트 파일은 재수출 모듈 17개뿐이다", () => {
    const importers = walk(srcRoot)
      .filter((file) => !isTestFile(file))
      .filter((file) =>
        /["']@libitums\/episode-core(?:\/[^"']*)?["']/.test(readFileSync(file, "utf8")),
      )
      .map(toPosix)
      .sort();
    expect(importers).toEqual(
      [
        "lib/episode-content.ts",
        "lib/episode-content.model.ts",
        "lib/episode-manifest.ts",
        "lib/answer-result.ts",
        "lib/non-empty.ts",
        "lib/speaking-judge.ts",
        "lib/hangul-keyboard.ts",
        "lib/content-audio.ts",
        "lib/episode-remote.ts",
        "app/catalog-shuffle.ts",
        "app/catalog-lesson-plan.ts",
        "app/catalog-final-model.ts",
        "screens/roleplay-story/roleplay-story.ts",
        "screens/catalog-final/catalog-final.ts",
        "screens/word-choice/word-choice.ts",
        "screens/assessment/assessment.ts",
        "screens/catalog-cover/catalog-cover.ts",
      ].sort(),
    );
  });

  // `./episode`는 디코더(zod)를 함께 내보낸다 — 값을 가져오는 앱 파일은 메인 스레드 표식이 있는 디코더 · 매니페스트 입구뿐이고,
  // 화면 경로는 타입만 가져오거나 zod 없는 `./lines`를 씁니다.
  test("EM3. ./episode에서 런타임 값을 가져오는 비테스트 파일은 background-only로 시작하는 입구뿐이다", () => {
    const valueImport =
      /(?:import|export)\s+(?!type\b)(\{[^}]*\}|\*|[\w$]+)[^;]*?from\s+["']@libitums\/episode-core\/episode["']/g;
    const runtimeNames = (clause: string) =>
      clause === "*" || !clause.startsWith("{")
        ? [clause]
        : clause
            .slice(1, -1)
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part !== "" && !part.startsWith("type "));
    const importers = walk(srcRoot)
      .filter((file) => !isTestFile(file))
      .filter((file) => {
        const text = readFileSync(file, "utf8");
        return [...text.matchAll(valueImport)].some(
          (match) => runtimeNames(match[1] ?? "").length > 0,
        );
      })
      .map(toPosix)
      .sort();
    expect(importers).toEqual(["lib/episode-content.ts", "lib/episode-manifest.ts"]);
    const unguarded = importers.filter(
      (file) =>
        readFileSync(join(srcRoot, file), "utf8").split("\n")[0] !== 'import "background-only";',
    );
    expect(unguarded).toEqual([]);
  });

  test("EM3. 화면 경로의 롤플레이 줄 · 화자 값은 zod 없는 ./lines에서 온다", () => {
    const screenFiles = ["app/catalog-final-model.ts", "screens/catalog-cover/catalog-cover.ts"];
    const notFromLines = screenFiles.filter(
      (file) =>
        !/from\s+["']@libitums\/episode-core\/lines["']/.test(
          readFileSync(join(srcRoot, file), "utf8"),
        ),
    );
    expect(notFromLines).toEqual([]);
  });

  // 재수출은 같은 함수를 내보낸다 — 앱의 기존 판정 · 디코더 · 주소 테스트가 패키지 코드를 잰다는 근거입니다.
  test("EM2. 옛 경로의 재수출 함수는 패키지 함수와 같은 참조다", () => {
    const pairs: readonly (readonly [string, unknown, unknown])[] = [
      ["decodeEpisode", episodeContent.decodeEpisode, episode.decodeEpisode],
      // 재수출이 생기기 전에도 타입 검사가 서도록 이름으로 읽는다
      [
        "KNOWN_ITEM_TYPES",
        (episodeContent as Record<string, unknown>)["KNOWN_ITEM_TYPES"],
        episode.KNOWN_ITEM_TYPES,
      ],
      ["catalogRoleplayLinesOf", catalogFinalModel.catalogRoleplayLinesOf, episode.roleplayLinesOf],
      ["speakingWords", speakingJudge.speakingWords, judge.speakingWords],
      ["matchedWordCount", speakingJudge.matchedWordCount, judge.matchedWordCount],
      ["judgeSpeaking", speakingJudge.judgeSpeaking, judge.judgeSpeaking],
      ["speakingChunks", speakingJudge.speakingChunks, judge.speakingChunks],
      ["judgeRoleplayReply", roleplayStory.judgeRoleplayReply, judge.judgeRoleplayReply],
      ["isTypedAnswerCorrect", hangulKeyboard.isTypedAnswerCorrect, judge.isTypedAnswerCorrect],
      ["isTypedAnswerAccepted", hangulKeyboard.isTypedAnswerAccepted, judge.isTypedAnswerAccepted],
      ["catalogPassCriterion", catalogLessonPlan.catalogPassCriterion, judge.catalogPassCriterion],
      ["judgeAssessment", assessment.judgeAssessment, judge.judgeAssessment],
      ["contentAudioPathOf", contentAudio.contentAudioPathOf, contentUrl.contentAudioPathOf],
      ["contentAudioSourceOf", contentAudio.contentAudioSourceOf, contentUrl.contentAudioSourceOf],
      [
        "hasContentPlaceholder",
        contentAudio.hasContentPlaceholder,
        contentUrl.hasContentPlaceholder,
      ],
      ["contentBaseUrl", episodeRemote.contentBaseUrl, contentUrl.contentBaseUrl],
      [
        "resolveContentUrlSafe",
        episodeRemote.resolveContentUrlSafe,
        contentUrl.resolveContentUrlSafe,
      ],
      ["shuffledOrder", catalogShuffle.shuffledOrder, shuffle.shuffledOrder],
    ];
    const different = pairs.filter(([, app, core]) => app !== core).map(([name]) => name);
    expect(different).toEqual([]);
  });

  test("EM2. CATALOG_SELF_SPEAKER는 패키지 EPISODE_SELF_SPEAKER 값이다", () => {
    expect(catalogCover.CATALOG_SELF_SPEAKER).toBe(episode.EPISODE_SELF_SPEAKER);
    expect(catalogCover.CATALOG_SELF_SPEAKER).toBe("플레이어");
  });
});
