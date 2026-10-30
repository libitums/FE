// Airbridge Web SDK 빌드 통합 — 실제 `astro build`를 임시 폴더로 돌려 토큰 · 배포 환경별 산출물을 봅니다.
// 산출 폴더는 앱 폴더 안(node_modules 아래)에 둡니다 — 다른 빌드 테스트와 중간 산출물이 부딪치지 않게.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const astroBin = join(appDir, "node_modules", "astro", "bin", "astro.mjs");
const buildRoot = join(appDir, "node_modules", ".airbridge-build");
const TOKEN = "e2e-test-web-token-0000000000";
const SITE = "https://example.test";
const SUPABASE = "https://x.supabase.co";
const ANON_KEY = "sb_publishable_build_test_key_0000";
const PAGES = ["index.html", "ko/index.html"] as const;
const OTHER_PAGES = ["404.html", "try/index.html", "ko/try/index.html"] as const;

interface BuildResult {
  dir: string;
  status: number | null;
  output: string;
}

function runBuild(name: string, extra: Record<string, string>): BuildResult {
  const parent = join(buildRoot, name);
  mkdirSync(parent, { recursive: true });
  const dir = mkdtempSync(join(parent, "landing-airbridge-build-"));
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production", CI: "1" };
  for (const key of Object.keys(env)) {
    if (key.startsWith("VITEST") || key.startsWith("VERCEL")) delete env[key];
  }
  delete env.SITE_URL;
  delete env.PUBLIC_GA_MEASUREMENT_ID;
  delete env.PUBLIC_SUPABASE_URL;
  delete env.PUBLIC_SUPABASE_ANON_KEY;
  delete env.PUBLIC_AIRBRIDGE_WEB_TOKEN;
  Object.assign(env, extra);
  const result = spawnSync(process.execPath, [astroBin, "build", "--outDir", dir], {
    cwd: appDir,
    env,
    encoding: "utf8",
    timeout: 100_000,
  });
  return { dir, status: result.status, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

const clean = (build: BuildResult | undefined) => {
  if (build) rmSync(build.dir, { recursive: true, force: true });
};

function read(build: BuildResult, file: string): string {
  expect(existsSync(join(build.dir, file)), `${file} 이(가) 산출 폴더에 있어야 한다`).toBe(true);
  return readFileSync(join(build.dir, file), "utf8");
}

const documentOf = (build: BuildResult, file: string) =>
  new JSDOM(read(build, file)).window.document;

/** `_astro/`의 자바스크립트 파일 이름. */
function astroScripts(build: BuildResult): string[] {
  const dir = join(build.dir, "_astro");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".js"));
}

/** 인라인 부트스트랩(모듈이 아닌 inline script 중 `airbridge.init(`이 든 것)의 본문들. */
function bootstrapsOf(document: Document): string[] {
  return [...document.querySelectorAll("script:not([src]):not([type='module'])")]
    .map((node) => node.textContent ?? "")
    .filter((text) => text.includes("airbridge.init("));
}

/**
 * Airbridge 모듈 스크립트의 바이트 — `openDeeplink`를 담은 인라인 모듈 + `_astro/*.js`와 그 정적 import 전부.
 * 랜딩의 다른 모듈(스크롤 연출 · GA 결선)은 이 예산 밖이라 세지 않습니다.
 */
function scriptBytes(build: BuildResult, html: string): { bytes: number; text: string } {
  const document = new JSDOM(html).window.document;
  const pending: string[] = [];
  let bytes = 0;
  let text = "";
  for (const script of document.querySelectorAll('script[type="module"]')) {
    const src = script.getAttribute("src");
    if (src) pending.push(src.replace(/^\//, ""));
    else {
      const inline = script.textContent ?? "";
      if (!inline.includes("openDeeplink")) continue;
      bytes += Buffer.byteLength(inline);
      text += inline;
    }
  }
  const seen = new Set<string>();
  while (pending.length > 0) {
    const file = pending.pop() as string;
    if (seen.has(file) || !file.startsWith("_astro/")) continue;
    seen.add(file);
    const source = read(build, file);
    bytes += Buffer.byteLength(source);
    text += source;
    for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["'](\.\/[^"']+\.js)["']/g)) {
      pending.push(join("_astro", (match[1] as string).slice(2)));
    }
  }
  return { bytes, text };
}

function expectNoAirbridge(build: BuildResult, files: readonly string[]) {
  for (const file of files) {
    const html = read(build, file);
    expect(html, file).not.toMatch(/airbridge/i);
    expect(html, file).not.toContain("duru://");
  }
}

describe("빌드 AB-A — 토큰 없음", () => {
  let build: BuildResult;
  beforeAll(() => {
    build = runBuild("none", { SITE_URL: SITE });
  });
  afterAll(() => clean(build));

  it("I-AB1 종료 0 · 모든 산출물에 Airbridge 흔적 없음 · Play 카드는 그대로", () => {
    expect(build.status === 0 ? "ok" : build.output).toBe("ok");
    expectNoAirbridge(build, [...PAGES, ...OTHER_PAGES]);
    for (const name of astroScripts(build)) {
      const source = read(build, join("_astro", name));
      expect(source, name).not.toMatch(/airbridge/i);
      expect(source, name).not.toContain("duru://");
    }
    const document = documentOf(build, "index.html");
    expect(document.querySelectorAll("h1").length).toBeGreaterThan(0);
    expect(
      document.querySelectorAll('a[data-store="android"][href^="https://play.google.com/"]'),
    ).toHaveLength(1);
  });
});

describe("빌드 AB-B — 토큰 있음", () => {
  let build: BuildResult;
  beforeAll(() => {
    build = runBuild("token", { SITE_URL: SITE, PUBLIC_AIRBRIDGE_WEB_TOKEN: TOKEN });
  });
  afterAll(() => clean(build));

  it("I-AB2 부트스트랩 · init 옵션 · 모듈 스크립트 · 예산", () => {
    expect(build.status === 0 ? "ok" : build.output).toBe("ok");
    for (const file of PAGES) {
      const html = read(build, file);
      const bootstraps = bootstrapsOf(documentOf(build, file));
      expect(bootstraps, file).toHaveLength(1);
      const body = bootstraps[0] as string;
      expect(body.split("static.airbridge.io"), file).toHaveLength(2);
      expect(body.split("airbridge.init("), file).toHaveLength(2);
      for (const piece of [
        '"app":"duru"',
        `"webToken":"${TOKEN}"`,
        '"utmParsing":true',
        '"defaultChannel":"k-duru.com"',
        '"autoStartTrackingEnabled":false',
      ]) {
        expect(body, `${file} ${piece}`).toContain(piece);
      }
      expect(Buffer.byteLength(body), file).toBeLessThanOrEqual(6_000);

      const modules = scriptBytes(build, html);
      for (const word of ["openDeeplink", "duru://journey", "startTracking"]) {
        expect(modules.text, `${file} ${word}`).toContain(word);
      }
      expect(modules.text, file).not.toContain("static.airbridge.io");
      expect(modules.bytes, file).toBeLessThanOrEqual(4_000);
    }
    for (const file of OTHER_PAGES) {
      expect(read(build, file), file).not.toMatch(/airbridge/i);
    }
  });
});

describe("빌드 AB-C — 토큰 있음 · 프리뷰", () => {
  let build: BuildResult;
  beforeAll(() => {
    build = runBuild("preview", {
      PUBLIC_AIRBRIDGE_WEB_TOKEN: TOKEN,
      VERCEL_ENV: "preview",
      VERCEL_PROJECT_PRODUCTION_URL: "duru.vercel.app",
    });
  });
  afterAll(() => clean(build));

  it("I-AB3 프리뷰는 토큰이 있어도 Airbridge를 싣지 않는다", () => {
    expect(build.status === 0 ? "ok" : build.output).toBe("ok");
    expectNoAirbridge(build, [...PAGES, ...OTHER_PAGES]);
    expect(documentOf(build, "index.html").querySelectorAll("h1").length).toBeGreaterThan(0);
  });
});

describe("빌드 AB-D — 토큰 모양 검사 · 프로덕션 선택 값", () => {
  const builds: BuildResult[] = [];
  afterAll(() => builds.forEach(clean));

  it.each(["bad token!", "short-1"])(
    "I-AB4 토큰 %j → 빌드 실패 · 이름만 말하고 값은 숨김",
    (bad) => {
      const build = runBuild("bad", { SITE_URL: SITE, PUBLIC_AIRBRIDGE_WEB_TOKEN: bad });
      builds.push(build);
      expect(build.status).not.toBe(0);
      expect(build.output).toContain("PUBLIC_AIRBRIDGE_WEB_TOKEN");
      expect(build.output).not.toContain(bad);
    },
  );

  it("I-AB5 프로덕션 + 토큰 없음 → 빌드는 되고 Airbridge 흔적 없음", () => {
    const build = runBuild("production", {
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "duru.vercel.app",
      PUBLIC_SUPABASE_URL: SUPABASE,
      PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
    });
    builds.push(build);
    expect(build.status === 0 ? "ok" : build.output).toBe("ok");
    expectNoAirbridge(build, [...PAGES, ...OTHER_PAGES]);
  });
});
