import { describe, expect, it } from "vitest";
import { buildIconLinks, iconFiles } from "./icon-links";

describe("icon-links", () => {
  it("U-IL1 배포 주소가 있으면 세 링크 모두 그 주소로 시작하는 절대 주소", () => {
    const links = buildIconLinks("https://example.test");
    expect(links.map((link) => link.href)).toEqual([
      "https://example.test/favicon.ico",
      "https://example.test/favicon-96x96.png",
      "https://example.test/apple-touch-icon.png",
    ]);
  });

  it("U-IL2 배포 주소가 없으면 루트 기준 상대 주소", () => {
    const links = buildIconLinks("");
    expect(links.map((link) => link.href)).toEqual([
      "/favicon.ico",
      "/favicon-96x96.png",
      "/apple-touch-icon.png",
    ]);
  });

  it("U-IL3 rel · type · sizes — ico는 any, PNG는 96x96, apple-touch-icon은 180x180", () => {
    const links = buildIconLinks("https://example.test");
    expect(links.map(({ href: _href, ...rest }) => rest)).toEqual([
      { rel: "icon", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "96x96" },
      { rel: "apple-touch-icon", sizes: "180x180" },
    ]);
    expect(iconFiles.map((file) => file.path).every((path) => path.startsWith("/"))).toBe(true);
  });
});
