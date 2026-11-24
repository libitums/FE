import { expect, test } from "vitest";

import type { EpisodeCall } from "../../lib/episode-content.model";
import { storyCallViewOf } from "./story-call";

// `unit` 계층(ADR-0188 D3): 전화 막간 표시 모델이 콘텐츠 로마자를 채워 싣는지만 봅니다.

const call: EpisodeCall = {
  counterpart: "사장님",
  lines: [
    {
      kind: "caller",
      label: "사장님",
      line: { ko: "{name} 씨, 어디예요?", roman: "{name} ssi, eodiyeyo?", en: "Where are you?" },
    },
    { kind: "self", label: "", line: { ko: "역이에요", roman: "" } },
  ],
  end: { ko: "뚝.", roman: "ttuk.", en: "Click." },
};
const port = {
  imageUrlOf: () => null,
  fill: (text: string, script: string) =>
    text.replace("{name}", script === "ko" ? "알렉스" : "Alex"),
  audioTimingOf: () => null,
};

test("SC-R1. 로마자는 로마자 스크립트로 채워 싣고, 비면 키가 없다(화면이 변환)", () => {
  const view = storyCallViewOf(call, port);
  expect(view.lines[0].text).toEqual({
    ko: "알렉스 씨, 어디예요?",
    roman: "Alex ssi, eodiyeyo?",
    en: "Where are you?",
  });
  expect(view.lines[1]?.text).toEqual({ ko: "역이에요", en: "" });
  expect(view.end).toEqual({ ko: "뚝.", roman: "ttuk.", en: "Click." });
});
