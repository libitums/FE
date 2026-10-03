import { createSign } from "node:crypto";

/** Pure checks shared by the opt-in remote FCM smoke runner. */
export function firebaseClient(config) {
  if (config === null || typeof config !== "object") return null;
  const projectId = config.project_info?.project_id;
  const senderId = config.project_info?.project_number;
  const matches =
    Array.isArray(config.client) &&
    config.client.some(
      (client) => client?.client_info?.android_client_info?.package_name === "com.libitum.host",
    );
  if (!matches || !/^[a-z][a-z0-9-]{4,29}$/.test(projectId ?? "")) return null;
  if (!/^\d+$/.test(senderId ?? "")) return null;
  return { projectId, senderId };
}

export function serviceAccountForProject(account, projectId) {
  if (account === null || typeof account !== "object") return null;
  if (account.type !== "service_account" || account.project_id !== projectId) return null;
  if (typeof account.client_email !== "string" || !account.client_email.includes("@")) return null;
  if (typeof account.private_key !== "string" || !account.private_key.includes("PRIVATE KEY"))
    return null;
  return account;
}

/** Reads the Debug SDK cache; an unexpected Firebase storage format fails closed. */
export function rawTokenFromPrefs(xml, senderId) {
  if (!/^\d+$/.test(senderId)) return null;
  const key = `|T|${senderId}|*`;
  const entries = [...xml.matchAll(/<string\s+name="([^"]+)"\s*>([^<]*)<\/string>/g)];
  const matches = entries.filter((entry) => entry[1] === key);
  if (matches.length !== 1) return null;
  const token = matches[0][2];
  if (token.length < 20 || token.length > 3072 || /[\x00-\x1f\x7f]/.test(token)) return null;
  return token;
}

export function dataMessage(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 3072)
    throw new Error("A valid raw FCM token is required");
  return {
    message: {
      token,
      data: {
        title: "Duru remote test",
        body: "Open notifications",
        target: JSON.stringify({ kind: "notifications" }),
      },
      android: { priority: "HIGH" },
    },
  };
}

export function serviceAccountAssertion(account, issuedAtSeconds) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + 3600,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  return `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;
}
