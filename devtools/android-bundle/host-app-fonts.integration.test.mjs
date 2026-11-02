// Android 앱 글꼴 결선 검사(AF-W1 · AF-W2, ADR-0092). `app.css`의 `@font-face`가 가리키는 경로가 실제로 호스트가
// 복사하는 자리와 맞는지 정적으로 본다 — 패키지(`build.gradle`의 applicationId) · 파일(`AppFonts.FILES` · `assets/fonts/`).
// 어긋나면 기기에서 조용히 기본 글꼴로 떨어지므로 여기서 잡는다. pnpm test:android-bundle / pnpm verify에서 돈다.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const css = readFileSync(join(root, "apps/mobile/src/app/app.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);
const gradle = readFileSync(join(root, "apps/android/app/build.gradle"), "utf8");
const appFonts = readFileSync(
  join(root, "apps/android/app/src/main/java/com/libitum/host/AppFonts.java"),
  "utf8",
);
const assetsDir = join(root, "apps/android/app/src/main/assets/fonts");

const faces = [
  ...css.matchAll(/local\(file:\/\/\/data\/data\/([^/]+)\/files\/fonts\/([^)]+)\)/g),
].map(([, pkg, file]) => ({ pkg, file }));
const applicationId = gradle.match(/applicationId\s+'([^']+)'/)?.[1];
const copied = [
  ...(appFonts.match(/FILES\s*=\s*\{([^}]*)\}/)?.[1] ?? "").matchAll(/"([^"]+)"/g),
].map(([, file]) => file);

test("AF-W1: @font-face 경로의 패키지는 applicationId와 같다", () => {
  assert.ok(faces.length > 0, "app.css에 local(file:///data/data/…) @font-face가 없다");
  for (const face of faces) assert.equal(face.pkg, applicationId, face.file);
});

test("AF-W2: @font-face가 가리키는 파일은 AppFonts가 복사하고 assets/fonts에 있다", () => {
  for (const face of faces) {
    assert.ok(copied.includes(face.file), `AppFonts.FILES에 ${face.file}이 없다`);
    assert.ok(existsSync(join(assetsDir, face.file)), `assets/fonts/${face.file}이 없다`);
  }
});
