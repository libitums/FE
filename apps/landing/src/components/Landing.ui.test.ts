import { describe, expect, it } from "vitest";
import type { Language } from "../site";
import Landing from "./Landing.astro";
import { jsonLd, render, texts } from "./render.support";

const SITE = "https://example.test";
const languages: readonly Language[] = ["en", "ko"];

const renderLanding = (language: Language) => render(Landing, { props: { language }, site: SITE });

interface Graph {
  "@graph"?: {
    "@type": string;
    mainEntity?: { name: string; acceptedAnswer: { text: string } }[];
  }[];
}

describe("Landing", () => {
  it("UI-LD1 h1은 하나", async () => {
    for (const language of languages) {
      const { document } = await renderLanding(language);
      expect(document.querySelectorAll("h1")).toHaveLength(1);
    }
  });

  it("UI-LD9 장면 줄은 키보드로 닿는 이름 있는 스크롤 영역", async () => {
    for (const language of languages) {
      const { document } = await renderLanding(language);
      const rail = document.querySelector("#journey-rail");
      expect(rail?.getAttribute("tabindex")).toBe("0");
      expect(rail?.getAttribute("aria-labelledby")).toBe("journey-title");
      expect(document.querySelectorAll("#journey-title")).toHaveLength(1);
    }
  });

  it("UI-LD2 제목 단계가 건너뛰지 않는다", async () => {
    for (const language of languages) {
      const { document } = await renderLanding(language);
      const levels = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((node) =>
        Number(node.tagName.slice(1)),
      );
      expect(levels[0]).toBe(1);
      const jumps = levels.slice(1).map((level, index) => level - (levels[index] ?? 0));
      expect(Math.max(...jumps)).toBeLessThan(2);
      // FAQ가 그려졌을 때(h3 질문)만 이 검사가 FAQ를 포함한다.
      expect(document.querySelectorAll('[data-testid="faq-question"]').length).toBeGreaterThan(0);
    }
  });

  it("UI-LD3 메뉴와 섹션", async () => {
    for (const language of languages) {
      const { document } = await renderLanding(language);
      const hashes = [...document.querySelectorAll(".site-nav a")].map(
        (link) => link.getAttribute("href") ?? "",
      );
      expect(hashes).toHaveLength(4);
      expect(hashes[3]).toBe("#faq");
      for (const hash of hashes) {
        expect(hash.startsWith("#")).toBe(true);
        expect(document.getElementById(hash.slice(1)) !== null).toBe(true);
      }
    }
  });

  it("UI-LD4 섹션 순서 words → faq → download", async () => {
    const { document } = await renderLanding("en");
    const words = document.getElementById("words");
    const faq = document.getElementById("faq");
    const download = document.getElementById("download");
    expect(words).not.toBeNull();
    expect(faq).not.toBeNull();
    expect(download).not.toBeNull();
    const follows = (a: Element | null, b: Element | null) =>
      ((a?.compareDocumentPosition(b as Node) ?? 0) & 4) !== 0;
    expect(follows(words, faq)).toBe(true);
    expect(follows(faq, download)).toBe(true);
  });

  it("UI-LD5 화면 FAQ = JSON-LD FAQPage", async () => {
    for (const language of languages) {
      const { document } = await renderLanding(language);
      const questions = texts(document.querySelectorAll('[data-testid="faq-question"]'));
      const answers = texts(document.querySelectorAll('[data-testid="faq-answer"]'));
      expect(questions.length).toBeGreaterThan(0);
      const nodes = (jsonLd(document) as Graph[]).flatMap((data) => data["@graph"] ?? []);
      const page = nodes.find((node) => node["@type"] === "FAQPage");
      expect(page).toBeDefined();
      const entities = page?.mainEntity ?? [];
      expect({
        questions: entities.map((entity) => entity.name),
        answers: entities.map((entity) => entity.acceptedAnswer.text),
      }).toEqual({ questions, answers });
    }
  });

  it("UI-LD6 robots", async () => {
    for (const language of languages) {
      const { document } = await renderLanding(language);
      const robots = document.querySelectorAll('meta[name="robots"]');
      expect(robots).toHaveLength(1);
      const content = robots[0]?.getAttribute("content") ?? "";
      expect(content).toContain("max-image-preview:large");
      expect(content).not.toContain("noindex");
    }
  });

  it("UI-LD7 언어", async () => {
    const ko = await renderLanding("ko");
    expect(ko.document.documentElement.getAttribute("lang")).toBe("ko");
    const questions = texts(ko.document.querySelectorAll('[data-testid="faq-question"]'));
    expect(questions.length).toBeGreaterThan(0);
    for (const question of questions) expect(question).toMatch(/[가-힣]/);
  });

  it("UI-LD8 히어로 그림 preload 우선순위", async () => {
    const { document } = await renderLanding("en");
    const preloads = document.querySelectorAll('link[rel="preload"][as="image"]');
    expect(preloads).toHaveLength(1);
    expect(preloads[0]?.getAttribute("fetchpriority")).toBe("high");
    const hero = document.querySelector('img[fetchpriority="high"]');
    expect(hero).not.toBeNull();
    expect(preloads[0]?.getAttribute("href")).toBe(hero?.getAttribute("src"));
  });
});
