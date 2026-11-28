import { createMissionSttHandler } from "../_shared/mission-stt-handler.ts";
import { missionVoiceEnvFrom } from "../_shared/mission-voice-env.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

Deno.serve(
  createMissionSttHandler({
    env: missionVoiceEnvFrom((name) => Deno.env.get(name)),
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    fetch,
    nowMs: () => Date.now(),
    waitUntil: (work) => EdgeRuntime.waitUntil(work),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
