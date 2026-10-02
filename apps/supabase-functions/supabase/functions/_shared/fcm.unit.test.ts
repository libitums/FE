import { beforeAll, describe, expect, test } from "vitest";

import { bytesFromBase64Url } from "./base64.ts";
import {
  fcmAccessTokenFrom,
  fcmAssertion,
  fcmOauthRequest,
  fcmRawTokenFrom,
  fcmRequest,
  fcmResultFrom,
  fcmServiceAccountFrom,
  fcmStoredTokenFrom,
} from "./fcm.ts";

const rawToken = "bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUdFQ3P1";
let privateKeyPem: string;
let publicKey: CryptoKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  publicKey = pair.publicKey;
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const binary = Array.from(der, (byte) => String.fromCharCode(byte)).join("");
  privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${btoa(binary)}\n-----END PRIVATE KEY-----`;
});

describe("FCM token and service account", () => {
  test("opaque token becomes a URL-safe stored token and round trips", () => {
    const stored = fcmStoredTokenFrom(rawToken);
    expect(stored).toMatch(/^fcm\.[A-Za-z0-9_-]+$/);
    expect(fcmRawTokenFrom(stored!)).toBe(rawToken);
    expect(fcmRawTokenFrom(`fcm.${"a".repeat(27)}`)).toBeNull();
    expect(fcmRawTokenFrom("fcm.not-valid!token")).toBeNull();
    expect(fcmStoredTokenFrom("short")).toBeNull();
  });

  test("service account needs all three scoped fields", () => {
    const json = JSON.stringify({
      project_id: "duru-prod",
      client_email: "push@duru.iam.gserviceaccount.com",
      private_key: "pem",
    });
    expect(fcmServiceAccountFrom(json)).toEqual({
      projectId: "duru-prod",
      clientEmail: "push@duru.iam.gserviceaccount.com",
      privateKeyPem: "pem",
    });
    expect(fcmServiceAccountFrom("{}")).toBeNull();
    expect(fcmServiceAccountFrom("not json")).toBeNull();
    expect(
      fcmServiceAccountFrom(
        JSON.stringify({ project_id: "../x", client_email: "x@y.z", private_key: "pem" }),
      ),
    ).toBeNull();
  });
});

describe("FCM HTTP v1", () => {
  test("signed OAuth assertion requests Firebase messaging scope", async () => {
    const account = {
      projectId: "duru-prod",
      clientEmail: "push@duru.iam.gserviceaccount.com",
      privateKeyPem,
    };
    const assertion = await fcmAssertion(account, 1_700_000_000_000);
    expect(assertion).not.toBeNull();
    const parts = assertion!.split(".");
    expect(parts).toHaveLength(3);
    const claims = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(parts[1]!)!));
    expect(claims).toEqual({
      iss: account.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
    expect(
      await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        publicKey,
        bytesFromBase64Url(parts[2]!)! as Uint8Array<ArrayBuffer>,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      ),
    ).toBe(true);
    const oauth = fcmOauthRequest(assertion!);
    expect(oauth.url).toBe("https://oauth2.googleapis.com/token");
    expect(oauth.body).toContain(
      "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer",
    );
    expect(fcmAccessTokenFrom(200, '{"access_token":"access","token_type":"Bearer"}')).toBe(
      "access",
    );
    expect(fcmAccessTokenFrom(401, '{"access_token":"access"}')).toBeNull();
  });

  test("message preserves the closed target and only UNREGISTERED is pruned", () => {
    const stored = fcmStoredTokenFrom(rawToken)!;
    const request = fcmRequest(
      {
        projectId: "duru-prod",
        clientEmail: "push@duru.iam.gserviceaccount.com",
        privateKeyPem: "pem",
      },
      "access",
      stored,
      { title: "New", body: "Episode 2", target: { kind: "messenger", unitId: "u1" } },
    );
    expect(request?.url).toBe("https://fcm.googleapis.com/v1/projects/duru-prod/messages:send");
    expect(JSON.parse(request!.body!)).toEqual({
      message: {
        token: rawToken,
        data: {
          title: "New",
          body: "Episode 2",
          target: '{"kind":"messenger","unitId":"u1"}',
        },
        android: { priority: "HIGH" },
      },
    });
    const malformed = fcmRequest(
      {
        projectId: "duru-prod",
        clientEmail: "push@duru.iam.gserviceaccount.com",
        privateKeyPem: "pem",
      },
      "access",
      stored,
      { title: null, body: undefined, target: { kind: "journey-map" } } as unknown as Parameters<
        typeof fcmRequest
      >[3],
    );
    expect(JSON.parse(malformed!.body!).message.data).toEqual({
      title: "",
      body: "",
      target: '{"kind":"journey-map"}',
    });
    expect(fcmResultFrom(200, "{}")).toBe("sent");
    expect(fcmResultFrom(404, '{"error":{"details":[{"errorCode":"UNREGISTERED"}]}}')).toBe(
      "invalid-token",
    );
    expect(fcmResultFrom(400, '{"error":{"details":[{"errorCode":"INVALID_ARGUMENT"}]}}')).toBe(
      "failed",
    );
    expect(fcmResultFrom(404, '{"error":{"message":"Not found"}}')).toBe("failed");
  });
});
