import type { DeleteAccountEnvFrom, DeleteAccountEnvName } from "./delete-account.contract.ts";

export const deleteAccountEnvFrom: DeleteAccountEnvFrom = (read) => {
  const value = (name: DeleteAccountEnvName): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };

  const rawUrl = value("SUPABASE_URL");
  const supabaseAnonKey = value("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  if (rawUrl === null || supabaseAnonKey === null || supabaseServiceRoleKey === null) return null;
  if (!rawUrl.startsWith("https://")) return null;
  const supabaseUrl = rawUrl.replace(/\/+$/, "");

  const teamId = value("APPLE_TEAM_ID");
  const keyId = value("APPLE_KEY_ID");
  const clientId = value("APPLE_CLIENT_ID");
  const privateKeyPem = value("APPLE_PRIVATE_KEY");
  const apple =
    teamId !== null && keyId !== null && clientId !== null && privateKeyPem !== null
      ? { teamId, keyId, clientId, privateKeyPem }
      : null;

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey, apple };
};
