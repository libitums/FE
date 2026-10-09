import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// 실제 `astro build`를 임시 폴더로 돌려 env → 설정 → Astro.site → 산출물 경계를 봅니다.
// describe마다 자기 빌드를 한 번만 돌리고(직렬), 작업 트리의 dist/는 건드리지 않습니다.

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const astroBin = join(appDir, "node_modules", "astro", "bin", "astro.mjs");
const origin = "https://example.test";
const crawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
];

interface BuildResult {
  dir: string;
  status: number | null;
  output: string;
}

function runBuild(
  siteUrl: string | undefined,
  measurementId?: string,
  extra: Record<string, string> = {},
): BuildResult {
  const dir = mkdtempSync(join(tmpdir(), "landing-seo-build-"));
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production", CI: "1" };
  for (const key of Object.keys(env)) if (key.startsWith("VITEST")) delete env[key];
  delete env.SITE_URL;
  if (siteUrl !== undefined) env.SITE_URL = siteUrl;
  delete env.PUBLIC_GA_MEASUREMENT_ID;
  if (measurementId !== undefined) env.PUBLIC_GA_MEASUREMENT_ID = measurementId;
  for (const key of Object.keys(env)) if (key.startsWith("VERCEL")) delete env[key];
  Object.assign(env, extra);
  const result = spawnSync(process.execPath, [astroBin, "build", "--outDir", dir], {
    cwd: appDir,
    env,
    encoding: "utf8",
    timeout: 100_000,
  });
  return {
    dir,
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

const clean = (build: BuildResult | undefined) => {
  if (build) rmSync(build.dir, { recursive: true, force: true });
};

const has = (build: BuildResult, file: string) => existsSync(join(build.dir, file));

/** 파일이 없으면 ENOENT가 아니라 단언 실패로 끝납니다. */
function read(build: BuildResult, file: string): string {
  expect(has(build, file), `${file} 이(가) 산출 폴더에 있어야 한다`).toBe(true);
  return readFileSync(join(build.dir, file), "utf8");
}

function page(build: BuildResult, file: string): Document {
  return new JSDOM(read(build, file)).window.document;
}

const attr = (document: Document, selector: string, name: string): string[] =>
  [...document.querySelectorAll(selector)].map((node) => node.getAttribute(name) ?? "");

const texts = (document: Document, selector: string): string[] =>
  [...document.querySelectorAll(selector)].map((node) => node.textContent ?? "");

const pages = [
  { file: "index.html", language: "en", path: "/", image: "og-en.jpg" },
  { file: "ko/index.html", language: "ko", path: "/ko/", image: "og-ko.jpg" },
] as const;

interface JsonLdNode {
  "@type": string;
  inLanguage?: string;
  description?: string;
  url?: string;
  mainEntity?: { name: string; acceptedAnswer: { text: string } }[];
}

function graphOf(document: Document): JsonLdNode[] {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  expect(scripts).toHaveLength(1);
  const data = JSON.parse(scripts[0]?.textContent ?? "") as { "@graph": JsonLdNode[] };
  return data["@graph"];
}

const faqPage = (nodes: JsonLdNode[]) => {
  const node = nodes.find((candidate) => candidate["@type"] === "FAQPage");
  expect(node).toBeDefined();
  return node as JsonLdNode;
};

const screenFaq = (document: Document) => ({
  questions: texts(document, '[data-testid="faq-question"]'),
  answers: texts(document, '[data-testid="faq-answer"]'),
});

const robotsGroup = (robots: string, agent: string): string[] | undefined =>
  robots
    .split(/\r?\n\r?\n/)
    .map((block) => block.split(/\r?\n/).filter((line) => line.trim() !== ""))
    .find((lines) => lines.includes(`User-agent: ${agent}`));

/** llms.txt의 `### 질문` 다음 빈 줄 뒤 한 단락을 답으로 읽습니다. */
function llmsFaq(text: string): { question: string; answer: string }[] {
  const section = text.split(/^## FAQ\s*$/m)[1] ?? "";
  return section
    .split(/^### /m)
    .slice(1)
    .map((block) => {
      const [question = "", ...rest] = block.split(/\r?\n/);
      return { question: question.trim(), answer: rest.join("\n").trim() };
    });
}

function headingLevels(document: Document): number[] {
  return [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((node) =>
    Number(node.tagName.slice(1)),
  );
}

describe("빌드 A — SITE_URL 있음", () => {
  let build: BuildResult;
  beforeAll(() => {
    build = runBuild(origin);
  });
  afterAll(() => clean(build));

  it("I-A0 빌드가 종료 0으로 끝난다", () => {
    expect(build.status === 0 ? "ok" : build.output).toBe("ok");
  });

  it("I-A1 JSON-LD가 페이지마다 하나, @graph가 세 타입", () => {
    for (const { file } of pages) {
      const types = graphOf(page(build, file)).map((node) => node["@type"]);
      expect(types).toEqual(["WebSite", "SoftwareApplication", "FAQPage"]);
    }
  });

  it("I-A2 inLanguage가 페이지 언어이고 /ko/는 한글 설명 · FAQ", () => {
    for (const { file, language } of pages) {
      const nodes = graphOf(page(build, file));
      expect(nodes.map((node) => node.inLanguage)).toEqual([language, language, language]);
    }
    const ko = graphOf(page(build, "ko/index.html"));
    const hangul = /[가-힣]/;
    const described = ko.find((node) => node["@type"] === "SoftwareApplication");
    expect(described?.description).toMatch(hangul);
    for (const entry of faqPage(ko).mainEntity ?? []) {
      expect(entry.name).toMatch(hangul);
      expect(entry.acceptedAnswer.text).toMatch(hangul);
    }
  });

  it("I-A3 화면 FAQ와 FAQPage의 질문 · 답이 같다", () => {
    for (const { file } of pages) {
      const document = page(build, file);
      const entries = faqPage(graphOf(document)).mainEntity ?? [];
      expect(entries.length).toBeGreaterThan(0);
      const shown = screenFaq(document);
      expect(shown.questions).toEqual(entries.map((entry) => entry.name));
      expect(shown.answers).toEqual(entries.map((entry) => entry.acceptedAnswer.text));
    }
  });

  it("I-A4 canonical과 og:url이 페이지 주소", () => {
    for (const { file, path } of pages) {
      const document = page(build, file);
      expect(attr(document, 'link[rel="canonical"]', "href")).toEqual([origin + path]);
      expect(attr(document, 'meta[property="og:url"]', "content")).toEqual([origin + path]);
    }
  });

  it("I-A5 hreflang이 en · ko · x-default, x-default는 /", () => {
    for (const { file } of pages) {
      const document = page(build, file);
      const links = [...document.querySelectorAll("link[rel=alternate][hreflang]")];
      const byLang = Object.fromEntries(
        links.map((link) => [link.getAttribute("hreflang"), link.getAttribute("href")]),
      );
      expect(links).toHaveLength(3);
      expect(Object.keys(byLang).sort()).toEqual(["en", "ko", "x-default"]);
      for (const href of Object.values(byLang)) expect(String(href).startsWith(origin)).toBe(true);
      expect(byLang["x-default"]).toBe(`${origin}/`);
      expect(byLang.en).toBe(`${origin}/`);
      expect(byLang.ko).toBe(`${origin}/ko/`);
    }
  });

  it("I-A6 og:image · twitter:image가 절대 주소이고 그 파일이 산출물에 있다", () => {
    for (const { file, image } of pages) {
      const document = page(build, file);
      expect(attr(document, 'meta[property="og:image"]', "content")).toEqual([
        `${origin}/${image}`,
      ]);
      expect(attr(document, 'meta[name="twitter:image"]', "content")).toEqual([
        `${origin}/${image}`,
      ]);
      expect(has(build, image), `${image} 이(가) 산출 폴더에 있어야 한다`).toBe(true);
    }
  });

  it("I-A7 sitemap-index.xml이 있고 robots.txt가 그것을 가리킨다", () => {
    expect(has(build, "sitemap-index.xml")).toBe(true);
    const robots = read(build, "robots.txt");
    const lines = robots.split(/\r?\n/).filter((line) => line.startsWith("Sitemap:"));
    expect(lines).toEqual([`Sitemap: ${origin}/sitemap-index.xml`]);
  });

  it("I-A8 sitemap의 loc이 두 페이지뿐이고 404가 없다", () => {
    const index = read(build, "sitemap-index.xml");
    const target = /<loc>([^<]+)<\/loc>/.exec(index)?.[1];
    expect(target).toBeDefined();
    const sitemap = read(build, new URL(target as string).pathname.replace(/^\//, ""));
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs.sort()).toEqual([`${origin}/`, `${origin}/ko/`]);
    expect(sitemap).not.toContain("404");
  });

  it("I-A9 llms.txt의 머리 · 요약 · 링크", () => {
    const lines = read(build, "llms.txt").split(/\r?\n/);
    expect(lines[0]).toBe("# Duru");
    expect(lines.filter((line) => line.startsWith("> "))).toHaveLength(1);
    const text = lines.join("\n");
    expect(text).toContain(`(${origin}/)`);
    expect(text).toContain(`(${origin}/ko/)`);
  });

  it("I-A19 서체를 밖에서 받지 않고 산출물에 함께 싣는다", () => {
    for (const { file } of pages) {
      const document = page(build, file);
      const hrefs = attr(document, "link[href]", "href");
      expect(hrefs.length).toBeGreaterThan(0);
      expect(
        hrefs.filter((href) => /fonts\.g(oogleapis|static)\.com|cdn\.jsdelivr\.net/.test(href)),
      ).toEqual([]);
      // 스타일은 HTML에 들어 있거나(inline) 같은 산출물의 파일로 나옵니다 — 둘 다 봅니다.
      const css = [
        ...texts(document, "style"),
        ...attr(document, 'link[rel="stylesheet"]', "href")
          .filter((href) => href.startsWith("/"))
          .map((href) => read(build, href.slice(1))),
      ].join("\n");
      expect(css).toContain("Jost Variable");
      expect(css).toContain("Pretendard Variable");
      expect(css).not.toMatch(/url\((["']?)https?:/);
    }
  });

  it("I-A20 밖으로 나가는 새 창 링크는 noopener와 noreferrer를 갖는다", () => {
    for (const { file } of pages) {
      const rels = attr(page(build, file), 'a[target="_blank"]', "rel");
      expect(rels.length).toBeGreaterThan(0);
      for (const rel of rels) {
        expect(rel.split(/\s+/)).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
      }
    }
  });

  it("I-A18 llms.txt는 영어로만 쓴다", () => {
    const text = read(build, "llms.txt");
    // 다른 언어의 페이지도 영어 이름으로 가리킵니다 — 본문에 한글이 없어 응답의 charset에 기대지 않습니다.
    expect(text).toContain(`(${origin}/ko/): Korean`);
    expect(text).not.toMatch(/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/);
  });

  it("I-A10 llms.txt의 FAQ가 / 화면 FAQ와 같다", () => {
    const shown = screenFaq(page(build, "index.html"));
    const entries = llmsFaq(read(build, "llms.txt"));
    expect(shown.questions.length).toBeGreaterThan(0);
    expect(entries).toHaveLength(shown.questions.length);
    expect(entries.map((entry) => entry.question)).toEqual(shown.questions);
    expect(entries.map((entry) => entry.answer)).toEqual(shown.answers);
  });

  it("I-A11 robots.txt가 * 와 여섯 수집기를 Allow: / 로 허용한다", () => {
    const robots = read(build, "robots.txt");
    for (const agent of ["*", ...crawlers]) {
      const group = robotsGroup(robots, agent);
      expect(group, `${agent} 묶음이 있어야 한다`).toBeDefined();
      expect(group).toContain("Allow: /");
      expect(group?.some((line) => /^Disallow/i.test(line))).toBe(false);
    }
  });

  it("I-A12 404.html은 noindex · 홈 링크 /, canonical 없음", () => {
    const document = page(build, "404.html");
    expect(attr(document, 'meta[name="robots"]', "content")).toEqual(["noindex"]);
    expect(attr(document, '[data-testid="not-found-home"]', "href")).toEqual(["/"]);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(0);
  });

  it("I-A13 h1이 하나이고 제목 단계가 건너뛰지 않는다", () => {
    for (const file of ["index.html", "ko/index.html", "404.html"]) {
      const levels = headingLevels(page(build, file));
      expect(levels.filter((level) => level === 1)).toHaveLength(1);
      expect(levels[0]).toBe(1);
      const jumps = levels.filter((level, at) => at > 0 && level > (levels[at - 1] ?? 0) + 1);
      expect(jumps).toEqual([]);
    }
  });

  it("I-A14 스토어 주소가 비었으면 where 답이 출시 전을 말한다", () => {
    const marker = { en: "not released yet", ko: "출시 전" } as const;
    for (const { file, language } of pages) {
      const answer = page(build, file).querySelector(
        '[data-faq-id="where"] [data-testid="faq-answer"]',
      );
      expect(answer, `${file} where 답`).not.toBeNull();
      expect(answer?.textContent).toContain(marker[language]);
    }
  });

  it("I-A15 FAQ 항목은 details이고 답이 HTML에 이미 들어 있다", () => {
    for (const { file } of pages) {
      const items = [...page(build, file).querySelectorAll('[data-testid="faq-item"]')];
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.tagName).toBe("DETAILS");
        const answer = item.querySelector('[data-testid="faq-answer"]');
        expect((answer?.textContent ?? "").trim()).not.toBe("");
      }
    }
  });

  it("I-A16 히어로 그림 속성이 산출물에 그대로", () => {
    for (const { file } of pages) {
      const document = page(build, file);
      const images = ["0", "1", "2"].map((panel) => {
        const found = document.querySelectorAll(`[data-panel="${panel}"] img`);
        expect(found).toHaveLength(1);
        return found[0] as Element;
      });
      expect(images[0]?.getAttribute("fetchpriority")).toBe("high");
      expect(images[1]?.getAttribute("loading")).toBe("lazy");
      expect(images[2]?.getAttribute("loading")).toBe("lazy");
    }
  });

  it("I-A17 robots 메타 · twitter · og 보조 태그", () => {
    for (const { file } of pages) {
      const document = page(build, file);
      expect(attr(document, 'meta[name="robots"]', "content")[0]).toContain(
        "max-image-preview:large",
      );
      for (const selector of [
        'meta[name="twitter:title"]',
        'meta[name="twitter:description"]',
        'meta[property="og:image:alt"]',
        'meta[property="og:locale:alternate"]',
      ]) {
        const content = attr(document, selector, "content");
        expect(content.length, `${file} ${selector}`).toBeGreaterThan(0);
        expect(content.every((value) => value.trim() !== "")).toBe(true);
      }
    }
  });
});

describe("빌드 B — SITE_URL 없음", () => {
  let build: BuildResult;
  beforeAll(() => {
    build = runBuild(undefined);
  });
  afterAll(() => clean(build));

  it("I-B1 종료 0, 산출물이 모두 있다", () => {
    expect(build.status === 0 ? "ok" : build.output).toBe("ok");
    const files = ["index.html", "ko/index.html", "404.html", "robots.txt", "llms.txt"];
    expect(files.filter((file) => !has(build, file))).toEqual([]);
  });

  it("I-B2 절대 주소 태그가 없다", () => {
    for (const { file } of pages) {
      const document = page(build, file);
      // 랜딩 페이지가 실제로 그려졌다는 긍정 단언이 먼저입니다.
      expect(document.querySelectorAll("h1")).toHaveLength(1);
      expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
      for (const selector of [
        'link[rel="canonical"]',
        "link[hreflang]",
        'meta[property="og:url"]',
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
      ]) {
        expect(document.querySelectorAll(selector), `${file} ${selector}`).toHaveLength(0);
      }
    }
  });

  it("I-B3 sitemap-index.xml도 robots.txt의 Sitemap도 없다", () => {
    const robots = read(build, "robots.txt");
    expect(robotsGroup(robots, "*")).toContain("Allow: /");
    expect(has(build, "sitemap-index.xml")).toBe(false);
    expect(robots).not.toMatch(/sitemap/i);
  });

  it("I-B4 JSON-LD는 하나씩, 세 타입, url 없음", () => {
    for (const { file } of pages) {
      const nodes = graphOf(page(build, file));
      expect(nodes.map((node) => node["@type"])).toEqual([
        "WebSite",
        "SoftwareApplication",
        "FAQPage",
      ]);
      for (const node of nodes) expect(node).not.toHaveProperty("url");
    }
  });

  it("I-B5 llms.txt 링크가 상대 주소", () => {
    const text = read(build, "llms.txt");
    const lines = text.split(/\r?\n/);
    expect(lines[0]).toBe("# Duru");
    expect(lines.filter((line) => line.startsWith("> "))).toHaveLength(1);
    expect(text).toContain("](/)");
    expect(text).toContain("](/ko/)");
    expect(text).not.toContain("https://");
    const shown = screenFaq(page(build, "index.html"));
    expect(llmsFaq(text).map((entry) => entry.question)).toEqual(shown.questions);
  });

  it("I-B6 화면 FAQ와 FAQPage가 주소와 무관하게 같다", () => {
    for (const { file } of pages) {
      const document = page(build, file);
      const entries = faqPage(graphOf(document)).mainEntity ?? [];
      expect(entries.length).toBeGreaterThan(0);
      const shown = screenFaq(document);
      expect(shown.questions).toEqual(entries.map((entry) => entry.name));
      expect(shown.answers).toEqual(entries.map((entry) => entry.acceptedAnswer.text));
    }
  });
});

describe("빌드 C — 틀린 SITE_URL", () => {
  const cases = [
    { id: "I-C1", value: "example.test" },
    { id: "I-C2", value: "http://example.test" },
    { id: "I-C3", value: "https://example.test/app" },
  ];

  for (const { id, value } of cases) {
    it(`${id} SITE_URL=${value}: 종료 ≠ 0, 출력에 이름과 받은 값`, () => {
      const build = runBuild(value);
      try {
        expect(build.status).not.toBe(0);
        expect(build.output).toContain("SITE_URL");
        expect(build.output).toContain(value);
      } finally {
        clean(build);
      }
    });
  }
});

describe("빌드 D — GA4 측정 ID", () => {
  it("I-D1 측정 ID가 있으면 두 언어 페이지에 gtag가 실리고 404에는 없다", () => {
    const build = runBuild(origin, "G-AB12CD34EF");
    try {
      expect(build.status, build.output).toBe(0);
      for (const { file } of pages) {
        const html = read(build, file);
        expect(html).toContain("https://www.googletagmanager.com/gtag/js?id=G-AB12CD34EF");
        expect(html).toContain('gtag("config","G-AB12CD34EF")');
      }
      expect(read(build, "404.html")).not.toContain("googletagmanager");
    } finally {
      clean(build);
    }
  });

  it("I-D2 측정 ID가 없으면 어느 페이지에도 gtag가 없다", () => {
    const build = runBuild(origin);
    try {
      expect(build.status, build.output).toBe(0);
      for (const { file } of pages) {
        expect(read(build, file)).toContain("<h1");
        expect(read(build, file)).not.toContain("googletagmanager");
      }
    } finally {
      clean(build);
    }
  });

  it("I-D3 측정 ID 모양이 틀리면 빌드가 실패하고 무엇이 틀렸는지 말한다", () => {
    const build = runBuild(origin, "UA-12345-1");
    try {
      expect(build.status).not.toBe(0);
      expect(build.output).toContain("PUBLIC_GA_MEASUREMENT_ID");
      expect(build.output).toContain("UA-12345-1");
    } finally {
      clean(build);
    }
  });
});

describe("빌드 E — Vercel 배포 환경", () => {
  it("I-E1 프리뷰 배포는 색인에서 빠지고 canonical · sitemap이 없다", () => {
    const build = runBuild(origin, undefined, {
      VERCEL_ENV: "preview",
      VERCEL_PROJECT_PRODUCTION_URL: "duru.vercel.app",
    });
    try {
      expect(build.status, build.output).toBe(0);
      for (const { file } of pages) {
        const document = page(build, file);
        expect(document.querySelectorAll("h1")).toHaveLength(1);
        expect(attr(document, 'meta[name="robots"]', "content")).toEqual(["noindex"]);
        expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(0);
      }
      expect(has(build, "sitemap-index.xml")).toBe(false);
      const robots = read(build, "robots.txt");
      expect(robots).toContain("User-agent: *\nDisallow: /");
      expect(robots).not.toContain("Allow: /");
    } finally {
      clean(build);
    }
  });

  it("I-E2 프로덕션 배포는 SITE_URL이 없어도 프로젝트 주소로 canonical · sitemap을 낸다", () => {
    const build = runBuild(undefined, undefined, {
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "duru.vercel.app",
    });
    try {
      expect(build.status, build.output).toBe(0);
      const document = page(build, "index.html");
      expect(attr(document, 'link[rel="canonical"]', "href")).toEqual(["https://duru.vercel.app/"]);
      expect(attr(document, 'meta[name="robots"]', "content")[0]).toContain("index");
      expect(read(build, "robots.txt")).toContain(
        "Sitemap: https://duru.vercel.app/sitemap-index.xml",
      );
    } finally {
      clean(build);
    }
  });
});
