import { appleClientSecretFor } from "./apple-client-secret.ts";
import {
  appleRefreshSubjectFrom,
  appleRefreshValidationRequest,
  appleRevokeRequest,
  appleTokenExchangeFrom,
  appleTokenRequest,
} from "./apple-token.ts";
import type {
  CreateDeleteAccountHandler,
  DeleteAccountBodyFrom,
  DeleteAccountDeps,
  DeleteAccountEnv,
  DeleteAccountOutcome,
  DeleteAccountResponse,
  OutboundRequest,
  OutboundResponse,
} from "./delete-account.contract.ts";
import {
  adminDeleteUserRequest,
  authUserRequest,
  authUserSummaryFrom,
  bearerTokenFrom,
} from "./supabase-auth.ts";

export const deleteAccountBodyFrom: DeleteAccountBodyFrom = (bodyText) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const code = record["apple_authorization_code"];
  const refreshToken = record["apple_provider_refresh_token"];
  if (code !== null && (typeof code !== "string" || code === "")) return null;
  if (refreshToken !== undefined && (typeof refreshToken !== "string" || refreshToken === "")) {
    return null;
  }
  if (code !== null && refreshToken !== undefined) return null;
  return {
    apple_authorization_code: code,
    ...(refreshToken === undefined ? {} : { apple_provider_refresh_token: refreshToken }),
  };
};

export const deleteAccountResponse: DeleteAccountResponse = (outcome) => {
  if (outcome.status === 204) return new Response(null, { status: 204 });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (outcome.status === 405) headers["Allow"] = "POST";
  return new Response(JSON.stringify({ error: outcome.error }), {
    status: outcome.status,
    headers,
  });
};

const send = async (
  deps: DeleteAccountDeps,
  request: OutboundRequest,
): Promise<OutboundResponse | null> => {
  try {
    return await deps.outbound(request);
  } catch {
    return null;
  }
};

const failure = (status: 500, error: "server_misconfigured" | "delete_failed") =>
  ({ status, error }) as const;

async function decide(
  deps: DeleteAccountDeps,
  env: DeleteAccountEnv,
  request: Request,
): Promise<DeleteAccountOutcome> {
  const token = bearerTokenFrom(request.headers.get("Authorization"));
  if (token === null) return { status: 401, error: "missing_authorization" };

  const lookup = await send(deps, authUserRequest(env, token));
  if (lookup === null) return { status: 502, error: "auth_unavailable" };
  if (lookup.status >= 400 && lookup.status < 500) return { status: 401, error: "invalid_session" };
  if (lookup.status !== 200) return { status: 502, error: "auth_unavailable" };
  const user = authUserSummaryFrom(await lookup.text().catch(() => ""));
  if (user === null) return { status: 502, error: "auth_unavailable" };

  const body = deleteAccountBodyFrom(await request.text().catch(() => ""));
  if (body === null) return { status: 400, error: "invalid_body" };

  if (user.apple !== null) {
    const apple = env.apple;
    if (apple === null) return failure(500, "server_misconfigured");
    const code = body.apple_authorization_code;
    const providerRefreshToken = body.apple_provider_refresh_token;
    if (code === null && providerRefreshToken === undefined) {
      return { status: 400, error: "apple_authorization_code_required" };
    }
    if (providerRefreshToken !== undefined && apple.webClientId === undefined) {
      return failure(500, "server_misconfigured");
    }
    const client =
      providerRefreshToken === undefined ? apple : { ...apple, clientId: apple.webClientId! };
    const secret = await appleClientSecretFor(client, deps.nowMs(), deps.signEs256);
    if (secret === null) return failure(500, "server_misconfigured");

    const exchangeResponse = await send(
      deps,
      providerRefreshToken === undefined
        ? appleTokenRequest(client, secret, code!)
        : appleRefreshValidationRequest(client, secret, providerRefreshToken),
    );
    if (exchangeResponse === null || exchangeResponse.status !== 200) {
      return { status: 502, error: "apple_exchange_failed" };
    }
    const exchangeText = await exchangeResponse.text().catch(() => "");
    const exchange =
      providerRefreshToken === undefined ? appleTokenExchangeFrom(exchangeText) : null;
    if (providerRefreshToken === undefined && exchange === null) {
      return { status: 502, error: "apple_exchange_failed" };
    }
    const subject =
      providerRefreshToken === undefined
        ? exchange?.subject
        : appleRefreshSubjectFrom(exchangeText);
    if (providerRefreshToken !== undefined && subject === null) {
      return { status: 502, error: "apple_exchange_failed" };
    }
    if (subject !== user.apple.subject) {
      return { status: 403, error: "apple_account_mismatch" };
    }

    const revoke = await send(
      deps,
      appleRevokeRequest(client, secret, providerRefreshToken ?? exchange!.refreshToken),
    );
    if (revoke === null || revoke.status !== 200) {
      return { status: 502, error: "apple_revoke_failed" };
    }
  }

  const deleted = await send(deps, adminDeleteUserRequest(env, user.id));
  if (
    deleted === null ||
    !((deleted.status >= 200 && deleted.status < 300) || deleted.status === 404)
  ) {
    return failure(500, "delete_failed");
  }
  return { status: 204 };
}

export const createDeleteAccountHandler: CreateDeleteAccountHandler = (deps) => {
  return async (request) => {
    let outcome: DeleteAccountOutcome;
    try {
      if (request.method !== "POST") outcome = { status: 405, error: "method_not_allowed" };
      else if (deps.env === null) outcome = failure(500, "server_misconfigured");
      else outcome = await decide(deps, deps.env, request);
    } catch {
      outcome = failure(500, "delete_failed");
    }
    deps.log({
      event: "delete-account",
      status: outcome.status,
      error: outcome.status === 204 ? null : outcome.error,
    });
    return deleteAccountResponse(outcome);
  };
};
