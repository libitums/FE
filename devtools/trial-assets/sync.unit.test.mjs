import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// 랜딩 체험판의 사본(u00 JSON · 그림 12 · 효과음 5)이 원본과 바이트가 같은지 봅니다.
// 루트 도구라 두 앱을 함께 읽어도 패키지 의존이 아닙니다.
//
// ⟨2026-10-26⟩ 앱 내장 u00이 버킷 최신본(4스텝)으로 바뀌었지만 체험판은 옛 14스텝 구조(S3 그림 고르기 · S9 · S12)에
// 맞춰져 있어 2026-10-23판에 머뭅니다. 그래서 u00 사본 · 핀은 앱 테스트 고정본(`content/test-fixtures/bundled-2026-10-23`)과
// 견주고, 그림은 앱에 아직 있는 것만 앱 원본과 견줍니다(옛 앞 컷 pre-1 ~ 6은 체험판 사본이 유일한 사본입니다).

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
  "u00-tutorial/post-3.webp",
  "u00-tutorial/post-4.webp",
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

/** 체험판이 머무는 u00 판의 원문 자리 — 앱 테스트 고정본입니다. */
const TRIAL_U00_SOURCE = "apps/mobile/content/test-fixtures/bundled-2026-10-23";

test("TA1: 랜딩 u00 사본은 체험판이 머무는 판(앱 테스트 고정본)과 바이트가 같다", () => {
  assertSameBytes(
    at("apps/landing/src/trial/content/u00-tutorial.json"),
    at(`${TRIAL_U00_SOURCE}/episodes/u00-tutorial.json`),
  );
});

test("TA2: 그림 사본은 정해진 12개이고, 앱에 아직 있는 그림은 앱 원본과 바이트가 같다", () => {
  const copyRoot = at("apps/landing/src/assets/trial/images");
  assert.deepEqual(filesUnder(copyRoot), TRIAL_IMAGES);
  const appRoot = at("apps/mobile/src/assets/content/images");
  const shared = TRIAL_IMAGES.filter((path) => existsSync(join(appRoot, path)));
  // 앱에서 빠진 것은 옛 앞 컷 여섯 장뿐이어야 합니다 — 그 밖의 그림이 빠지면 사본이 원본을 잃은 것입니다.
  assert.deepEqual(
    TRIAL_IMAGES.filter((path) => !shared.includes(path)),
    [1, 2, 3, 4, 5, 6].map((n) => `u00-tutorial/pre-${n}.webp`),
  );
  for (const path of shared) assertSameBytes(join(copyRoot, path), join(appRoot, path));
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

test("TA5: 체험판이 머무는 판의 u00 version · sha256이 체험판 핀 원문에 들어 있다", () => {
  const manifest = JSON.parse(readFileSync(at(`${TRIAL_U00_SOURCE}/manifest.json`), "utf8"));
  const u00 = manifest.episodes.find((entry) => entry.id === "u00-tutorial");
  assert.ok(u00, "매니페스트에 u00-tutorial이 없다");
  const pin = readFileSync(at("apps/landing/src/trial/trial-content.ts"), "utf8");
  assert.ok(pin.includes(`"${u00.version}"`), `핀에 version ${u00.version}이 없다`);
  assert.ok(pin.includes(`"${u00.sha256}"`), `핀에 sha256 ${u00.sha256}이 없다`);
});
