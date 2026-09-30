import { signEs256 } from "../_shared/apple-client-secret.ts";
import { createDeleteAccountHandler } from "../_shared/delete-account-handler.ts";
import { deleteAccountEnvFrom } from "../_shared/delete-account-env.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

Deno.serve(
  createDeleteAccountHandler({
    env: deleteAccountEnvFrom((name) => Deno.env.get(name)),
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    nowMs: () => Date.now(),
    signEs256,
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
