// RevenueCat 웹훅 환경 값(ADR-0144). 셋 중 하나라도 없거나 URL이 https가 아니면 null — 처리기가 500으로 막습니다.

import type {
  RevenuecatWebhookEnvFrom,
  RevenuecatWebhookEnvName,
} from "./revenuecat-webhook.contract.ts";

export const revenuecatWebhookEnvFrom: RevenuecatWebhookEnvFrom = (read) => {
  const value = (name: RevenuecatWebhookEnvName): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  const rawUrl = value("SUPABASE_URL");
  const supabaseServiceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  const webhookAuth = value("REVENUECAT_WEBHOOK_AUTH");
  if (rawUrl === null || supabaseServiceRoleKey === null || webhookAuth === null) return null;
  if (!rawUrl.startsWith("https://")) return null;
  return {
    supabaseUrl: rawUrl.replace(/\/+$/, ""),
    supabaseServiceRoleKey,
    webhookAuth,
    acceptSandbox: value("REVENUECAT_ACCEPT_SANDBOX") === "true",
  };
};
