import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";
import { pushCampaignConfig } from "../_shared/push-campaign-config.ts";
import {
  createPushCampaignsHandler,
  pushCampaignsEnvFrom,
} from "../_shared/push-campaigns-handler.ts";

Deno.serve(
  createPushCampaignsHandler({
    env: pushCampaignsEnvFrom((name) => Deno.env.get(name)),
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    // send-push 한 번이 기기 수백 대를 돌 수 있어 길게 둡니다.
    sendOutbound: timedOutbound(fetch, 90_000),
    config: pushCampaignConfig,
    nowMs: () => Date.now(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
