// AdMob 보상형 광고 서버 검증(SSV) 콜백(ADR-0209). Google이 GET으로 부릅니다 — 인증은 Supabase JWT가 아니라
// Google 공개키 서명입니다(`config.toml` verify_jwt = false).

import { admobSsvEnvFrom, createAdmobKeys } from "../_shared/admob-ssv.ts";
import { createAdmobSsvHandler } from "../_shared/admob-ssv-handler.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

const outbound = timedOutbound(fetch, outboundTimeoutMs);

Deno.serve(
  createAdmobSsvHandler({
    env: admobSsvEnvFrom((name) => Deno.env.get(name)),
    outbound,
    keys: createAdmobKeys({ outbound, nowMs: () => Date.now() }),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
