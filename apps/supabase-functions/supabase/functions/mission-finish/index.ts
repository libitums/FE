import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { missionLlmFor } from "../_shared/companion-llm-mission.ts";
import { createMissionFinishHandler } from "../_shared/mission-finish-handler.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

const read = (name: string) => Deno.env.get(name);
const env = chatSendEnvFrom(read);

Deno.serve(
  createMissionFinishHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    llm: env === null ? null : missionLlmFor(env, read),
    nowMs: () => Date.now(),
    randomUuid: () => crypto.randomUUID(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
