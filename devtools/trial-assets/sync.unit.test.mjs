import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// 랜딩 체험판의 사본(u00 JSON · 그림 10 · 효과음 5)이 앱 원본과 바이트가 같은지 봅니다.
// 루트 도구라 두 앱을 함께 읽어도 패키지 의존이 아닙니다.

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const at = (...parts) => join(root, ...parts);

/** 폴더 아래 파일의 상대 경로(posix) 목록. 폴더가 없으면 빈 목록. */
function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const walk = (current) =>
    readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
      const full = join(current, entry.name);
      return entry.isDirectory() ? walk(full) : [relative(dir, full).split(sep).join("/")];
    });
  return walk(dir).sort();
}

function assertSameBytes(copy, original) {
  assert.ok(existsSync(copy), `사본이 없다: ${relative(root, copy)}`);
  assert.ok(existsSync(original), `원본이 없다: ${relative(root, original)}`);
  assert.ok(
    readFileSync(copy).equals(readFileSync(original)),
    `바이트가 다르다: ${relative(root, copy)} ≠ ${relative(root, original)}`,
  );
}

const TRIAL_IMAGES = [
  "items/hello.webp",
  "u00-tutorial/cult-u00-jalhasineyo.webp",
  "u00-tutorial/post-1.webp",
  "u00-tutorial/post-2.webp",
  "u00-tutorial/pre-1.webp",
  "u00-tutorial/pre-2.webp",
  "u00-tutorial/pre-3.webp",
  "u00-tutorial/pre-4.webp",
  "u00-tutorial/pre-5.webp",
  "u00-tutorial/pre-6.webp",
];

const TRIAL_SFX = [
  "button.mp3",
  "correct_answer.mp3",
  "lesson_complete.mp3",
  "pass_lesson.mp3",
  "wrong_answer.mp3",
];

test("TA1: 랜딩 u00 사본은 앱 내장본과 바이트가 같다", () => {
  assertSameBytes(
    at("apps/landing/src/trial/content/u00-tutorial.json"),
    at("apps/mobile/content/episodes/u00-tutorial.json"),
  );
});

test("TA2: 그림 사본은 정해진 10개이고 각각 앱 원본과 바이트가 같다", () => {
  const copyRoot = at("apps/landing/src/assets/trial/images");
  assert.deepEqual(filesUnder(copyRoot), TRIAL_IMAGES);
  for (const path of TRIAL_IMAGES) {
    assertSameBytes(join(copyRoot, path), at("apps/mobile/src/assets/content/images", path));
  }
});

test("TA3: 효과음 사본은 정해진 5개이고 각각 iOS 원본과 바이트가 같다", () => {
  const copyRoot = at("apps/landing/public/trial/sfx");
  assert.deepEqual(filesUnder(copyRoot), TRIAL_SFX);
  for (const name of TRIAL_SFX) {
    assertSameBytes(join(copyRoot, name), at("apps/ios/Host/sfx", name));
  }
});

test("TA4: 패키지와 앱의 zod 의존은 같은 정확 버전이다", () => {
  const zodOf = (path) => JSON.parse(readFileSync(at(path), "utf8")).dependencies?.zod;
  const core = zodOf("packages/episode-core/package.json");
  const app = zodOf("apps/mobile/package.json");
  assert.match(core ?? "", /^\d+\.\d+\.\d+$/, `정확 버전이 아니다: ${core}`);
  assert.equal(core, app);
});

test("TA5: 앱 매니페스트의 u00 version · sha256이 체험판 핀 원문에 들어 있다", () => {
  const manifest = JSON.parse(readFileSync(at("apps/mobile/content/manifest.json"), "utf8"));
  const u00 = manifest.episodes.find((entry) => entry.id === "u00-tutorial");
  assert.ok(u00, "매니페스트에 u00-tutorial이 없다");
  const pin = readFileSync(at("apps/landing/src/trial/trial-content.ts"), "utf8");
  assert.ok(pin.includes(`"${u00.version}"`), `핀에 version ${u00.version}이 없다`);
  assert.ok(pin.includes(`"${u00.sha256}"`), `핀에 sha256 ${u00.sha256}이 없다`);
});
