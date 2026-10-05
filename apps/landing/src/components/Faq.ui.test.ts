import { beforeAll, describe, expect, it } from "vitest";
import { en } from "../i18n/copy";
import type { FaqEntry } from "../seo/seo.contract";
import Faq from "./Faq.astro";
import { plain, render, texts } from "./render.support";

const entries: readonly FaqEntry[] = [
  { id: "what", question: "What’s Duru?", answer: "Duru is a “story” app & more." },
  { id: "who", question: 'Who is it for "really"?', answer: "Learners of Korean." },
  { id: "where", question: "Where?", answer: "Not released yet. Check back." },
];

const items = (document: Document) => [...document.querySelectorAll('[data-testid="faq-item"]')];

describe("Faq", () => {
  let html: string;
  let document: Document;

  beforeAll(async () => {
    ({ html, document } = await render(Faq, { props: { t: en, entries } }));
  });

  it("UI-FQ1 뼈대", () => {
    const sections = document.querySelectorAll(
      'section#faq[data-testid="faq"][aria-labelledby="faq-title"]',
    );
    expect(sections).toHaveLength(1);
    expect(sections[0]?.querySelectorAll("h2#faq-title")).toHaveLength(1);
  });

  it("UI-FQ2 항목 수 · 순서", () => {
    const found = items(document);
    expect(found).toHaveLength(entries.length);
    expect(found.map((node) => node.getAttribute("data-faq-id"))).toEqual(
      entries.map((entry) => entry.id),
    );
  });

  it("UI-FQ3 details이고 닫혀 있다", () => {
    const found = items(document);
    expect(found).toHaveLength(entries.length);
    for (const node of found) {
      expect(node.tagName).toBe("DETAILS");
      expect(node.hasAttribute("open")).toBe(false);
      expect(node.hasAttribute("name")).toBe(false);
    }
  });

  it("UI-FQ4 질문", () => {
    const found = items(document);
    expect(found).toHaveLength(entries.length);
    found.forEach((node, index) => {
      const questions = node.querySelectorAll('summary > h3[data-testid="faq-question"]');
      expect(questions).toHaveLength(1);
      expect(questions[0]?.textContent).toBe(entries[index]?.question);
    });
  });

  it("UI-FQ5 답은 닫혀 있어도 DOM에 있다", () => {
    const found = items(document);
    expect(found).toHaveLength(entries.length);
    found.forEach((node, index) => {
      const answers = node.querySelectorAll('[data-testid="faq-answer"]');
      expect(answers).toHaveLength(1);
      expect(answers[0]?.textContent).toBe(entries[index]?.answer);
    });
  });

  it("UI-FQ6 스크립트 없음", () => {
    expect(items(document)).toHaveLength(entries.length);
    expect(html).not.toContain("<script");
  });

  it("UI-FQ7 머리", () => {
    const eyebrow = document.querySelector("#faq .eyebrow");
    expect(eyebrow?.textContent).toBe(en.faqEyebrow);
    expect(document.querySelector("#faq h2")?.textContent).toBe(plain(en.faqTitle));
  });

  it("UI-FQ8 빈 목록", async () => {
    const empty = await render(Faq, { props: { t: en, entries: [] } });
    // 껍데기는 섹션도 내지 않으므로, 던지지 않고 section은 있어야 한다는 것까지 함께 본다.
    expect(empty.document.querySelectorAll('section#faq[data-testid="faq"]')).toHaveLength(1);
    expect(texts(empty.document.querySelectorAll('[data-testid="faq-item"]'))).toHaveLength(0);
  });

  it("UI-FQ9 summary의 요소 자식은 제목 하나", () => {
    const found = items(document);
    expect(found).toHaveLength(entries.length);
    for (const node of found) {
      const summary = node.querySelector("summary");
      expect(summary).not.toBeNull();
      expect(summary?.children).toHaveLength(1);
      expect(summary?.children[0]?.tagName).toBe("H3");
      expect(summary?.querySelectorAll("svg")).toHaveLength(0);
    }
  });
});
