import { describe, expect, it } from "vitest";
import { legalDocument, legalDocuments } from "./documents";
import type { LegalBlock, LegalDocument, LegalText } from "./legal.contract";
import {
  legalDefaultLanguage,
  legalDocumentIds,
  legalLanguageFor,
  legalLanguages,
  legalPathFor,
} from "./legal-paths";

const blocksOf = (document: LegalDocument): LegalBlock[] => [
  ...document.intro,
  ...document.sections.flatMap((section) => section.blocks),
];

const textsOf = (block: LegalBlock): LegalText[] => {
  if (block.kind === "paragraph") return [block.text];
  if (block.kind === "subheading") return [block.text];
  if (block.kind === "list") return [...block.items];
  return block.rows.flat();
};

const linksOf = (document: LegalDocument) =>
  blocksOf(document)
    .flatMap(textsOf)
    .flatMap((text) => (typeof text === "string" ? [] : text))
    .flatMap((span) => (typeof span === "string" ? [] : [span]));

const plain = (text: LegalText): string =>
  typeof text === "string"
    ? text
    : text.map((span) => (typeof span === "string" ? span : span.label)).join("");

describe("법률 문서의 주소", () => {
  it("U-LG1 기준본은 /<문서>/, 번역본은 /<언어>/<문서>/", () => {
    expect(legalDefaultLanguage).toBe("en");
    expect(legalPathFor("privacy", "en")).toBe("/privacy/");
    expect(legalPathFor("terms", "en")).toBe("/terms/");
    expect(legalPathFor("privacy", "ko")).toBe("/ko/privacy/");
    expect(legalPathFor("terms", "ko")).toBe("/ko/terms/");
  });

  it("U-LG2 번역본이 없는 사이트 언어는 기준본으로 간다", () => {
    expect(legalLanguageFor("ko")).toBe("ko");
    expect(legalLanguageFor("en")).toBe("en");
    for (const language of ["vi", "id", "ms", "es", "ja", "xx"]) {
      expect(legalLanguageFor(language)).toBe("en");
    }
  });
});

describe.each(legalDocumentIds)("법률 문서 %s", (id) => {
  const base = legalDocument(id, legalDefaultLanguage);

  it("U-LG3 모든 언어판이 있고 정체 · 언어가 맞다", () => {
    expect(Object.keys(legalDocuments[id]).sort()).toEqual([...legalLanguages].sort());
    for (const language of legalLanguages) {
      const document = legalDocument(id, language);
      expect(document.id).toBe(id);
      expect(document.language).toBe(language);
      expect(document.title).not.toBe("");
      expect(document.description).not.toBe("");
    }
  });

  it("U-LG4 시행일이 언어판마다 같고 YYYY-MM-DD다", () => {
    expect(base.effectiveIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const language of legalLanguages) {
      expect(legalDocument(id, language).effectiveIso).toBe(base.effectiveIso);
    }
    const [year, month, day] = base.effectiveIso.split("-").map(Number);
    expect(base.effectiveDate).toContain(String(year));
    expect(base.effectiveDate).toContain(String(day));
    expect(legalDocument(id, "ko").effectiveDate).toBe(`${year}년 ${month}월 ${day}일`);
  });

  it("U-LG5 기준본에는 번역 안내가 없고 번역본에는 있다", () => {
    expect(base.translationNote).toBe("");
    for (const language of legalLanguages.filter((code) => code !== legalDefaultLanguage)) {
      expect(legalDocument(id, language).translationNote).not.toBe("");
    }
  });

  it("U-LG6 번역본의 뼈대가 기준본과 같다 — 절 · 블록 종류 · 항목 수 · 표의 모양", () => {
    const shapeOf = (document: LegalDocument) =>
      [{ blocks: document.intro }, ...document.sections].map((section) =>
        section.blocks.map((block) => {
          if (block.kind === "list") return `list:${block.items.length}`;
          if (block.kind === "table") return `table:${block.head.length}x${block.rows.length}`;
          return block.kind;
        }),
      );
    for (const language of legalLanguages) {
      expect(shapeOf(legalDocument(id, language))).toEqual(shapeOf(base));
    }
  });

  it("U-LG7 절 제목이 1부터 차례로 번호를 단다", () => {
    for (const language of legalLanguages) {
      const headings = legalDocument(id, language).sections.map((section) => section.heading);
      expect(headings.length).toBeGreaterThan(0);
      headings.forEach((heading, index) => {
        expect(heading.startsWith(`${index + 1}. `)).toBe(true);
      });
    }
  });

  it("U-LG8 표의 모든 행이 머리와 칸 수가 같고 빈 칸이 없다", () => {
    for (const language of legalLanguages) {
      for (const block of blocksOf(legalDocument(id, language))) {
        if (block.kind !== "table") continue;
        expect(block.caption).not.toBe("");
        for (const row of block.rows) {
          expect(row.length).toBe(block.head.length);
          for (const cell of row) expect(plain(cell).trim()).not.toBe("");
        }
      }
    }
  });

  it("U-LG9 링크는 https · mailto · 사이트 안 주소뿐이고 언어판마다 같은 곳을 가리킨다", () => {
    const targets = (document: LegalDocument) =>
      linksOf(document).map((link) =>
        // 사이트 안 링크는 그 언어판의 주소라 언어 조각만 다릅니다.
        link.href.replace(/^\/ko\//, "/"),
      );
    for (const language of legalLanguages) {
      const document = legalDocument(id, language);
      for (const link of linksOf(document)) {
        expect(link.label).not.toBe("");
        expect(link.href).toMatch(/^(https:\/\/|mailto:|\/)/);
      }
      expect(targets(document)).toEqual(targets(base));
    }
  });
});

describe("개인정보 처리방침의 내용", () => {
  const providers = (language: "en" | "ko") => {
    const table = blocksOf(legalDocument("privacy", language)).find(
      (block) => block.kind === "table",
    );
    if (table === undefined || table.kind !== "table") throw new Error("처리 위탁 표가 없다");
    return table.rows.map((row) => plain(row[0] ?? ""));
  };

  it("U-LG10 처리 위탁 표가 데이터를 받는 회사를 모두 싣는다", () => {
    const names = providers("en").join(" | ");
    for (const name of [
      "Supabase",
      "Anthropic",
      "OpenAI",
      "ElevenLabs",
      "RevenueCat",
      "Apple",
      "Google",
      "Meta",
      "PostHog",
      "Sentry",
      "Airbridge",
      "Vercel",
    ]) {
      expect(names).toContain(name);
    }
  });

  it("U-LG11 표의 회사가 두 언어판에서 같은 순서다", () => {
    const en = providers("en");
    const ko = providers("ko");
    expect(ko.length).toBe(en.length);
    // 마지막 행(브라우저 제공자)만 이름을 번역합니다.
    expect(ko.slice(0, -1)).toEqual(en.slice(0, -1));
  });

  it("U-LG12 한국 법이 요구하는 국외 이전 항목 — 받는 자 · 하는 일 · 항목 · 국가 · 연락처 다섯 칸", () => {
    for (const language of legalLanguages) {
      const table = blocksOf(legalDocument("privacy", language)).find(
        (block) => block.kind === "table",
      );
      expect(table?.kind === "table" && table.head.length).toBe(5);
    }
  });
});
