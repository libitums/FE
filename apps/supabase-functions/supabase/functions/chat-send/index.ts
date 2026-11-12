import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { createChatSendHandler } from "../_shared/chat-send-handler.ts";
import { companionLlmFor } from "../_shared/companion-llm.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

const env = chatSendEnvFrom((name) => Deno.env.get(name));

Deno.serve(
  createChatSendHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    llm: env === null ? null : companionLlmFor(env),
    nowMs: () => Date.now(),
    randomUuid: () => crypto.randomUUID(),
    waitUntil: (work) => EdgeRuntime.waitUntil(work),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
