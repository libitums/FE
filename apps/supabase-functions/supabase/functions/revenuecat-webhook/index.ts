// RevenueCat → 우리 DB(ADR-0144). 인증은 Supabase JWT가 아니라 RevenueCat이 싣는 `Authorization` 헤더 값으로 합니다
// (`config.toml` verify_jwt = false).

import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";
import { createRevenuecatWebhookHandler } from "../_shared/revenuecat-webhook-handler.ts";
import { revenuecatWebhookEnvFrom } from "../_shared/revenuecat-webhook-env.ts";

Deno.serve(
  createRevenuecatWebhookHandler({
    env: revenuecatWebhookEnvFrom((name) => Deno.env.get(name)),
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
