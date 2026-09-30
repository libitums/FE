import { signEs256 } from "../_shared/apple-client-secret.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";
import { sendPushEnvFrom } from "../_shared/send-push-env.ts";
import { createSendPushHandler } from "../_shared/send-push-handler.ts";

Deno.serve(
  createSendPushHandler({
    env: sendPushEnvFrom((name) => Deno.env.get(name)),
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    nowMs: () => Date.now(),
    signEs256,
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
