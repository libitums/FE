import { describe, expect, test } from "vitest";

import { uiCopyFor } from "../../lib/ui-copy";
import { coverDownloadLabelOf, coverProgressRingSvg } from "./cover-download";

// `unit` 계층(CDL1 ~ CDL4, ADR-0165): 표지 받기 표시의 라벨과 진행 고리 그림입니다.

const en = uiCopyFor("en").catalogMap;

describe("coverDownloadLabelOf", () => {
  test("CDL1. 표시가 없으면 null — 제목(Intro)이 그대로 선다", () => {
    expect(coverDownloadLabelOf({ kind: "none" }, en)).toBeNull();
  });

  test("CDL2. 받는 중은 「Getting ready · n%」, 받아야 하면 「Tap to download · 크기」(크기 없으면 문구만)", () => {
    expect(coverDownloadLabelOf({ kind: "getting-ready", percent: 42 }, en)).toBe(
      "Getting ready · 42%",
    );
    expect(coverDownloadLabelOf({ kind: "tap-to-download", bytes: 12 * 1024 ** 2 }, en)).toBe(
      "Tap to download · 12 MB",
    );
    expect(coverDownloadLabelOf({ kind: "tap-to-download", bytes: null }, en)).toBe(
      "Tap to download",
    );
  });

  test("CDL3. 다섯 UI 언어 모두 두 문구가 비지 않고 퍼센트 · 크기를 싣는다", () => {
    for (const language of ["en", "es", "id", "ja", "vi"] as const) {
      const copy = uiCopyFor(language).catalogMap.coverDownload;
      expect(copy.gettingReady(7)).toContain("7%");
      expect(copy.tapToDownload("3 MB")).toContain("3 MB");
      expect(copy.tapToDownload(null).length).toBeGreaterThan(0);
      expect(copy.tapToDownload(null)).not.toContain("null");
    }
  });
});

describe("coverProgressRingSvg", () => {
  const colors = { track: "#111111", arc: "#222222" };

  test("CDL4. 0%는 바탕 고리만, 100% 이상은 닫힌 원, 사이는 호 하나 — 큰 호 깃발이 절반을 넘으면 1이다", () => {
    expect(coverProgressRingSvg(0, colors)).toContain("#111111");
    expect(coverProgressRingSvg(0, colors)).not.toContain("#222222");
    expect(coverProgressRingSvg(100, colors)).toMatch(/<circle[^>]*#222222/);
    expect(coverProgressRingSvg(130, colors)).toBe(coverProgressRingSvg(100, colors));
    expect(coverProgressRingSvg(25, colors)).toMatch(/A [\d.]+ [\d.]+ 0 0 1 /);
    expect(coverProgressRingSvg(75, colors)).toMatch(/A [\d.]+ [\d.]+ 0 1 1 /);
  });
});
