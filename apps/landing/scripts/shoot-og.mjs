// 공유 카드 그림(`public/og-<코드>.jpg`, 1200×630)을 빌드 결과에서 찍습니다 — README 「그림」의 수동 절차를 명령으로 옮긴 것입니다(ADR-0094 D6).
//
//   pnpm landing:build && node apps/landing/scripts/shoot-og.mjs vi id ms   # 코드를 주지 않으면 전부
//
// e2e의 정적 서버(`e2e/serve.mjs`)로 dist/를 빈 포트에 띄우고(Astro 7의 `astro preview`는 데몬으로 남아 쓰지 않습니다),
// 언어마다 히어로를 1200×630 뷰포트에서 찍습니다. 머리의 섹션 링크 · 언어 메뉴 · 받기 버튼과
// 히어로의 체험판 버튼 · 스크롤 안내는 CSS로 숨기고, `reducedMotion: "reduce"`로 스크롤 연출을 꺼서 세 패널이 모두 밝고 두 문장이 함께 보입니다.
// 찍은 뒤 public/에 쓰므로 다음 빌드부터 실립니다 — 문구 · 그림을 바꾸면 다시 찍습니다.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html이 없습니다 — 먼저 `pnpm landing:build`를 돌리세요.");
  process.exit(1);
}

// site.ts는 TS라 여기서 직접 읽지 않고, 산출물의 언어 폴더로 목록을 셉니다(기본 언어는 `/`).
const { readdirSync } = await import("node:fs");
const codes = readdirSync(dist, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^[a-z]{2}$/.test(entry.name))
  .map((entry) => entry.name);
const all = ["en", ...codes];
const wanted = process.argv.slice(2);
const targets = wanted.length > 0 ? wanted : all;
for (const code of targets) {
  if (!all.includes(code)) {
    console.error(`모르는 언어 코드 ${code} — 산출물에 있는 것: ${all.join(", ")}`);
    process.exit(1);
  }
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const port = await freePort();
const preview = spawn(process.execPath, [join(root, "e2e", "serve.mjs"), `${dist}:${port}`], {
  cwd: root,
  stdio: ["ignore", "inherit", "inherit"],
});
const origin = `http://127.0.0.1:${port}`;
for (let attempt = 0; ; attempt += 1) {
  try {
    const response = await fetch(`${origin}/`);
    if (response.ok) break;
  } catch {
    // 아직 안 떴다
  }
  if (attempt >= 50) {
    preview.kill();
    throw new Error("정적 서버가 5초 안에 뜨지 않았습니다.");
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const hide = `
  .site-nav, .lang-menu, [data-testid="header-cta"], .hero__trial, .hero__cue { display: none !important; }
`;

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  for (const code of targets) {
    const path = code === "en" ? "/" : `/${code}/`;
    await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: hide });
    await page.evaluate(() => document.fonts.ready);
    const file = join(root, "public", `og-${code}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 88, fullPage: false });
    console.log(`찍음 ${path} → public/og-${code}.jpg`);
  }
} finally {
  await browser.close();
  preview.kill();
}
