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

  // SG3b — Haiku가 `@state` 태그를 빠뜨리고 JSON만 쓰거나 찌꺼기 줄(`_state_placeholder`)을 쓰면 말풍선에 새면 안 된다(2026-11-27).
  test("SG3b. 태그 없는 상태 JSON은 상태 줄로, _state 찌꺼기 줄은 버린다 — 글자 단위로 와도 같다", () => {
    const whole =
      '@speech 시험 힘내요!\n{"intimacy_delta": 2, "topic": "시험", "user_wants_switch": false}\n_state_placeholder';
    for (const chunks of [[whole], [...whole]]) {
      const splitter = createSegmentSplitter();
      const deltas = [...chunks.flatMap((chunk) => splitter.push(chunk)), ...splitter.end()];
      expect(collectSegments(deltas)).toEqual([{ kind: "speech", text: "시험 힘내요!" }]);
      expect(splitter.state()).toMatchObject({ intimacyDelta: 2, topic: "시험" });
    }
    // 찌꺼기 줄(`<br>` · `<<…>>` · `brief:`)도 버린다.
    expect(
      collectSegments(split(["@speech 좋아요!\n<br>\n<<HUMAN_CONVERSATION_START>>\nbrief: x\n@speech 또 봐요"])),
    ).toEqual([
      { kind: "speech", text: "좋아요!" },
      { kind: "speech", text: "또 봐요" },
    ]);
    // 자기 수정 · 메타 줄도 버린다(태그가 붙어 와도).
    expect(
      collectSegments(split(["@speech 반가워요!\nWait — I must keep 해요체 everywhere.\nLet me redo that cleanly.\n@speech 어디에서 왔어요?"])),
    ).toEqual([
      { kind: "speech", text: "반가워요!" },
      { kind: "speech", text: "어디에서 왔어요?" },
    ]);
    // 학습자에게 보일 평범한 중괄호 글은 그대로 speech.
    expect(collectSegments(split(["{웃음} 좋아요"]))).toEqual([{ kind: "speech", text: "{웃음} 좋아요" }]);
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
