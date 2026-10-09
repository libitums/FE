// BG1~BG3: 빌드 산출물(APK · AAB) 안의 호스트 오디오 자산을 본다.
// 산출물을 먼저 만들어야 한다 (clean 필수):
//   cd apps/android && ./gradlew clean :app:assembleDebug :app:assembleBundled :app:bundleRelease
// 실행 (pnpm verify의 `*.test.mjs` 글롭에 들어가지 않는다 — Gradle 산출물이 필요해서):
//   node --test devtools/android-bundle/packaged-assets.artifacts.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputs = join(root, "apps/android/app/build/outputs");

const list = (dir, ext) =>
  readdirSync(join(root, dir))
    .filter((n) => n.endsWith(ext))
    .sort();
const expectedAudio = list("apps/ios/Host/audio", ".m4a");
const expectedSfx = list("apps/ios/Host/sfx", ".mp3");

/** ZIP 중앙 디렉터리 → [{ name, method }] (method 0 = STORED). */
function zipEntries(file) {
  return zipEntriesOf(readFileSync(file), file);
}

function zipEntriesOf(buf, file) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  assert.ok(eocd >= 0, `${file} is not a zip`);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n += 1) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50, "bad central directory entry");
    const method = buf.readUInt16LE(p + 10);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    entries.push({ name: buf.toString("utf8", p + 46, p + 46 + nameLen), method });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function findArtifact(dir, ext) {
  const full = join(outputs, dir);
  const found = existsSync(full) ? readdirSync(full).filter((n) => n.endsWith(ext)) : [];
  assert.ok(
    found.length > 0,
    `no ${ext} under apps/android/app/build/outputs/${dir} — build it first`,
  );
  return join(full, found[0]);
}

function assertPackaged(file, prefix) {
  assert.ok(expectedAudio.length > 0 && expectedSfx.length > 0, "host audio sources are empty");
  const entries = zipEntries(file);
  const check = (folder, expected) => {
    const head = `${prefix}${folder}/`;
    const inside = entries.filter((e) => e.name.startsWith(head) && !e.name.endsWith("/"));
    const names = inside.map((e) => e.name.slice(head.length)).sort();
    assert.deepEqual(names, expected, `${head} entries differ from the ios source set`);
    const compressed = inside.filter((e) => e.method !== 0).map((e) => e.name);
    assert.deepEqual(compressed, [], `${head} has non-STORED entries`);
  };
  check("audio", expectedAudio);
  check("sfx", expectedSfx);
}

test("BG1: assembleBundled APK carries 21 m4a + 8 mp3, all STORED", () => {
  assertPackaged(findArtifact("apk/bundled", ".apk"), "assets/");
});

/** BundleConfig.pb(protobuf)에서 uncompressed_glob 문자열(전부 "**"로 시작)을 printable 런으로 뽑는다. */
function uncompressedGlobs(aab) {
  const raw = execFileSync("unzip", ["-p", aab, "BundleConfig.pb"], {
    maxBuffer: 1 << 20,
  }).toString("latin1");
  return [...raw.matchAll(/\*\*[\x20-\x7e]+/g)].map((m) => m[0]);
}

/** glob(`**.[mM]4[aA]`, `**.mp3` 등)을 정규식으로. `**`는 경로 포함 임의, 문자 클래스는 그대로. */
function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i += 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else if (c === "[") {
      const close = glob.indexOf("]", i);
      re += glob.slice(i, close + 1);
      i = close;
    } else re += c.replace(/[.+^$(){}|\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

function bundletoolCommand() {
  const jar = process.env.BUNDLETOOL_JAR;
  if (jar && existsSync(jar)) return ["java", ["-jar", jar]];
  return null;
}

// AGP/bundletool은 AAB 안의 항목을 전부 deflate로 저장한다(STORED를 요구하면 안 된다, 계약 r02).
// 설치되는 분할 APK의 무압축 여부는 BundleConfig.pb의 무압축 글롭이 정한다.
test("BG2: bundleRelease AAB carries 21 m4a + 8 mp3, all matched by BundleConfig uncompressed globs", () => {
  const aab = findArtifact("bundle/release", ".aab");
  const entries = zipEntries(aab);
  const globs = uncompressedGlobs(aab).map(globToRegExp);
  assert.ok(globs.length > 0, "BundleConfig.pb has no uncompressed_glob");
  for (const [folder, expected] of [
    ["audio", expectedAudio],
    ["sfx", expectedSfx],
  ]) {
    const head = `base/assets/${folder}/`;
    const inside = entries.filter((e) => e.name.startsWith(head) && !e.name.endsWith("/"));
    assert.deepEqual(
      inside.map((e) => e.name.slice(head.length)).sort(),
      expected,
      `${head} entries differ from the ios source set`,
    );
    const uncovered = inside
      .map((e) => e.name.slice("base/".length))
      .filter((path) => !globs.some((re) => re.test(path)));
    assert.deepEqual(
      uncovered,
      [],
      `${head} entries not covered by BundleConfig uncompressed globs`,
    );
  }
});

// 실제 무압축: bundletool이 만든 APK에서 STORED인지. BUNDLETOOL_JAR(bundletool-all jar 경로)가
// 없으면 이 확인만 건너뛴다 — 글롭 검사(위)가 AAB 단계의 판정이고, 이 쪽은 추가 확인이다.
test("BG2b: bundletool universal APK from the AAB stores them STORED", (t) => {
  const tool = bundletoolCommand();
  if (!tool) {
    t.skip("BUNDLETOOL_JAR not set; BundleConfig glob check above is the AAB verdict");
    return;
  }
  const aab = findArtifact("bundle/release", ".aab");
  const dir = mkdtempSync(join(tmpdir(), "bg2-"));
  try {
    const apks = join(dir, "u.apks");
    execFileSync(
      tool[0],
      [...tool[1], "build-apks", `--bundle=${aab}`, `--output=${apks}`, "--mode=universal"],
      {
        stdio: "pipe",
      },
    );
    const apk = execFileSync("unzip", ["-p", apks, "universal.apk"], { maxBuffer: 1 << 30 });
    const entries = zipEntriesOf(apk, "universal.apk");
    for (const [folder, expected] of [
      ["audio", expectedAudio],
      ["sfx", expectedSfx],
    ]) {
      const head = `assets/${folder}/`;
      const inside = entries.filter((e) => e.name.startsWith(head) && !e.name.endsWith("/"));
      assert.deepEqual(inside.map((e) => e.name.slice(head.length)).sort(), expected);
      assert.deepEqual(
        inside.filter((e) => e.method !== 0).map((e) => e.name),
        [],
        `${head} has non-STORED entries in the bundletool APK`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("BG3: assembleDebug APK carries 21 m4a + 8 mp3, all STORED", () => {
  assertPackaged(findArtifact("apk/debug", ".apk"), "assets/");
});
