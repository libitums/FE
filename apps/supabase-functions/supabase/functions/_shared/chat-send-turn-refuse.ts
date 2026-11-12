// 턴의 성격대로 거절(`chat-send-refusal.ts`)을 턴 값으로 묶습니다 — 걸린 글 대신 분류와 단계만 준 답을 보통 답처럼 보내고
// `blocked`로 저장합니다. `chat-send-turn.ts`가 입력 검사에 걸린 턴에서 부릅니다.

import type { PersonaCard } from "./chat-send.contract.ts";
import type { TurnContext } from "./chat-send-context.ts";
import type { ModerationRecord, turnFinisher } from "./chat-send-finish.ts";
import { sendRefusal } from "./chat-send-refusal.ts";
import { historyFrom } from "./chat-send-reply.ts";
import { systemSplit } from "./companion-llm.ts";
import type { RefusalStage } from "./companion-llm-prompts.ts";
import { companionSystemPrompt, type PromptInput } from "./companion-prompt.ts";

export function turnRefuser(
  context: TurnContext,
  input: {
    readonly persona: PersonaCard;
    readonly promptInput: PromptInput;
    readonly moderation: ModerationRecord[];
    readonly finisher: ReturnType<typeof turnFinisher>;
    readonly withUsage: (assistant: Record<string, unknown>) => Record<string, unknown>;
  },
) {
  const { deps, env, llm, sink, gate, turn } = context;
  const { finish, sendState, done } = input.finisher;
  return async (stage: RefusalStage, category: string) => {
    const outcome = await sendRefusal(
      {
        deps,
        env,
        llm,
        sink,
        l1: gate.l1,
        persona: input.persona,
        speechLevel: turn.speechLevel,
        ageBand: gate.ageBand,
        history: historyFrom(turn),
        assistantMessageId: context.assistantMessageId,
        meta: { model: llm.model, trial: turn.trial, playground: context.playground },
      },
      {
        systemWith: (directive) => {
          const system = companionSystemPrompt({ ...input.promptInput, directive });
          return `${system.stable}${systemSplit}${system.dynamic}`;
        },
        record: (output) => input.moderation.push(output),
        finish: async (assistant) => {
          const finished = await finish("blocked", input.withUsage(assistant));
          sendState(finished);
          done(finished, stage);
        },
      },
      stage,
      category,
    );
    return { outcome, afterTurn: null };
  };
}
