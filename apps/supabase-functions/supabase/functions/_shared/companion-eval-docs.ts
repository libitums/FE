// `GET /functions/v1/companion-eval?docs=1` — ops-dashboard 「문서」 화면. 코드가 실제로 보내는 프롬프트 글을 실제 호출과 같은 함수로
// 그려 돌려준다(사본이 없으니 문서와 운영이 어긋나지 않는다). 캐릭터 · 설정은 운영 조회(마이그레이션 20261114)에서 읽고, 그 함수가
// 아직 없으면(적용 전) `characters` · `settings`를 null로 두고 `inspectAvailable: false`로 알린다 — 프롬프트는 그대로 나간다.
//
// 대표 입력: 학습자 언어 en · 성인 · 기억 · 학습 표현 · 요약 없음 · 피드백 방식 separate. 호출마다 바뀌는 자리는 `{{이름}}`으로 표시한다.

import type { AgeBand, ChatSendEnv, FeedbackRequest, PersonaCard } from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";
import type { Outbound } from "./delete-account.contract.ts";
import {
  feedbackSystem,
  memorySystem,
  refusalDirective,
  refusalUserText,
  suggestionSystem,
  summarySystem,
  translationSystem,
} from "./companion-llm-prompts.ts";
import {
  companionSystemPrompt,
  feedbackModeRule,
  proactiveDirective,
  stateLine,
} from "./companion-prompt.ts";
import { callRpc } from "./companion-rpc.ts";
import { moderationInstruction } from "./companion-safety.ts";

const speechLevels: readonly SpeechLevel[] = ["polite", "casual", "slang"];
const ageBands: readonly AgeBand[] = ["adult", "minor", "unknown"];

/** `companion_inspect_characters()`의 원소. */
type InspectedCharacter = {
  readonly id: string;
  readonly bibleVersion: string;
  readonly active: boolean;
  readonly sortOrder: number;
  readonly maxSpeechLevel: SpeechLevel;
  readonly persona: PersonaCard & Record<string, unknown>;
};

const placeholder = (name: string) => `{{${name}}}`;

/** 말투 상한까지 단계마다 시스템 프롬프트(앞 · 뒤 부분을 빈 줄로 이어서). 실제 호출은 둘을 따로 싣고 앞만 캐시한다. */
export function systemPromptsFor(
  persona: PersonaCard,
  maxSpeechLevel: SpeechLevel,
): Partial<Record<SpeechLevel, string>> {
  const max = speechLevels.indexOf(maxSpeechLevel);
  const levels = speechLevels.slice(0, max === -1 ? speechLevels.length : max + 1);
  return Object.fromEntries(
    levels.map((speechLevel) => {
      const prompt = companionSystemPrompt({
        persona,
        speechLevel,
        ageBand: "adult",
        l1: "en",
        expressions: [],
        summary: null,
        feedbackMode: "separate",
        memories: [],
        directive: null,
      });
      return [speechLevel, `${prompt.stable}\n\n${prompt.dynamic}`];
    }),
  );
}

const byAgeBand = (render: (ageBand: AgeBand) => string) =>
  Object.fromEntries(ageBands.map((ageBand) => [ageBand, render(ageBand)])) as Record<
    AgeBand,
    string
  >;

/** 단계별 시스템 프롬프트. 피드백은 존댓말 관계 · 부드러운 반말 규칙(better)으로 그린다(말투 규칙 한 줄만 단계마다 다르다). */
export function promptDocs() {
  const feedbackSample: FeedbackRequest = {
    text: placeholder("learner message"),
    l1: placeholder("l1"),
    previous: null,
    history: [],
    speechLevel: "polite",
    character: null,
    signal: new AbortController().signal,
  };
  return {
    feedback: feedbackSystem(feedbackSample),
    moderation: {
      input: byAgeBand((ageBand) => moderationInstruction("input", ageBand)),
      output_sync: byAgeBand((ageBand) => moderationInstruction("output_sync", ageBand)),
    },
    translation: translationSystem(placeholder("l1"), placeholder("segment count")),
    memory: { adult: memorySystem(false), minor: memorySystem(true) },
    summary: summarySystem,
    // 추천 답변 칩(스위치가 켜졌으면 chat-send가 매 턴 · `companion-suggest`는 다시 만들기). 캐릭터 · 말투 · 뜻 언어 · 대화는 user 쪽이라
    // 시스템 글은 이것 하나다.
    suggestions: suggestionSystem,
    proactiveDirective,
    // 성격대로 거절: 단계마다 이번 답 지시(시스템 프롬프트의 `# For this reply`)와 유저 말 자리의 앱 안내. 걸린 글은 넣지 않는다.
    refusal: {
      deflect: refusalDirective("deflect", placeholder("category")),
      warn: refusalDirective("warn", placeholder("category")),
      userText: refusalUserText(placeholder("category")),
    },
    feedbackModes: { ...feedbackModeRule },
    stateLine,
  };
}

export async function companionDocs(
  env: ChatSendEnv,
  outbound: Outbound,
  models: Record<string, string>,
) {
  const [characters, settings] = await Promise.all([
    callRpc<InspectedCharacter[]>(outbound, env, "companion_inspect_characters", {}).catch(
      () => null,
    ),
    callRpc<Record<string, unknown>>(outbound, env, "companion_inspect_settings", {}).catch(
      () => null,
    ),
  ]);
  return {
    models,
    characters:
      characters?.map((character) => ({
        ...character.persona,
        id: character.id,
        bibleVersion: character.bibleVersion,
        active: character.active,
        sortOrder: character.sortOrder,
        maxSpeechLevel: character.maxSpeechLevel,
        systemPrompt: systemPromptsFor(character.persona, character.maxSpeechLevel),
      })) ?? null,
    settings,
    inspectAvailable: characters != null && settings != null,
    prompts: promptDocs(),
  };
}
