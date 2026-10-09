#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dataMessage,
  firebaseClient,
  rawTokenFromPrefs,
  serviceAccountAssertion,
  serviceAccountForProject,
} from "./live-fcm.mjs";

const repo = fileURLToPath(new URL("../..", import.meta.url));

function readJson(path, description) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`${description} is missing or invalid`);
  }
}

async function main() {
  const keyPath = process.env.FCM_SERVICE_ACCOUNT_FILE;
  const udid = process.env.FCM_UDID;
  const androidHome = process.env.ANDROID_HOME;
  if (!keyPath || !udid || !androidHome) {
    throw new Error("Set FCM_SERVICE_ACCOUNT_FILE, FCM_UDID, and ANDROID_HOME");
  }
  const config = firebaseClient(
    readJson(join(repo, "apps/android/app/google-services.json"), "Android Firebase config"),
  );
  if (config === null) throw new Error("Firebase config must contain libitum.duru.android");
  const account = serviceAccountForProject(
    readJson(keyPath, "Service account JSON"),
    config.projectId,
  );
  if (account === null) throw new Error("Service account must match the Android Firebase project");

  let prefs;
  try {
    prefs = execFileSync(
      join(androidHome, "platform-tools/adb"),
      [
        "-s",
        udid,
        "shell",
        "run-as",
        "libitum.duru.android",
        "cat",
        "shared_prefs/com.google.android.gms.appid.xml",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    throw new Error("Cannot read Debug app token; run test-live-fcm-token.sh first");
  }
  const token = rawTokenFromPrefs(prefs, config.senderId);
  if (token === null) throw new Error("No FCM token for this Firebase sender on the emulator");

  let assertion;
  try {
    assertion = serviceAccountAssertion(account, Math.floor(Date.now() / 1000));
  } catch {
    throw new Error("Service account private key cannot sign an OAuth assertion");
  }
  const oauth = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!oauth.ok) throw new Error(`FCM OAuth request failed: HTTP ${oauth.status}`);
  let credentials;
  try {
    credentials = await oauth.json();
  } catch {
    throw new Error("FCM OAuth response was not JSON");
  }
  if (
    credentials === null ||
    typeof credentials !== "object" ||
    credentials.token_type !== "Bearer" ||
    typeof credentials.access_token !== "string" ||
    credentials.access_token === ""
  ) {
    throw new Error("FCM OAuth response did not contain an access token");
  }

  const sent = await fetch(
    `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataMessage(token)),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!sent.ok) throw new Error(`FCM data message rejected: HTTP ${sent.status}`);
  console.log("FCM accepted the high-priority data message for the emulator");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "FCM smoke failed");
  process.exitCode = 1;
});
