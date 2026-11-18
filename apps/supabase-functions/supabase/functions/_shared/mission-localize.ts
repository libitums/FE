// 미션의 진입 대사 · 목표 글을 학습자 언어로(PRD §9 M6, 2026-11-19 결정). `mission-start`가 부릅니다.
//
// 출처는 둘, 순서대로: (가) 미션 파일의 그 언어 칸(`opening[l1]` · `goals[].label[l1]` — 사람이 검수한 번역) → (나) 번역 캐시
// (`companion.mission_translations`, 미션 × 판 × 언어). 둘 다 없는 것만 1단계 번역 노드(`startTranslation` — 같은 프롬프트 · 모델 ·
// 제한 시간 · 한 번 다시 시도)로 한 번에 만들고, 만든 것을 캐시에 남기게 돌려줍니다(검수 전 초안).
// - `l1`이 영어(또는 모름)면 파일의 영어 글 그대로, 한국어거나 번역을 껐으면(`COMPANION_TRANSLATION=off`) 번역 없이.
// - 번역이 실패해도 시작은 막지 않습니다 — 영어 글로 내고, 캐시에 남기지 않아 다음 시작 때 다시 시도합니다.

import type { ChatSendEnv, CompanionLlm, Segment } from "./chat-send.contract.ts";
import { startTranslation } from "./chat-send-translate.ts";
import type { MissionDefinition } from "./mission-definition.ts";

/** 캐시 한 행의 `translation`. */
export type MissionTranslation = {
  readonly opening: string | null;
  readonly goals: Readonly<Record<string, string>>;
};

type Label = MissionDefinition["goals"][number]["label"];

export type LocalizedMission = {
  /** 응답의 `l1`. */
  readonly language: string | null;
  /** 진입 대사의 학습자 언어 글(`opening.translation`). 한국어 · 번역 끔이면 null. */
  readonly openingTranslation: string | null;
  /** 목표 id → 학습자 언어 칸을 채운 글. */
  readonly labels: Readonly<Record<string, Label>>;
  /** 이번에 번역 노드로 만들어 캐시에 남길 것(파일 · 캐시에서 온 것과 합친 전체). 만들지 않았으면 null. */
  readonly created: MissionTranslation | null;
  readonly source: "none" | "english" | "file" | "cache" | "generated" | "fallback";
};

const isKorean = (language: string) => language.toLowerCase().split("-")[0] === "ko";
const isEnglish = (language: string) => language.toLowerCase().split("-")[0] === "en";
const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

export async function localizeMission(input: {
  readonly llm: CompanionLlm;
  readonly env: ChatSendEnv;
  readonly mission: MissionDefinition;
  readonly l1: string | null;
  readonly cached: MissionTranslation | null;
  readonly timeoutMs?: number;
  readonly signal: AbortSignal;
}): Promise<LocalizedMission> {
  const { mission, l1 } = input;
  const plain = Object.fromEntries(mission.goals.map((goal) => [goal.id, goal.label]));
  if (l1 === null || isEnglish(l1))
    return {
      language: l1,
      openingTranslation: mission.opening.en,
      labels: plain,
      created: null,
      source: "english",
    };
  if (isKorean(l1) || input.env.translation === "off")
    return { language: l1, openingTranslation: null, labels: plain, created: null, source: "none" };

  // (가) 파일 → (나) 캐시. 둘 다 없는 칸만 남긴다.
  const fromFile = {
    opening: asText((mission.opening as Record<string, unknown>)[l1]),
    goals: Object.fromEntries(
      mission.goals.flatMap((goal) => {
        const text = asText((goal.label as Record<string, unknown>)[l1]);
        return text === null ? [] : [[goal.id, text]];
      }),
    ) as Record<string, string>,
  };
  const opening = fromFile.opening ?? asText(input.cached?.opening);
  const goals: Record<string, string> = {};
  for (const goal of mission.goals) {
    const text = fromFile.goals[goal.id] ?? asText(input.cached?.goals[goal.id]);
    if (text !== null) goals[goal.id] = text;
  }
  const missingGoals = mission.goals.filter((goal) => goals[goal.id] === undefined);
  const fileOnly =
    fromFile.opening !== null &&
    missingGoals.length === 0 &&
    mission.goals.every((goal) => fromFile.goals[goal.id] !== undefined);
  const build = (
    openingText: string | null,
    goalTexts: Record<string, string>,
    created: MissionTranslation | null,
    source: LocalizedMission["source"],
  ): LocalizedMission => ({
    language: l1,
    openingTranslation: openingText,
    labels: Object.fromEntries(
      mission.goals.map((goal) => [
        goal.id,
        goalTexts[goal.id] === undefined
          ? goal.label
          : ({ ...goal.label, [l1]: goalTexts[goal.id] } as Label),
      ]),
    ),
    created,
    source,
  });
  if (opening !== null && missingGoals.length === 0)
    return build(opening, goals, null, fileOnly ? "file" : "cache");

  // (다) 번역 노드 — 빠진 것만 한 번에(진입 대사는 대사, 목표 글은 짧은 서술로).
  const segments: Segment[] = [
    ...(opening === null ? [{ kind: "speech" as const, text: mission.opening.ko }] : []),
    ...missingGoals.map((goal) => ({
      kind: "narration" as const,
      text: goal.label.ko ?? goal.label.en,
    })),
  ];
  const outcome = await startTranslation(
    input.llm,
    input.env,
    {
      segments,
      l1,
      timeoutMs: input.timeoutMs,
      persona: { name: mission.counterpart.label },
    },
    input.signal,
  );
  if (outcome.status !== "ok" || outcome.lines.some((line) => line.trim() === ""))
    return build(opening ?? mission.opening.en, goals, null, "fallback");
  const lines = outcome.lines.map((line) => line.trim());
  const generatedOpening = opening === null ? (lines.shift() ?? null) : opening;
  missingGoals.forEach((goal, index) => {
    goals[goal.id] = lines[index] as string;
  });
  // 캐시에는 파일에서 온 칸을 빼고 남긴다 — 파일이 바뀌면(검수) 파일이 이기게.
  const cacheGoals = Object.fromEntries(
    Object.entries(goals).filter(([id]) => fromFile.goals[id] === undefined),
  );
  return build(
    generatedOpening,
    goals,
    { opening: fromFile.opening === null ? generatedOpening : null, goals: cacheGoals },
    "generated",
  );
}
