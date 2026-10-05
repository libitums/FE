import { describe, expect, it } from "vitest";
import Analytics from "./Analytics.astro";
import { render } from "./render.support";

describe("Analytics", () => {
  it("UI-GA1 측정 ID가 있으면 gtag 스크립트와 초기화 스크립트를 낸다", async () => {
    const { document } = await render(Analytics, { props: { measurementId: "G-AB12CD34EF" } });
    const loader = document.querySelectorAll(
      'script[src^="https://www.googletagmanager.com/gtag/js"]',
    );
    expect(loader).toHaveLength(1);
    expect(loader[0]?.getAttribute("src")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-AB12CD34EF",
    );
    expect(loader[0]?.hasAttribute("async")).toBe(true);
    const inline = [...document.querySelectorAll("script:not([src])")].map(
      (node) => node.textContent,
    );
    expect(inline).toHaveLength(1);
    expect(inline[0]).toContain('gtag("config","G-AB12CD34EF")');
    expect(inline[0]).toContain('"analytics_storage":"denied"');
  });

  it("UI-GA2 측정 ID가 없으면 아무 스크립트도 내지 않는다", async () => {
    const withId = await render(Analytics, { props: { measurementId: "G-AB12CD34EF" } });
    expect(withId.document.querySelectorAll("script").length).toBeGreaterThan(0);
    const { document, html } = await render(Analytics, { props: { measurementId: "" } });
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(html).not.toContain("googletagmanager");
  });
});
