import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { createChatSendHandler } from "../_shared/chat-send-handler.ts";
import { missionLlmFor } from "../_shared/companion-llm-mission.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

const read = (name: string) => Deno.env.get(name);
const env = chatSendEnvFrom(read);

Deno.serve(
  createChatSendHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    // 미션까지 아는 계층 — 컴패니언 턴에는 같은 호출이다(가짜 답만 미션 시스템 프롬프트일 때 갈린다).
    llm: env === null ? null : missionLlmFor(env, read),
    nowMs: () => Date.now(),
    randomUuid: () => crypto.randomUUID(),
    waitUntil: (work) => EdgeRuntime.waitUntil(work),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
