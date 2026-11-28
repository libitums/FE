// 답장 시스템 프롬프트를 그려 본다(토큰 수 확인용). run dump-prompt --conv <대화 파일>
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { companionSystemPrompt } from "../../supabase/functions/_shared/companion-prompt.ts";
import { pickStory } from "../../supabase/functions/_shared/companion-story.ts";
import { topicStateFrom } from "../../supabase/functions/_shared/companion-branching.ts";
import { apiKey, argValue } from "./lib.ts";
const conv = JSON.parse(readFileSync(argValue("conv"), "utf8"));
const story = pickStory(conv.characterId, conv.learning.episodes, topicStateFrom(null), Date.now());
const p = companionSystemPrompt({
  persona: conv.persona,
  characterId: conv.characterId,
  speechLevel: conv.speechLevel,
  intimacy: 0,
  ageBand: conv.ageBand,
  l1: conv.l1,
  expressions: conv.learning.expressions,
  summary: null,
  feedbackMode: "separate",
  memories: [],
  directive: null,
  story: story.text,
  romanceTier: conv.romanceTier,
});
const client = new Anthropic({ apiKey: apiKey() });
for (const [name, text] of [
  ["stable", p.stable],
  ["dynamic", p.dynamic],
] as const) {
  const n = await client.messages.countTokens({
    model: "claude-haiku-5-5",
    messages: [{ role: "user", content: text }],
  });
  console.error(`${name}: ${text.length} chars, ${n.input_tokens} tokens`);
}
if (process.argv.includes("--print")) console.log(p.stable + "\n\n<<<DYNAMIC>>>\n\n" + p.dynamic);
