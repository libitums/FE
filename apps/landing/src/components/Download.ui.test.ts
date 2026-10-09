import { afterEach, describe, expect, it, vi } from "vitest";
import type { Copy } from "../i18n/copy";
import { languages, pages } from "../site";
import { texts, type Rendered } from "./render.support";

interface Links {
  ios: string;
  android: string;
}

// storeLinks는 컴포넌트 최상위에서 읽히므로, 상태마다 모듈을 새로 불러옵니다.
async function renderWith(storeLinks: Links, t: Copy): Promise<Rendered> {
  vi.resetModules();
  vi.doMock("../site", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../site")>()),
    storeLinks,
  }));
  const { default: Download } = await import("./Download.astro");
  const { render } = await import("./render.support");
  return render(Download, { props: { t } });
}

afterEach(() => {
  vi.doUnmock("../site");
  vi.resetModules();
});

const none: Links = { ios: "", android: "" };
const iosOnly: Links = { ios: "https://apps.apple.com/app/id1", android: "" };
const both: Links = {
  ios: "https://apps.apple.com/app/id1",
  android: "https://play.google.com/store/apps/details?id=app.duru",
};

describe.each(languages)("Download (%s)", (language) => {
  const t = pages[language].copy;
  const stores = (document: Document) => [...document.querySelectorAll('[data-testid="store"]')];
  const states = (document: Document) => document.querySelectorAll('[data-testid="store-state"]');

  it("UI-DL1 뼈대", async () => {
    const { document } = await renderWith(none, t);
    expect(
      document.querySelectorAll('section#download[aria-labelledby="download-title"]').length,
    ).toBe(1);
    const title = document.querySelectorAll("h2#download-title");
    expect(title.length).toBe(1);
    expect(title[0]?.textContent).toBe(t.downloadTitle);
    expect(document.querySelectorAll("#download h1, #download h3, #download h4").length).toBe(0);
  });

  it("UI-DL2 주소가 없으면 준비 중 카드", async () => {
    const { document } = await renderWith(none, t);
    const found = stores(document);
    expect(found.length).toBe(2);
    for (const card of found) expect(card.tagName).toBe("DIV");
    expect(document.querySelectorAll("[data-store]").length).toBe(0);
    expect(states(document).length).toBe(2);
    expect(texts(states(document))).toEqual([t.storeSoon, t.storeSoon]);
    expect(found[0]?.textContent).toContain("iPhone");
    expect(found[0]?.textContent).toContain("App Store");
    expect(found[1]?.textContent).toContain("Android");
    expect(found[1]?.textContent).toContain("Google Play");
  });

  it("UI-DL3 iOS만 주소가 있으면 첫 카드만 링크", async () => {
    const { document } = await renderWith(iosOnly, t);
    const found = stores(document);
    expect(found.length).toBe(2);
    const first = found[0] as Element;
    expect(first.tagName).toBe("A");
    expect(first.getAttribute("href")).toBe(iosOnly.ios);
    expect(first.getAttribute("target")).toBe("_blank");
    const rel = first.getAttribute("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
    expect(first.getAttribute("data-store")).toBe("ios");
    expect(first.querySelector('[data-testid="store-state"]')?.textContent).toBe(t.storeGet);
    const second = found[1] as Element;
    expect(second.tagName).toBe("DIV");
    expect(second.querySelector('[data-testid="store-state"]')?.textContent).toBe(t.storeSoon);
  });

  it("UI-DL4 둘 다 주소가 있으면 링크 둘", async () => {
    const { document } = await renderWith(both, t);
    const links = [...document.querySelectorAll('a[data-testid="store"]')];
    expect(links.length).toBe(2);
    expect(links.map((a) => a.getAttribute("data-store"))).toEqual(["ios", "android"]);
    expect(texts(states(document))).toEqual([t.storeGet, t.storeGet]);
  });
});
