import { expect, test } from "vitest";

import { formatDownloadedSize } from "./download-settings";

// `unit` 계층: 설정 › 다운로드의 크기 표시입니다(ADR-0095 D8).

test("DS1. 크기는 KB · MB · GB로 소수 한 자리까지 쓴다", () => {
  expect(formatDownloadedSize(0)).toBe("0 KB");
  expect(formatDownloadedSize(512)).toBe("0.5 KB");
  expect(formatDownloadedSize(150 * 1024)).toBe("150 KB");
  expect(formatDownloadedSize(12.34 * 1024 * 1024)).toBe("12.3 MB");
  expect(formatDownloadedSize(45 * 1024 * 1024)).toBe("45 MB");
  expect(formatDownloadedSize(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
});

test("DS2. 음수 · 숫자 아님 · 무한은 0 KB다", () => {
  for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(formatDownloadedSize(bad)).toBe("0 KB");
  }
});
