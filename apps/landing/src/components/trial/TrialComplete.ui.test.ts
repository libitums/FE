import { describe, expect, it } from "vitest";

import { trialEn } from "../../i18n/trial-copy";
import { trialKo } from "../../i18n/trial-ko";
import { render } from "../render.support";
import type { TrialCopy, TrialStoreLink } from "./trial-components.contract";
import TrialComplete from "./TrialComplete.astro";
import { allByTestId, expectStepHeading, oneByTestId, textOf } from "./trial-ui.support";

const storesWith = (ios: string, android: string): TrialStoreLink[] => [
  { id: "ios", platform: "iPhone", name: "App Store", href: ios },
  { id: "android", platform: "Android", name: "Google Play", href: android },
];
const IOS = "https://apps.apple.com/app/id1";
const ANDROID = "https://play.google.com/store/apps/details?id=app.duru";

const renderComplete = (t: TrialCopy, language: "en" | "ko", stores: TrialStoreLink[]) =>
  render(TrialComplete, { props: { t, language, stores } });

describe("UT10 TrialComplete", () => {
  it("section hidden · 제목 · data-result · 통과 · 미통과 문구 둘", async () => {
    const t = trialEn;
    const { document } = await renderComplete(t, "en", storesWith("", ""));
    const section = oneByTestId(document, "trial-step-complete");
    expect(section.hasAttribute("hidden")).toBe(true);
    expectStepHeading(section);
    expect(["passed", "failed"]).toContain(section.getAttribute("data-result"));
    const text = section.textContent ?? "";
    expect(text).toContain(t.completeTitle);
    expect(text).toContain(t.completeBody);
    expect(text).toContain(t.completeTitleMissed);
  });

  it.each([
    ["en", trialEn],
    ["ko", trialKo],
  ] as const)("스토어 주소가 없으면 div 둘 · 준비 중 (%s)", async (language, t) => {
    const { document } = await renderComplete(t, language, storesWith("", ""));
    const stores = allByTestId(document, "trial-store");
    expect(stores.map((store) => store.tagName)).toEqual(["DIV", "DIV"]);
    expect(allByTestId(document, "trial-store-state").map(textOf)).toEqual([
      t.storeSoon,
      t.storeSoon,
    ]);
    expect(stores[0]?.textContent).toContain("App Store");
    expect(stores[1]?.textContent).toContain("Google Play");
    expect(document.querySelectorAll("a[data-trial-store]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-store]")).toHaveLength(0);
  });

  it("주소가 있으면 a[data-trial-store] · 새 탭 · rel · data-store 없음", async () => {
    const t = trialEn;
    const { document } = await renderComplete(t, "en", storesWith(IOS, ANDROID));
    const links = allByTestId(document, "trial-store");
    expect(links.map((link) => link.tagName)).toEqual(["A", "A"]);
    expect(links.map((link) => link.getAttribute("data-trial-store"))).toEqual(["ios", "android"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([IOS, ANDROID]);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      const rel = link.getAttribute("rel") ?? "";
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    }
    expect(document.querySelectorAll("[data-store]")).toHaveLength(0);
    expect(allByTestId(document, "trial-store-state").map(textOf)).toEqual([
      t.storeGet,
      t.storeGet,
    ]);
  });

  it("iOS만 주소가 있으면 첫째만 링크", async () => {
    const { document } = await renderComplete(trialEn, "en", storesWith(IOS, ""));
    expect(allByTestId(document, "trial-store").map((store) => store.tagName)).toEqual([
      "A",
      "DIV",
    ]);
  });

  it.each([
    ["en", trialEn, "/"],
    ["ko", trialKo, "/ko/"],
  ] as const)("홈 링크 (%s)", async (language, t, home) => {
    const { document } = await renderComplete(t, language, storesWith("", ""));
    const link = oneByTestId(document, "trial-complete-home");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe(home);
    expect(textOf(link)).toBe(t.backHome);
  });
});
