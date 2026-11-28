// 메인 답변 호출(스트림) — 생각 설정 · 서버 쪽 대체 옵션 · 지난 대화 메시지 · refusal 대체(2026-11-28).
// `companion-llm.ts`가 부르고 이름을 다시 내보낸다(파일 길이 제한으로 나눔).

import type Anthropic from "@anthropic-ai/sdk";

import type {
  ChatSendEnv,
  HistoryEntry,
  LlmStep,
  LlmUsage,
  ReplyEffort,
  ReplyRequest,
} from "./chat-send.contract.ts";
import { segmentsToTagged } from "./companion-segments.ts";

/** 시스템 프롬프트의 두 부분 사이 구분자. 핸들러가 앞(고정) · 뒤(유저별)를 이 줄로 잇습니다. */
export const systemSplit = "\n\n<<<DYNAMIC>>>\n\n";

/**
 * 메인 답변의 서버 쪽 대체 모델 옵션. 정책 거절이 나면 서버가 다른 모델로 같은 요청을 다시 돌립니다.
 * Haiku 5.5에는 대체 모델이 없어 옵션을 실으면 요청이 거절되므로, `claude-haiku`로 시작하는 모델은 빼고 보냅니다.
 */
export function serverFallbackOptions(
  model: string,
): { betas: ["server-side-fallback-2026-07-01"]; fallbacks: "default" } | Record<never, never> {
  if (model.startsWith("claude-haiku")) return {};
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

/** 답변의 생각 설정. `off`는 생각을 끄고 effort low(Haiku 5.5는 disabled를 high 이하에서만 받는다). */
export function replyThinking(effort: ReplyEffort): {
  output_config: { effort: "low" | "medium" | "high" };
  thinking?: { type: "disabled" };
} {
  if (effort === "off") return { output_config: { effort: "low" }, thinking: { type: "disabled" } };
  return { output_config: { effort } };
}

/**
 * 지난 대화 + 이번 유저 말(+ 이번 턴 지시). 지난 대화의 마지막 메시지에 캐시 표시를 단다 — 지난 대화는 요약 사이에 뒤로 붙기만 하므로
 * (`companion_begin_turn`이 마지막 요약 뒤 메시지를 준다) 다음 턴에는 여기까지가 캐시에서 읽힌다. 이번 턴 지시는 그 뒤의 system 메시지라
 * 앞부분을 바꾸지 않는다.
 */
export function historyMessages(
  history: readonly HistoryEntry[],
  userText: string,
  directive: string | null = null,
): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((entry, index) => {
    const text = entry.role === "user" ? entry.text : segmentsToTagged(entry.segments);
    const content =
      index === history.length - 1
        ? [{ type: "text" as const, text, cache_control: { type: "ephemeral" as const } }]
        : text;
    return { role: entry.role, content };
  });
  messages.push({ role: "user", content: userText });
  if (directive !== null && directive !== "") messages.push({ role: "system", content: directive });
  return messages;
}

type ResponseUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number | null;
  cache_creation_input_tokens: number | null;
};

/** 응답의 usage → 기록 한 건. 캐시 칸은 null일 수 있고, usage가 없으면(대역) 기록하지 않는다. */
export function usageOf(
  step: LlmStep,
  model: string,
  usage: ResponseUsage | undefined,
): LlmUsage | null {
  if (usage === undefined) return null;
  return {
    step,
    model,
    inputTokens: usage.input_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    outputTokens: usage.output_tokens,
  };
}

/** 메인 답변 스트림. 글 조각을 내보내고 usage를 기록한다. */
export async function* streamReply(
  client: Anthropic,
  config: Extract<ChatSendEnv["llm"], { kind: "anthropic" }>,
  request: ReplyRequest,
  record: (usage: LlmUsage | null) => void,
): AsyncGenerator<string> {
  const [stable, dynamic = ""] = request.system.split(systemSplit);
  const run = (model: string) =>
    client.beta.messages.stream(
      {
        model,
        max_tokens: 2000,
        // 채팅은 짧고 빨라야 합니다 — 생각 깊이를 낮춥니다(`COMPANION_REPLY_EFFORT`, 기본 low). off는 생각을 끈다(Haiku만).
        ...replyThinking(model === config.model ? (config.replyEffort ?? "low") : "low"),
        ...serverFallbackOptions(model),
        system: [
          { type: "text", text: stable ?? "", cache_control: { type: "ephemeral" } },
          { type: "text", text: dynamic },
        ],
        messages: historyMessages(request.history, request.userText, request.directive ?? null),
      },
      { signal: request.signal },
    );
  let yielded = false;
  const stream = run(config.model);
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yielded = true;
      yield event.delta.text;
    }
  }
  const final = await stream.finalMessage();
  record(usageOf("reply", config.model, final.usage));
  if (final.stop_reason !== "refusal") return;
  // refusal(2026-11-28): 이미 글을 보냈으면 보낸 데까지로 조용히 끝낸다(반쯤 나온 말풍선은 남는다). 아무것도 보내지 않았으면
  // 대체 모델로 한 번 다시 부른다 — Haiku 5.5는 서버 쪽 대체가 없다. 대체 모델도 거절하거나 대체가 없으면 지금처럼 오류.
  console.warn(
    `reply refusal model=${config.model} category=${final.stop_details?.category ?? "null"} yielded=${yielded}`,
  );
  if (yielded) return;
  const fallback = config.replyFallbackModel;
  if (fallback === undefined || fallback === config.model) throw new Error("refusal");
  const retry = run(fallback);
  for await (const event of retry) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta")
      yield event.delta.text;
  }
  const second = await retry.finalMessage();
  record(usageOf("reply", fallback, second.usage));
  if (second.stop_reason === "refusal") throw new Error("refusal");
}
