// 첫 인사(모델이 만드는 경우)의 시스템 프롬프트(`companion-greet-handler.ts`에서 나눔). 선톡과 같은 페르소나 프롬프트 + 인사 지시,
// 그리고 대화의 처음이라 「지금까지 이야기」 카드를 모두 싣는다(`companion-story.ts`).

import type { AgeBand, FeedbackMode, RomanceTier } from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";
import type { GreetingPersona } from "./companion-greet-lines.ts";
import { systemSplit } from "./companion-llm.ts";
import { type OpenerLearning, withOpenerLine } from "./companion-opener.ts";
import { companionSystemPrompt, greetingDirective } from "./companion-prompt.ts";
import { storyCardFor } from "./companion-story.ts";

export function greetingSystem(
  characterId: string,
  persona: GreetingPersona,
  context: {
    readonly speechLevel: SpeechLevel;
    readonly ageBand: AgeBand;
    readonly romanceTier?: RomanceTier;
    readonly l1: string | null;
    readonly feedbackMode: FeedbackMode;
    readonly memories: readonly string[];
  },
  learning: OpenerLearning,
): string {
  const prompt = companionSystemPrompt({
    persona,
    speechLevel: context.speechLevel,
    ageBand: context.ageBand,
    romanceTier: context.romanceTier,
    l1: context.l1,
    expressions: learning.pool,
    summary: null,
    feedbackMode: context.feedbackMode,
    memories: context.memories,
    directive: withOpenerLine(greetingDirective, learning.target),
    story: storyCardFor(characterId, learning.episodes),
  });
  return `${prompt.stable}${systemSplit}${prompt.dynamic}`;
}
