import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CHAT_VOICE_PLAYBACK_RATE,
  initialListenPace,
  listenPaceAccessibilityLabel,
  playbackRateOf,
  SLOW_PLAYBACK_RATE,
  toggledListenPace,
} from "./listen-pace";
import { uiCopyFor } from "./ui-copy";

// `unit` 계층: 속도 어휘의 입출력만 봅니다.

describe("listen-pace", () => {
  it("LP1. normal은 1, slow는 0.7이다", () => {
    expect(playbackRateOf("normal")).toBe(1);
    expect(playbackRateOf("slow")).toBe(SLOW_PLAYBACK_RATE);
    expect(SLOW_PLAYBACK_RATE).toBe(0.7);
  });

  // 피드백(2026-11-22) 「천천히가 느려지지 않는다」의 재현입니다. 호스트는 배율을 그대로 적용했고(0.85 → 같은 문장이
  // 1.16 ~ 1.18배, 2.3초 문장에서 +0.4초), 그 차이가 「느려졌다」로 들리지 않았습니다. 천천히는 같은 소리를 1.4배 이상
  // 늘려야 합니다(ADR-0082 ⟨2026-11-24⟩).
  it("LP5. 천천히는 같은 소리를 1.4배 이상 늘리고, 음질이 무너지는 0.5 아래로는 내려가지 않는다", () => {
    expect(1 / playbackRateOf("slow")).toBeGreaterThanOrEqual(1.4);
    expect(playbackRateOf("slow")).toBeGreaterThanOrEqual(0.5);
  });

  it("LP6. 대화 음성 메시지의 배율은 천천히와 따로 0.85 그대로다", () => {
    expect(CHAT_VOICE_PLAYBACK_RATE).toBe(0.85);
  });

  it("LP2. 토글은 왕복하고 처음 값은 normal이다", () => {
    expect(initialListenPace).toBe("normal");
    expect(toggledListenPace("normal")).toBe("slow");
    expect(toggledListenPace("slow")).toBe("normal");
    expect(toggledListenPace(toggledListenPace("normal"))).toBe("normal");
  });

  it("LP3. 접근성 이름은 Slow, off / Slow, on이다", () => {
    const copy = uiCopyFor("en");

    expect(listenPaceAccessibilityLabel("normal", copy)).toBe("Slow, off");
    expect(listenPaceAccessibilityLabel("slow", copy)).toBe("Slow, on");
  });
});

function sourceFilesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFilesUnder(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test(-support)?\.tsx?$/.test(name) ? [path] : [];
  });
}

// 주석 줄과 인라인 SVG처럼 긴 줄은 배율 리터럴이 아닙니다.
function hasRateLiteral(source: string): boolean {
  return source.split("\n").some((line) => {
    const code = line.trim();
    if (code.length > 200 || code.startsWith("//") || code.startsWith("*") || code.startsWith("/*"))
      return false;
    return /(?<![\d.])0\.85(?!\d)/.test(code);
  });
}

describe("0.85 리터럴", () => {
  it("LP4. 배율 0.85는 listen-pace.ts 한 파일에만 리터럴로 있다", () => {
    const root = resolve(process.cwd(), "src");
    const holders = sourceFilesUnder(root)
      .filter((path) => hasRateLiteral(readFileSync(path, "utf8")))
      .map((path) => path.slice(root.length + 1));

    expect(holders).toEqual(["lib/listen-pace.ts"]);
  });
});
