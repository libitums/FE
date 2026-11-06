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
  alternateNames: ["DURU", "두루"],
  logoPath: "/logo.png",
  sameAs: ["https://play.example.test/app"],
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
      "Organization",
      "SoftwareApplication",
      "FAQPage",
    ]);
  });

  it("U-SD2 Organization 빼고 세 노드가 inLanguage, Organization은 언어가 없다", () => {
    const [site, organization, app, page] = nodes(buildStructuredData(input()));
    for (const node of [site, app, page]) expect(node?.inLanguage).toBe("ko");
    expect(organization && "inLanguage" in organization).toBe(false);
  });

  it("U-SD3 주소가 없으면 url · logo 키가 없다", () => {
    for (const node of nodes(buildStructuredData(input()))) {
      expect("url" in node).toBe(false);
      expect("logo" in node).toBe(false);
    }
  });

  it("U-SD4 주소가 있으면 WebSite · Organization은 루트, 나머지는 언어 주소, logo는 절대 주소", () => {
    const [site, organization, app, page] = buildStructuredData(
      input({ siteUrl: "https://example.test" }),
    )["@graph"];
    expect(site.url).toBe("https://example.test/");
    expect(organization.url).toBe("https://example.test/");
    expect(organization.logo).toBe("https://example.test/logo.png");
    expect(app.url).toBe("https://example.test/ko/");
    expect(page.url).toBe("https://example.test/ko/");
  });

  it("U-SD5 mainEntity가 faq와 순서 · 글자까지 같다", () => {
    const page = buildStructuredData(input())["@graph"][3];
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
    const page = buildStructuredData(input({ faq: tricky }))["@graph"][3];
    expect(page.mainEntity[0]?.name).toBe(' Duru’s "quote" & more ');
    expect(page.mainEntity[0]?.acceptedAnswer.text).toBe("  It’s a \"story\" & 'tale'  ");
  });

  it("U-SD7 닫힌 키 집합 · 금지 필드 없음", () => {
    for (const siteUrl of ["", "https://example.test"]) {
      const data = buildStructuredData(input({ siteUrl }));
      const [site, organization, app, page] = nodes(data);
      const allowedSite = ["@type", "name", "alternateName", "description", "inLanguage", "url"];
      const allowedOrganization = ["@type", "name", "alternateName", "url", "logo", "sameAs"];
      const allowedApp = [
        "@type",
        "name",
        "alternateName",
        "description",
        "applicationCategory",
        "operatingSystem",
        "inLanguage",
        "url",
        "sameAs",
      ];
      const allowedPage = ["@type", "inLanguage", "url", "mainEntity"];
      expect(Object.keys(site ?? {}).every((key) => allowedSite.includes(key))).toBe(true);
      expect(
        Object.keys(organization ?? {}).every((key) => allowedOrganization.includes(key)),
      ).toBe(true);
      expect(Object.keys(app ?? {}).every((key) => allowedApp.includes(key))).toBe(true);
      expect(Object.keys(page ?? {}).every((key) => allowedPage.includes(key))).toBe(true);
      const text = serializeStructuredData(data);
      for (const forbidden of [
        "offers",
        "aggregateRating",
        "review",
        "author",
        "publisher",
        "address",
        "founder",
        "contactPoint",
      ]) {
        expect(text).not.toContain(forbidden);
      }
    }
  });

  it("U-SD8 빈 faq는 던진다", () => {
    expect(buildStructuredData(input())["@graph"]).toHaveLength(4);
    expect(() => buildStructuredData(input({ faq: [] }))).toThrow(/\S/);
  });

  it("U-SD11 alternateName은 WebSite · Organization · SoftwareApplication에 같은 배열로 서고, 비면 키가 없다", () => {
    const [site, organization, app, page] = nodes(buildStructuredData(input()));
    for (const node of [site, organization, app]) {
      expect(node?.alternateName).toEqual(["DURU", "두루"]);
    }
    expect(page && "alternateName" in page).toBe(false);
    for (const node of nodes(buildStructuredData(input({ alternateNames: [] })))) {
      expect("alternateName" in node).toBe(false);
    }
  });

  it("U-SD12 sameAs는 Organization · SoftwareApplication에만 서고, 주소 유무와 무관하며, 비면 키가 없다", () => {
    for (const siteUrl of ["", "https://example.test"]) {
      const [site, organization, app, page] = nodes(buildStructuredData(input({ siteUrl })));
      expect(organization?.sameAs).toEqual(["https://play.example.test/app"]);
      expect(app?.sameAs).toEqual(["https://play.example.test/app"]);
      expect(site && "sameAs" in site).toBe(false);
      expect(page && "sameAs" in page).toBe(false);
    }
    for (const node of nodes(buildStructuredData(input({ sameAs: [] })))) {
      expect("sameAs" in node).toBe(false);
    }
  });

  it("U-SD13 logoPath가 /로 시작하지 않거나 sameAs에 https가 아닌 것이 있으면 던진다", () => {
    expect(() => buildStructuredData(input({ logoPath: "logo.png" }))).toThrow(/logoPath/);
    expect(() => buildStructuredData(input({ sameAs: ["http://play.example.test"] }))).toThrow(
      /sameAs/,
    );
    expect(() => buildStructuredData(input({ sameAs: ["/ko/"] }))).toThrow(/sameAs/);
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
        { "@type": "Organization", name: "Duru" },
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
