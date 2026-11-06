import { describe, expect, it } from "vitest";
import type { WebManifestInput } from "./web-manifest.contract";
import { buildWebManifest } from "./web-manifest";

const input = (overrides: Partial<WebManifestInput> = {}): WebManifestInput => ({
  siteUrl: "",
  name: "Duru",
  description: "Duru is a story-based Korean learning app.",
  language: "en",
  themeColor: "#F46B18",
  backgroundColor: "#FFFDFC",
  icons: [
    { path: "/favicon-96x96.png", sizes: "96x96" },
    { path: "/icon-512.png", sizes: "512x512" },
  ],
  ...overrides,
});

describe("buildWebManifest", () => {
  it("U-WM1 name · short_name이 서비스 이름이고 나머지 값이 그대로 선다", () => {
    const manifest = buildWebManifest(input());
    expect(manifest.name).toBe("Duru");
    expect(manifest.short_name).toBe("Duru");
    expect(manifest.description).toBe("Duru is a story-based Korean learning app.");
    expect(manifest.lang).toBe("en");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("browser");
    expect(manifest.theme_color).toBe("#F46B18");
    expect(manifest.background_color).toBe("#FFFDFC");
  });

  it("U-WM2 아이콘은 순서대로, 주소가 없으면 상대 · 있으면 절대, 전부 PNG", () => {
    expect(buildWebManifest(input()).icons).toEqual([
      { src: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ]);
    expect(
      buildWebManifest(input({ siteUrl: "https://example.test" })).icons.map((i) => i.src),
    ).toEqual(["https://example.test/favicon-96x96.png", "https://example.test/icon-512.png"]);
  });

  it("U-WM3 아이콘이 비거나 /로 시작하지 않으면 던진다", () => {
    expect(() => buildWebManifest(input({ icons: [] }))).toThrow(/icons/);
    expect(() => buildWebManifest(input({ icons: [{ path: "icon.png", sizes: "1x1" }] }))).toThrow(
      /icon path/,
    );
  });

  it("U-WM4 JSON으로 왕복된다", () => {
    const manifest = buildWebManifest(input({ siteUrl: "https://example.test" }));
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  });
});
