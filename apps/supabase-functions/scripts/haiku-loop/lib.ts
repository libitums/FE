// Haiku 전환 평가 루프의 공용 부품. 운영 코드(`supabase/functions/_shared`)를 그대로 불러 실제 Claude API로 답을 만든다.
// 키는 다른 로컬 저장소의 .env에서 읽고(`HAIKU_LOOP_ENV`, 기본 duru-curation) 화면에 내지 않는다.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import type {
  ChatSendEnv,
  CompanionLlm,
  LlmUsage,
  PersonaCard,
  ReplyEffort,
} from "../../supabase/functions/_shared/chat-send.contract.ts";
import { anthropicCompanionLlm } from "../../supabase/functions/_shared/companion-llm.ts";

export const here = new URL(".", import.meta.url).pathname;

export function apiKey(): string {
  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const path =
    process.env.HAIKU_LOOP_ENV ?? join(homedir(), "Developer/libitum/duru-curation/.env");
  const line = readFileSync(path, "utf8")
    .split("\n")
    .find((row) => /^(export\s+)?[A-Z0-9_]*ANTHROPIC_API_KEY=/.test(row));
  const key = line
    ?.slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!key) throw new Error(`ANTHROPIC_API_KEY not found in ${path}`);
  return key;
}

/** `claude-haiku-5-5@medium` → 모델 · 생각 깊이. 깊이를 안 쓰면 low(운영 기본). */
export function parseModel(spec: string): { model: string; effort: ReplyEffort } {
  const [model = spec, effort = "low"] = spec.split("@");
  if (!["low", "medium", "high", "off"].includes(effort)) throw new Error(`bad effort ${effort}`);
  const full = model.startsWith("claude-") ? model : `claude-${model}-5-5`;
  return { model: full, effort: effort as ReplyEffort };
}

let sharedClient: Anthropic | null = null;

/** 답 단계만 쓰는 계층(검사 · 피드백 · 번역 모델도 같은 값 — 루프에서는 부르지 않는다). 끝에 `+boN`이면 best-of-N 실험. */
export function replyLlm(spec: string, onUsage: (usage: LlmUsage) => void): CompanionLlm {
  const bo = /\+bo(\d)$/.exec(spec);
  if (bo) {
    const inner = replyLlm(spec.replace(/\+bo\d$/, ""), onUsage);
    const n = Number(bo[1]);
    return {
      ...inner,
      async *reply(request) {
        const { collect, pick } = await import("./bestof.ts");
        const candidates = await Promise.all(Array.from({ length: n }, () => collect(inner, request)));
        const name = /You are ([^,.]+)/.exec(request.system)?.[1] ?? "the character";
        const history = request.history
          .slice(-6)
          .map((h) => (h.role === "user" ? `Learner: ${h.text}` : `${name}: ${h.segments.map((s) => s.text).join(" / ")}`))
          .join("\n");
        const chosen = await pick({ name } as never, "as in the reply", history, request.userText, candidates, (usd) =>
          onUsage({ step: "reply", model: "claude-haiku-5-5", inputTokens: Math.round(usd * 1e7), cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 }),
        );
        yield candidates[chosen] ?? "";
      },
    };
  }
  const { model, effort } = parseModel(spec);
  sharedClient ??= new Anthropic({ apiKey: apiKey(), maxRetries: 3 });
  const config: Extract<ChatSendEnv["llm"], { kind: "anthropic" }> = {
    kind: "anthropic",
    apiKey: "unused",
    model,
    moderationModel: model,
    feedbackModel: model,
    translationModel: model,
    suggestModel: model,
    replyEffort: effort,
  };
  return anthropicCompanionLlm(config, onUsage, sharedClient);
}

export type CharacterRow = { id: string; active: boolean; persona: PersonaCard };

export function personas(): Map<string, PersonaCard> {
  const rows = JSON.parse(readFileSync(join(here, "data/characters.json"), "utf8")) as CharacterRow[];
  return new Map(rows.map((row) => [row.id, row.persona]));
}

/** 단가(달러 / 100만 토큰) — 입력 · 출력 · 캐시 읽기. 캐시 쓰기는 입력의 1.25배. */
const prices: Record<string, [number, number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5, 0.01],
  "claude-sonnet-5-5": [2, 10, 0.1],
  "claude-opus-5-5": [4, 20, 0.2],
};

export function costOf(usage: LlmUsage): number {
  const [input, output, read] = prices[usage.model] ?? [0, 0, 0];
  return (
    (usage.inputTokens * input +
      usage.cacheWriteTokens * input * 1.25 +
      usage.cacheReadTokens * read +
      usage.outputTokens * output) /
    1e6
  );
}

/** 학습 맥락 스냅숏(운영 사용자 진도별, 기록 칸은 0으로). 키: ep1 ~ ep5. */
export function learningContext(key: string) {
  const all = JSON.parse(readFileSync(join(here, "data/learning.json"), "utf8")) as Record<
    string,
    { episodes: string[]; expressions: unknown[]; settings?: Record<string, unknown> }
  >;
  const found = all[key];
  if (!found) throw new Error(`no learning context ${key} (have ${Object.keys(all).join(", ")})`);
  return found;
}

/** 케이스 id → 학습용(train) · 검증용(holdout). 고정 해시라 실행마다 같다. 약 70 : 30. */
export function splitOf(id: string): "train" | "holdout" {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % 10 < 7 ? "train" : "holdout";
}

export function argValue(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (value === undefined) {
    if (fallback === undefined) throw new Error(`--${name} is required`);
    return fallback;
  }
  return value;
}
