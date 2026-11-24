// 친구 스토리 주간 기획의 모델 호출 셋(ADR-0192 D4 · D8). 운영 도구가 누를 때만 돈다 — 사용자 요청 길에는 없다.
// 1. `research` — 웹 검색으로 그 주의 소재 후보를 모은다(글 + 출처). 사람이 메모를 고친 뒤 초안 쓰기가 읽는다.
// 0. `assign` — 그 주의 메모를 보고 자리(인물 · 날짜)마다 소재를 배정한다(같은 소재가 겹치지 않게, 인물에 맞게).
// 2. `write` — 인물 하나의 빈 자리(날짜)마다 한국어 한 줄 · 읽는 법 · 영어 뜻 · 추천 답안 · 그림 주문을 쓴다(구조화 출력). 로마자는 코드가 만든다.
// 3. `meanings` — 최종 승인 때 영어 뜻을 나머지 화면 언어로 옮긴다.
// 모델: 조사 · 초안은 `COMPANION_STORY_PLAN_MODEL`(기본 Sonnet 5.5), 번역은 Haiku. 키 없는 구현(`fakeStudioLlm`)은 정해진 글을 낸다.
// 프롬프트 글은 `companion-story-studio-prompts.ts`.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import {
  type AssignCharacter,
  type OtherStory,
  assignSystem,
  assignUserText,
  meaningsSystem,
  researchSystem,
  researchUserText,
  type WriteInput,
  writeSystem,
  writeUserText,
} from "./companion-story-studio-prompts.ts";

export const defaultStoryPlanModel = "claude-sonnet-5-5";
export const defaultStoryTranslateModel = "claude-haiku-5-5";
/** 스토리 뜻의 화면 언어(묶음 정본 `docs/content/friend-stories.json`과 같다). 영어는 필수, 나머지는 번역으로 채운다. */
export const STORY_LANGS = ["en", "es", "id", "ja", "vi", "th", "my"] as const;
export const STORY_OTHER_LANGS = STORY_LANGS.filter((lang) => lang !== "en");

export type StorySource = { readonly title: string; readonly url: string };
export type Research = { readonly research: string; readonly sources: readonly StorySource[] };

export const writtenStorySchema = z.object({
  day: z.string(),
  topic: z.string(),
  note: z.string(),
  ko: z.string(),
  /** 한 줄을 읽는 대로 한글로(숫자 · 로마자를 풀어 씀) — 로마자는 이것으로 코드가 만든다(`korean-romanize.ts`). */
  reading: z.string(),
  en: z.string(),
  replies: z.array(z.string()),
  scene: z.string(),
  word: z.string().nullable(),
});
export const writtenSchema = z.object({ stories: z.array(writtenStorySchema) });
export type WrittenStory = z.infer<typeof writtenStorySchema>;

export const assignmentsSchema = z.object({
  assignments: z.array(
    z.object({ characterId: z.string(), day: z.string(), topic: z.string(), brief: z.string() }),
  ),
});
export type Assignment = z.infer<typeof assignmentsSchema>["assignments"][number];

export const meaningsSchema = z.object({
  es: z.string(),
  id: z.string(),
  ja: z.string(),
  vi: z.string(),
  th: z.string(),
  my: z.string(),
});

export type StudioLlm = {
  research(input: {
    readonly week: string;
    readonly hints: string;
    readonly signal: AbortSignal;
  }): Promise<Research>;
  /** 중앙 배정 — 그 주의 메모를 보고 자리(인물 · 날짜)마다 소재 하나. */
  assign(input: {
    readonly notes: string;
    readonly characters: readonly AssignCharacter[];
    readonly taken?: readonly OtherStory[];
    readonly signal: AbortSignal;
  }): Promise<readonly Assignment[]>;
  write(input: WriteInput & { readonly signal: AbortSignal }): Promise<readonly WrittenStory[]>;
  meanings(input: {
    readonly ko: string;
    readonly en: string;
    readonly signal: AbortSignal;
  }): Promise<Record<string, string>>;
};

/** 검색이 길어 서버 쪽 루프가 멈추면(`pause_turn`) 같은 대화를 그대로 다시 보낸다 — 이 횟수까지. */
const RESEARCH_CONTINUES = 2;
/** 검색 횟수 상한 — 모델이 한 번에 여러 검색을 묶어 돌려 여유가 있어야 한다(6이면 첫 묶음에 다 쓴다, 2026-11-24 시험). 검색 1,000번에 $10. */
const RESEARCH_SEARCHES = 24;
/** 출처 수 · 길이 — `story_plans.sources`(16,000바이트) 안에 들어가게. 너무 긴 주소는 자르지 않고 뺀다(잘린 주소는 열리지 않는다). */
const SOURCE_MAX = 16;
const SOURCE_TITLE_MAX = 120;
const SOURCE_URL_MAX = 300;

/** 응답의 검색 결과 블록에서 출처(제목 · 주소)를 모은다. 오류 블록(`content`가 목록이 아님)은 건너뛴다. */
export function sourcesFrom(content: readonly unknown[]): StorySource[] {
  const seen = new Set<string>();
  const out: StorySource[] = [];
  for (const block of content) {
    const item = block as { type?: unknown; content?: unknown };
    if (item.type !== "web_search_tool_result" || !Array.isArray(item.content)) continue;
    for (const result of item.content as { type?: unknown; title?: unknown; url?: unknown }[]) {
      if (result.type !== "web_search_result" || typeof result.url !== "string") continue;
      if (!/^https?:\/\//.test(result.url) || seen.has(result.url)) continue;
      if (result.url.length > SOURCE_URL_MAX) continue;
      seen.add(result.url);
      out.push({
        title: typeof result.title === "string" ? result.title.slice(0, SOURCE_TITLE_MAX) : "",
        url: result.url,
      });
    }
  }
  return out.slice(0, SOURCE_MAX);
}

/**
 * 응답의 마지막 글 — 마지막 도구 블록(검색 · 코드 실행 · 그 결과) 뒤의 글만 모은다. 검색 사이사이에 모델이 적은 혼잣말
 * (「Results are JSON strings; parse them.」)이 메모에 섞이지 않게(2026-11-24 시험).
 */
export function finalTextOf(content: readonly unknown[]): string {
  let text = "";
  for (const block of content) {
    const item = block as { type?: unknown; text?: unknown };
    if (item.type === "text" && typeof item.text === "string") text += item.text;
    else if (item.type !== "thinking" && item.type !== "redacted_thinking") text = "";
  }
  return text.trim();
}

export function anthropicStudioLlm(
  config: { readonly apiKey: string; readonly planModel: string; readonly translateModel: string },
  client: Anthropic = new Anthropic({ apiKey: config.apiKey, maxRetries: 0 }),
): StudioLlm {
  return {
    async research({ week, hints, signal }) {
      const messages: Anthropic.MessageParam[] = [
        { role: "user", content: researchUserText(week, hints) },
      ];
      const sources: StorySource[] = [];
      let text = "";
      let searched = 0;
      for (let turn = 0; turn <= RESEARCH_CONTINUES; turn += 1) {
        const response = await client.messages.create(
          {
            model: config.planModel,
            max_tokens: 12000,
            output_config: { effort: "medium" },
            system: researchSystem,
            tools: [
              // 이어 가는 회차에는 남은 횟수만 — 상한은 회차마다가 아니라 통틀어다.
              {
                type: "web_search_20260209",
                name: "web_search",
                max_uses: Math.max(1, RESEARCH_SEARCHES - searched),
              },
            ],
            messages,
          },
          { signal },
        );
        sources.push(...sourcesFrom(response.content));
        // 멈췄다 이어 가는 회차(`pause_turn`)의 글은 중간 메모다 — 마지막 회차의 글만 쓴다.
        text = finalTextOf(response.content);
        searched += response.usage.server_tool_use?.web_search_requests ?? 0;
        if (response.stop_reason === "refusal") throw new Error("story research: refusal");
        // 잘린 메모를 성공으로 저장하지 않는다.
        if (response.stop_reason === "max_tokens") throw new Error("story research: truncated");
        if (response.stop_reason !== "pause_turn") break;
        messages.push({ role: "assistant", content: response.content });
      }
      if (text === "") throw new Error("story research: empty");
      const unique = [...new Map(sources.map((source) => [source.url, source])).values()];
      return { research: text.slice(0, 12000), sources: unique.slice(0, SOURCE_MAX) };
    },

    async assign({ notes, characters, taken, signal }) {
      const response = await client.messages.parse(
        {
          model: config.planModel,
          max_tokens: 8000,
          output_config: { effort: "medium", format: zodOutputFormat(assignmentsSchema) },
          system: assignSystem,
          messages: [
            {
              role: "user",
              content: assignUserText({ notes, characters, ...(taken ? { taken } : {}) }),
            },
          ],
        },
        { signal },
      );
      if (response.stop_reason === "refusal") throw new Error("story assign: refusal");
      if (response.parsed_output === null) throw new Error(`story assign: ${response.stop_reason}`);
      return response.parsed_output.assignments;
    },

    async write({ signal, ...input }) {
      const response = await client.messages.parse(
        {
          model: config.planModel,
          max_tokens: 8000,
          output_config: { effort: "medium", format: zodOutputFormat(writtenSchema) },
          system: writeSystem(input),
          messages: [{ role: "user", content: writeUserText(input) }],
        },
        { signal },
      );
      if (response.stop_reason === "refusal") throw new Error("story write: refusal");
      if (response.parsed_output === null) throw new Error(`story write: ${response.stop_reason}`);
      return response.parsed_output.stories;
    },

    async meanings({ ko, en, signal }) {
      const response = await client.messages.parse(
        {
          model: config.translateModel,
          max_tokens: 1500,
          output_config: { effort: "low", format: zodOutputFormat(meaningsSchema) },
          system: meaningsSystem,
          messages: [{ role: "user", content: `Korean: ${ko}\nEnglish: ${en}` }],
        },
        { signal },
      );
      if (response.parsed_output === null)
        throw new Error(`story meanings: ${response.stop_reason}`);
      return response.parsed_output;
    },
  };
}

/** 키 없는 구현(로컬 · 테스트) — 날짜마다 정해진 한 줄. 메모에 `[fail]`이 있으면 던진다. */
export const fakeStudioLlm: StudioLlm = {
  async research({ week, hints }) {
    if (hints.includes("[fail]")) throw new Error("story research: fake failure");
    return {
      research: `- (가짜) ${week} 주의 소재: 붕어빵 · 첫눈 · 연말 콘서트`,
      sources: [{ title: "fake source", url: "https://example.com/fake" }],
    };
  },
  async assign({ notes, characters }) {
    if (notes.includes("[assign-fail]")) throw new Error("story assign: fake failure");
    return characters.flatMap((character) =>
      character.days.map((day) => ({
        characterId: character.id,
        day,
        topic: `${character.name}의 소재`,
        brief: `${day.slice(5)}에 올린다.`,
      })),
    );
  },
  async write(input) {
    if (input.notes.includes("[fail]")) throw new Error("story write: fake failure");
    return input.slots.map((slot) => ({
      day: slot.day,
      topic: slot.topic ?? "붕어빵",
      note: "일상",
      ko: `${input.character.name}의 ${slot.day.slice(5)} 스토리예요.`,
      reading: `${input.character.name}의 스토리예요.`,
      en: `${input.character.name}'s story for ${slot.day}.`,
      replies: ["우와!", "맛있겠다!"],
      scene: "A paper bag of fish-shaped pastries on a winter street at dusk.",
      word: input.catalog[0]?.ko ?? null,
    }));
  },
  async meanings({ en }) {
    if (en.includes("[fail]")) throw new Error("story meanings: fake failure");
    return Object.fromEntries(STORY_OTHER_LANGS.map((lang) => [lang, `[${lang}] ${en}`]));
  },
};

/** 환경 → 구현. 가짜 LLM이면 가짜, 키가 없으면 null(조사 · 초안 쓰기 · 최종 승인의 번역을 받지 않는다). */
export function studioLlmFrom(read: (name: string) => string | undefined): StudioLlm | null {
  if (read("COMPANION_LLM")?.trim() === "fake") return fakeStudioLlm;
  const apiKey = read("ANTHROPIC_API_KEY")?.trim() ?? "";
  if (apiKey === "") return null;
  const model = read("COMPANION_STORY_PLAN_MODEL")?.trim() ?? "";
  return anthropicStudioLlm({
    apiKey,
    planModel: model === "" ? defaultStoryPlanModel : model,
    translateModel: defaultStoryTranslateModel,
  });
}
