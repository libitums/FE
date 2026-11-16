import { describe, expect, test } from "vitest";

import { EngineError } from "./companion-media-engines.ts";
import { openaiImageEdit } from "./companion-media-openai.ts";

// `unit` 계층(ME1): OpenAI 이미지 편집 응답이 JSON이어도 객체가 아니면(`null` · 숫자) 잘못된 응답으로 — TypeError로 새지 않고
// 다시 시도할 수 있는 EngineError(리뷰 #441).

const input = { model: "m", refs: [], prompt: "p", size: "1024x1024", quality: "low" };
const replyWith = (text: string) => async () =>
  new Response(text, { status: 200, headers: { "Content-Type": "application/json" } });

describe("openaiImageEdit 응답 본문", () => {
  test.each(["null", "42", '"text"'])(
    "ME1 본문 %s → 다시 시도할 수 있는 EngineError(invalid JSON)",
    async (text) => {
      const error = await openaiImageEdit(replyWith(text), "key", input, 1_000).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(EngineError);
      expect((error as EngineError).message).toBe("OpenAI: invalid JSON");
      expect((error as EngineError).retryable).toBe(true);
    },
  );
});
