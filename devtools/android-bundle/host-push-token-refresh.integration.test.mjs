// android-push-token-refresh 정적 결선 검사 (HT1~HT4). 계약: spec.md §6, 계획: test-plan.md integration.
// 실제 Java · TypeScript 소스를 읽는다. Gradle 산출물이 필요 없다 — pnpm test:android-bundle / pnpm verify에서 돈다.
// 호스트가 실제로 JS까지 이벤트를 보내는 것은 정적으로 증명되지 않는다(계측 PushTokenRefreshHostTest · e2e T2).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const hostDir = join(root, "apps/android/app/src/main/java/com/libitum/host");
const mainActivityPath = join(hostDir, "MainActivity.java");
const servicePath = join(hostDir, "DuruFirebaseMessagingService.java");
const modulePath = join(hostDir, "PushNotificationModule.java");
const hookPath = join(root, "apps/mobile/src/app/use-push-token-refresh.ts");
const appSessionPath = join(root, "apps/mobile/src/app/AppSession.tsx");
const iosHostDir = join(root, "apps/ios/Host");

const expectedEventName = "pushTokenRefreshed";

/** `//` 줄 주석과 블록 주석을 지운다. 문자열 · 문자 리터럴 안의 `//`(URL)는 건드리지 않는다. */
function stripJavaComments(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    const ch = source[i];
    if (two === "//") {
      while (i < source.length && source[i] !== "\n") i += 1;
    } else if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      out += " ";
    } else if (ch === '"' || ch === "'") {
      out += ch;
      i += 1;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === "\\") {
          out += source[i];
          i += 1;
        }
        out += source[i] ?? "";
        i += 1;
      }
      out += ch;
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

/** TypeScript 주석을 지운다(문자열 안의 `//`는 이 파일들에 없다). */
const stripTsComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");

/** 시그니처 정규식이 처음 맞는 자리부터 본문 `{ … }`의 안쪽을 돌려준다. 없으면 null. */
function methodBody(source, signature) {
  const found = signature.exec(source);
  if (!found) return null;
  const open = source.indexOf("{", found.index + found[0].length);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

const javaSource = (path) => stripJavaComments(readFileSync(path, "utf8"));

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else out.push(path);
  }
  return out;
}

test("HT1: the event name MainActivity sends equals the hook's pushTokenRefreshedEventName (§6.1)", () => {
  const hook = stripTsComments(readFileSync(hookPath, "utf8"));
  const declared = /export\s+const\s+pushTokenRefreshedEventName\s*=\s*"([^"]+)"/.exec(hook);
  assert.ok(declared, "use-push-token-refresh.ts does not export pushTokenRefreshedEventName");
  assert.equal(declared[1], expectedEventName, "the hook listens for a different event name");

  const mainActivity = javaSource(mainActivityPath);
  const sent = [...mainActivity.matchAll(/sendGlobalEvent\(\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(
    sent.includes(declared[1]),
    `MainActivity.java never sends "${declared[1]}" through sendGlobalEvent (sends: ${sent.join(", ")})`,
  );
});

test("HT2: DuruFirebaseMessagingService.onNewToken only forwards to PushTokenRefreshRelay.PROCESS.notifyRefreshed() (§6.2)", () => {
  const service = javaSource(servicePath);
  const signature = /\bvoid\s+onNewToken\s*\(\s*(?:final\s+)?(?:@\w+\s+)?String\s+(\w+)\s*\)/;
  const found = signature.exec(service);
  assert.ok(found, "DuruFirebaseMessagingService.java does not override onNewToken(String)");
  const body = methodBody(service, signature);
  assert.ok(body !== null, "onNewToken has no body");
  assert.match(
    body,
    /PushTokenRefreshRelay\s*\.\s*PROCESS\s*\.\s*notifyRefreshed\s*\(\s*\)/,
    "onNewToken does not call PushTokenRefreshRelay.PROCESS.notifyRefreshed()",
  );
  const argument = found[1];
  assert.doesNotMatch(
    body,
    new RegExp(`\\b${argument}\\b`),
    `onNewToken uses its token argument "${argument}" (stored, logged or forwarded)`,
  );
});

test("HT3: MainActivity attaches to the relay and detaches in onDestroy (§6.2)", () => {
  const mainActivity = javaSource(mainActivityPath);
  assert.match(
    mainActivity,
    /PushTokenRefreshRelay\s*\.\s*PROCESS\s*\.\s*attach\s*\(/,
    "MainActivity.java never calls PushTokenRefreshRelay.PROCESS.attach(",
  );
  const onDestroy = methodBody(mainActivity, /\bvoid\s+onDestroy\s*\(\s*\)/);
  assert.ok(onDestroy !== null, "MainActivity.java has no onDestroy()");
  assert.match(
    onDestroy,
    /PushTokenRefreshRelay\s*\.\s*PROCESS\s*\.\s*detach\s*\(/,
    "onDestroy does not call PushTokenRefreshRelay.PROCESS.detach(",
  );
});

test("HT4a: guard — the host module keeps its four @LynxMethod methods and iOS never sends the event (AC4)", () => {
  const module = javaSource(modulePath);
  const methods = [...module.matchAll(/@LynxMethod\s+public\s+\w+\s+(\w+)\s*\(/g)].map((m) => m[1]);
  assert.deepEqual(methods.toSorted(), ["getStatus", "openSettings", "register", "takeOpened"]);

  assert.ok(existsSync(iosHostDir), "apps/ios/Host is missing");
  const offenders = filesUnder(iosHostDir).filter((path) => {
    try {
      return readFileSync(path, "utf8").includes(expectedEventName);
    } catch {
      return false;
    }
  });
  assert.deepEqual(offenders, [], `iOS host mentions ${expectedEventName}`);
});

test("HT4b: AppSession.tsx calls usePushTokenRefresh() (§6.3)", () => {
  const appSession = stripTsComments(readFileSync(appSessionPath, "utf8"));
  assert.match(
    appSession,
    /\busePushTokenRefresh\s*\(\s*\)/,
    "AppSession.tsx never calls usePushTokenRefresh()",
  );
});
