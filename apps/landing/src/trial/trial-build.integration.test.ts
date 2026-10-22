// 체험판 빌드 통합 — 실제 `astro build`를 임시 폴더로 돌려 env 검사 · 모델 주소 · 예산 · 자산 · 링크를 봅니다.
// 빌드는 describe마다 한 번(직렬)이고, 작업 트리의 dist/는 건드리지 않습니다.
// 산출 폴더는 앱 폴더 안(node_modules 아래)에 둡니다 — 앱 밖이면 Astro가 중간 산출물을 앱의 .astro/에 써서,
// 같은 때 도는 seo 빌드 테스트와 그 폴더를 두고 부딪칩니다.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { TrialPageData } from "../components/trial/trial-components.contract";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const astroBin = join(appDir, "node_modules", "astro", "bin", "astro.mjs");
const buildRoot = join(appDir, "node_modules", ".trial-build");
mkdirSync(buildRoot, { recursive: true });
const SUPABASE = "https://x.supabase.co";
const AUDIO_BASE = `${SUPABASE}/storage/v1/object/public/content/audio/`;

interface BuildResult {
  dir: string;
  status: number | null;
  output: string;
}

function runBuild(extra: Record<string, string>): BuildResult {
  const dir = mkdtempSync(join(buildRoot, "landing-trial-build-"));
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production", CI: "1" };
  for (const key of Object.keys(env)) {
    if (key.startsWith("VITEST") || key.startsWith("VERCEL")) delete env[key];
  }
  delete env.SITE_URL;
  delete env.PUBLIC_GA_MEASUREMENT_ID;
  delete env.PUBLIC_SUPABASE_URL;
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

const page = (build: BuildResult, file: string) => new JSDOM(read(build, file)).window.document;

function pageData(document: Document): TrialPageData {
  return JSON.parse(document.querySelector("#trial-model")?.textContent ?? "") as TrialPageData;
}

/** 모델 안의 음성 주소 전부(`audioUrl` · `…AudioUrl` 키). */
function audioUrlsOf(value: unknown): (string | null)[] {
  if (Array.isArray(value)) return value.flatMap(audioUrlsOf);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    /audioUrl$/i.test(key) && (inner === null || typeof inner === "string")
      ? [inner]
      : audioUrlsOf(inner),
  );
}

/** 페이지가 부르는 모듈 스크립트 바이트 — 인라인 모듈 + `_astro/*.js`와 그 정적 · 동적 import 전부. */
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

const TRIAL_PAGES = [
  { file: "try/index.html", language: "en" },
  { file: "ko/try/index.html", language: "ko" },
] as const;

describe("빌드 T-A — PUBLIC_SUPABASE_URL · SITE_URL 있음", () => {
  let build: BuildResult;
  beforeAll(() => {
    build = runBuild({ SITE_URL: "https://example.test", PUBLIC_SUPABASE_URL: SUPABASE });
  });
  afterAll(() => clean(build));

  it("IB0 빌드가 종료 0으로 끝난다", () => {
    expect(build.status === 0 ? "ok" : build.output).toBe("ok");
  });

  it("IB1 두 체험판 페이지 — html[lang] · trial-model JSON · noindex", () => {
    for (const { file, language } of TRIAL_PAGES) {
      const document = page(build, file);
      expect(document.documentElement.getAttribute("lang")).toBe(language);
      const data = pageData(document);
      expect(data.model.episodeId).toBe("u00-tutorial");
      expect(Object.keys(data.copy)).toHaveLength(18);
      const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
      expect(robots).toContain("noindex");
    }
  });

  it("IB2 sitemap에 /try/가 없다", () => {
    const maps = readdirSync(build.dir).filter((name) => /^sitemap.*\.xml$/.test(name));
    expect(maps.length).toBeGreaterThan(0);
    for (const name of maps) expect(read(build, name)).not.toContain("/try/");
  });

  it("IB3 모델의 음성 주소가 전부 버킷 audio/ 아래", () => {
    for (const { file } of TRIAL_PAGES) {
      const urls = audioUrlsOf(pageData(page(build, file)).model);
      const present = urls.filter((url): url is string => url !== null);
      expect(present.length).toBeGreaterThanOrEqual(13);
      for (const url of present) expect(url.startsWith(AUDIO_BASE), url).toBe(true);
    }
  });

  it("IB5 스크립트 예산 ≤ 40,000 bytes · zod · 디코더 흔적 없음", () => {
    const { bytes, text } = scriptBytes(build, read(build, "try/index.html"));
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThanOrEqual(40_000);
    expect(text).not.toContain("_zod");
    expect(text).not.toContain("schema-mismatch");
  });

  it("IB6 그림 10이 _astro/에 해시 파일로 · 효과음 5가 trial/sfx/에", () => {
    const assets = readdirSync(join(build.dir, "_astro"));
    const images = [
      "pre-1",
      "pre-2",
      "pre-3",
      "pre-4",
      "pre-5",
      "pre-6",
      "post-1",
      "post-2",
      "cult-u00-jalhasineyo",
      "hello",
    ];
    for (const name of images) {
      expect(
        assets.some((asset) => asset.startsWith(`${name}.`) && asset.endsWith(".webp")),
        `${name}.*.webp`,
      ).toBe(true);
    }
    const sfx = readdirSync(join(build.dir, "trial", "sfx")).sort();
    expect(sfx).toEqual(
      ["button", "correct_answer", "lesson_complete", "pass_lesson", "wrong_answer"].map(
        (name) => `${name}.mp3`,
      ),
    );
  });

  it("IB7 랜딩 / · /ko/의 체험판 링크", () => {
    for (const [file, href] of [
      ["index.html", "/try/"],
      ["ko/index.html", "/ko/try/"],
    ] as const) {
      const document = page(build, file);
      for (const id of ["hero-trial-link", "download-trial-link"]) {
        const links = [...document.querySelectorAll(`[data-testid="${id}"]`)];
        expect(
          links.map((link) => link.getAttribute("href")),
          `${file} ${id}`,
        ).toEqual([href]);
      }
    }
  });
});

describe("빌드 T-B — 프리뷰 · 음성 env 없음", () => {
  let build: BuildResult;
  beforeAll(() => {
    build = runBuild({ VERCEL_ENV: "preview" });
  });
  afterAll(() => clean(build));

  it("IB3 빌드는 되고 모델의 음성 주소가 전부 null", () => {
    expect(build.status === 0 ? "ok" : build.output).toBe("ok");
    const urls = audioUrlsOf(pageData(page(build, "try/index.html")).model);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url === null)).toBe(true);
  });
});

describe("IB4 음성 env 검사", () => {
  const builds: BuildResult[] = [];
  afterAll(() => builds.forEach(clean));

  it("PUBLIC_SUPABASE_URL=http://x → 빌드 실패", () => {
    const build = runBuild({ VERCEL_ENV: "preview", PUBLIC_SUPABASE_URL: "http://x" });
    builds.push(build);
    expect(build.status).not.toBe(0);
    expect(build.output).toContain("PUBLIC_SUPABASE_URL");
  });

  it("VERCEL_ENV=production + 없음 → 빌드 실패", () => {
    const build = runBuild({
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "duru.vercel.app",
    });
    builds.push(build);
    expect(build.status).not.toBe(0);
    expect(build.output).toContain("PUBLIC_SUPABASE_URL");
  });
});
