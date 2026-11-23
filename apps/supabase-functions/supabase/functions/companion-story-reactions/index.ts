import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { companionLlmFor } from "../_shared/companion-llm.ts";
import { reactionEnvOf } from "../_shared/companion-reaction-env.ts";
import { createReactionsHandler } from "../_shared/companion-reactions-handler.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

// 내 스토리 반응(ADR-0179) — 정리 · 때가 된 반응 만들기. 환경은 컴패니언 함수와 같은 이름을 읽고, 출력 검사 · 번역만 Haiku
// (`COMPANION_REACTION_CHECK_MODEL` · `COMPANION_REACTION_TRANSLATION_MODEL`로 바꿈, ADR-0179 D5).
const env = reactionEnvOf(
  chatSendEnvFrom((name) => Deno.env.get(name)),
  (name) => Deno.env.get(name),
);

Deno.serve(
  createReactionsHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    llm: env === null ? null : companionLlmFor(env),
    nowMs: () => Date.now(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
