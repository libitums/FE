import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { companionLlmFor } from "../_shared/companion-llm.ts";
import { createSuggestHandler } from "../_shared/companion-suggest-handler.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

const env = chatSendEnvFrom((name) => Deno.env.get(name));

Deno.serve(
  createSuggestHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    llm: env === null ? null : companionLlmFor(env),
    nowMs: () => Date.now(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
