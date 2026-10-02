import type { SendPushEnvFrom, SendPushEnvName } from "./send-push.contract.ts";
import { fcmServiceAccountFrom } from "./fcm.ts";

export const sendPushEnvFrom: SendPushEnvFrom = (read) => {
  const value = (name: SendPushEnvName): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };

  const rawUrl = value("SUPABASE_URL");
  const supabaseServiceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  const teamId = value("APPLE_TEAM_ID");
  const topic = value("APPLE_CLIENT_ID");
  const keyId = value("APNS_KEY_ID");
  const privateKeyPem = value("APNS_PRIVATE_KEY");
  if (
    rawUrl === null ||
    supabaseServiceRoleKey === null ||
    teamId === null ||
    topic === null ||
    keyId === null ||
    privateKeyPem === null
  ) {
    return null;
  }
  if (!rawUrl.startsWith("https://")) return null;

  const firebaseJson = value("FIREBASE_SERVICE_ACCOUNT_JSON");
  const fcm = firebaseJson === null ? null : fcmServiceAccountFrom(firebaseJson);
  if (firebaseJson !== null && fcm === null) return null;

  return {
    supabaseUrl: rawUrl.replace(/\/+$/, ""),
    supabaseServiceRoleKey,
    apns: { teamId, keyId, topic, privateKeyPem },
    fcm,
  };
};
