import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { companionLlmFor } from "../_shared/companion-llm.ts";
import { createGreetHandler } from "../_shared/companion-greet-handler.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

const env = chatSendEnvFrom((name) => Deno.env.get(name));

Deno.serve(
  createGreetHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    llm: env === null ? null : companionLlmFor(env),
    nowMs: () => Date.now(),
    randomUuid: () => crypto.randomUUID(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
