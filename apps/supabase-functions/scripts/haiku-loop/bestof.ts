// best-of-N 실험(하니스 전용, 운영 코드 아님): 같은 요청으로 답 N개를 만들고 Haiku 선택자가 하나를 고른다.
import Anthropic from "@anthropic-ai/sdk";

import type {
  CompanionLlm,
  PersonaCard,
  ReplyRequest,
} from "../../supabase/functions/_shared/chat-send.contract.ts";
import { segmentsToTagged } from "../../supabase/functions/_shared/companion-segments.ts";
import { apiKey } from "./lib.ts";

let client: Anthropic | null = null;

export async function collect(llm: CompanionLlm, request: ReplyRequest): Promise<string> {
  let text = "";
  for await (const chunk of llm.reply(request)) text += chunk;
  return text;
}

/** 후보 글(태그 줄) 가운데 하나를 고른다. 선택자 호출 비용은 onUsage로 알린다. */
export async function pick(
  persona: PersonaCard,
  speechLevel: string,
  history: string,
  userText: string,
  candidates: readonly string[],
  onCost: (usd: number) => void,
): Promise<number> {
  client ??= new Anthropic({ apiKey: apiKey(), maxRetries: 3 });
  const letters = "ABCD";
  const body = candidates
    .map(
      (c, i) =>
        `## ${letters[i]}\n${c
          .split("\n")
          .filter((l) => !l.startsWith("@state"))
          .join("\n")}`,
    )
    .join("\n\n");
  const response = await client.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 400,
    output_config: { effort: "low" },
    system:
      "You pick the better reply from a Korean-learning chat character. Prefer, in order: correct and natural Korean that a beginner can read (no broken word games, no made-up facts, no wrong grammar explanations); keeps the given speech level in every line; sounds like this character; responds to what the learner just said; short, at most one question; no self-corrections or meta text. Answer with only the letter.",
    messages: [
      {
        role: "user",
        content: `Character: ${persona.name} — ${persona.speech ?? ""}\nSpeech level: ${speechLevel}\n\nRecent chat:\n${history}\n\nLearner: ${userText}\n\n${body}\n\nWhich is better? Answer A or B.`,
      },
    ],
  });
  const u = response.usage;
  onCost((u.input_tokens * 0.1 + u.output_tokens * 0.5) / 1e6);
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const index = letters.indexOf(text.trim().charAt(0).toUpperCase());
  return index >= 0 && index < candidates.length ? index : 0;
}

export const historyText = (
  name: string,
  history: readonly { role: string; text?: string; segments?: { kind: string; text: string }[] }[],
) =>
  history
    .slice(-6)
    .map((h) =>
      h.role === "user"
        ? `Learner: ${h.text}`
        : `${name}: ${segmentsToTagged((h.segments ?? []) as never)}`,
    )
    .join("\n");
