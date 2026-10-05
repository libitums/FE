import { describe, expect, it } from "vitest";
import type { FaqEntry, StructuredData, StructuredDataInput } from "./seo.contract";
import { buildStructuredData, serializeStructuredData } from "./structured-data";

const faq: readonly FaqEntry[] = [
  { id: "what", question: "Duru는 어떤 앱인가요?", answer: "이야기 속에서 배웁니다." },
  { id: "where", question: "어디서 받나요?", answer: "아직 출시 전입니다." },
];

const input = (overrides: Partial<StructuredDataInput> = {}): StructuredDataInput => ({
  siteUrl: "",
  language: "ko",
  path: "/ko/",
  name: "Duru",
  description: "설명",
  faq,
  ...overrides,
});

const nodes = (data: StructuredData) => [...data["@graph"]] as unknown as Record<string, unknown>[];

describe("buildStructuredData", () => {
  it("U-SD1 @context와 @graph 타입 순서", () => {
    const data = buildStructuredData(input());
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@graph"].map((node) => node["@type"])).toEqual([
      "WebSite",
      "SoftwareApplication",
      "FAQPage",
    ]);
  });

  it("U-SD2 세 노드 모두 inLanguage", () => {
    for (const node of nodes(buildStructuredData(input()))) {
      expect(node.inLanguage).toBe("ko");
    }
  });

  it("U-SD3 주소가 없으면 url 키가 없다", () => {
    for (const node of nodes(buildStructuredData(input()))) {
      expect("url" in node).toBe(false);
    }
  });

  it("U-SD4 주소가 있으면 WebSite는 루트, 나머지는 언어 주소", () => {
    const [site, app, page] = buildStructuredData(input({ siteUrl: "https://example.test" }))[
      "@graph"
    ];
    expect(site.url).toBe("https://example.test/");
    expect(app.url).toBe("https://example.test/ko/");
    expect(page.url).toBe("https://example.test/ko/");
  });

  it("U-SD5 mainEntity가 faq와 순서 · 글자까지 같다", () => {
    const page = buildStructuredData(input())["@graph"][2];
    expect(page.mainEntity).toHaveLength(faq.length);
    page.mainEntity.forEach((question, index) => {
      expect(question["@type"]).toBe("Question");
      expect(question.name).toBe(faq[index]?.question);
      expect(question.acceptedAnswer["@type"]).toBe("Answer");
      expect(question.acceptedAnswer.text).toBe(faq[index]?.answer);
    });
  });

  it("U-SD6 특수 문자 · 공백을 손대지 않는다", () => {
    const tricky: readonly FaqEntry[] = [
      { id: "what", question: ' Duru’s "quote" & more ', answer: "  It’s a \"story\" & 'tale'  " },
    ];
    const page = buildStructuredData(input({ faq: tricky }))["@graph"][2];
    expect(page.mainEntity[0]?.name).toBe(' Duru’s "quote" & more ');
    expect(page.mainEntity[0]?.acceptedAnswer.text).toBe("  It’s a \"story\" & 'tale'  ");
  });

  it("U-SD7 닫힌 키 집합 · 금지 필드 없음", () => {
    for (const siteUrl of ["", "https://example.test"]) {
      const data = buildStructuredData(input({ siteUrl }));
      const [site, app, page] = nodes(data);
      const allowedSite = ["@type", "name", "description", "inLanguage", "url"];
      const allowedApp = [
        "@type",
        "name",
        "description",
        "applicationCategory",
        "operatingSystem",
        "inLanguage",
        "url",
      ];
      const allowedPage = ["@type", "inLanguage", "url", "mainEntity"];
      expect(Object.keys(site ?? {}).every((key) => allowedSite.includes(key))).toBe(true);
      expect(Object.keys(app ?? {}).every((key) => allowedApp.includes(key))).toBe(true);
      expect(Object.keys(page ?? {}).every((key) => allowedPage.includes(key))).toBe(true);
      const text = serializeStructuredData(data);
      for (const forbidden of ["offers", "aggregateRating", "review", "author", "publisher"]) {
        expect(text).not.toContain(forbidden);
      }
    }
  });

  it("U-SD8 빈 faq는 던진다", () => {
    expect(buildStructuredData(input())["@graph"]).toHaveLength(3);
    expect(() => buildStructuredData(input({ faq: [] }))).toThrow(/\S/);
  });
});

describe("serializeStructuredData", () => {
  it("U-SD9 JSON.parse하면 입력과 깊은 동등", () => {
    const data = buildStructuredData(input({ siteUrl: "https://example.test" }));
    expect(JSON.parse(serializeStructuredData(data))).toEqual(data);
  });

  it("U-SD10 < 를 한 글자도 남기지 않고 원문은 복원된다", () => {
    const data: StructuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "Duru",
          description: "d",
          inLanguage: "en",
        },
        {
          "@type": "SoftwareApplication",
          name: "Duru",
          description: "d",
          applicationCategory: "EducationalApplication",
          operatingSystem: "iOS, Android",
          inLanguage: "en",
        },
        {
          "@type": "FAQPage",
          inLanguage: "en",
          mainEntity: [
            {
              "@type": "Question",
              name: "Q <b>?",
              acceptedAnswer: { "@type": "Answer", text: "x</script><script>alert(1)</script>" },
            },
          ],
        },
      ],
    };
    const text = serializeStructuredData(data);
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual(data);
  });
});
