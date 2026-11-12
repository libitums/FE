import { describe, expect, test } from "vitest";

import {
  collectSegments,
  createSegmentSplitter,
  segmentsToTagged,
  type SegmentDelta,
} from "./companion-segments.ts";

const split = (chunks: string[]): SegmentDelta[] => {
  const splitter = createSegmentSplitter();
  return [...chunks.flatMap((chunk) => splitter.push(chunk)), ...splitter.end()];
};

describe("조각 나누기", () => {
  test("SG1. 태그 줄마다 조각 하나, 태그는 글자에 남지 않는다", () => {
    const segments = collectSegments(
      split(["@action 칠판을 끈다\n@speech 안녕하세요!\n@narration 바람이 분다"]),
    );
    expect(segments).toEqual([
      { kind: "action", text: "칠판을 끈다" },
      { kind: "speech", text: "안녕하세요!" },
      { kind: "narration", text: "바람이 분다" },
    ]);
  });

  // SG2 — 태그가 조각 경계에서 잘려 와도 태그 글자가 말풍선에 새면 안 됩니다.
  test("SG2. 태그가 여러 조각에 걸쳐 와도 같은 결과다", () => {
    const whole = "@speech 소 더하기 고기는?\n@speech 소고기!";
    const byChar = collectSegments(split([...whole]));
    expect(byChar).toEqual(collectSegments(split([whole])));
    expect(byChar).toEqual([
      { kind: "speech", text: "소 더하기 고기는?" },
      { kind: "speech", text: "소고기!" },
    ]);
  });

  test("SG3. 태그 없는 줄은 speech, 빈 줄은 버린다, 글자는 기다리지 않고 나온다", () => {
    expect(collectSegments(split(["안녕하세요\n\n\n@speechless 아님"]))).toEqual([
      { kind: "speech", text: "안녕하세요" },
      { kind: "speech", text: "@speechless 아님" },
    ]);
    const splitter = createSegmentSplitter();
    expect(splitter.push("@speech 안")).toEqual([{ segment: 0, kind: "speech", text: "안" }]);
    expect(splitter.push("녕")).toEqual([{ segment: 0, kind: "speech", text: "녕" }]);
  });

  test("SG4. 프롬프트용 태그 줄로 되돌린다", () => {
    expect(
      segmentsToTagged([
        { kind: "action", text: "웃는다" },
        { kind: "speech", text: "네!" },
      ]),
    ).toBe("@action 웃는다\n@speech 네!");
  });
});
