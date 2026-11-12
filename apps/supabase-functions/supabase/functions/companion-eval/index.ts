import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { createCompanionEvalHandler } from "../_shared/companion-eval-handler.ts";
import { companionLlmWithModel } from "../_shared/companion-llm.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

const env = chatSendEnvFrom((name) => Deno.env.get(name));

Deno.serve(
  createCompanionEvalHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    llmFor: env === null ? null : (model) => companionLlmWithModel(env, model),
    nowMs: () => Date.now(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
