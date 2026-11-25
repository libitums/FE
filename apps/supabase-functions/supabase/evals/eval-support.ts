// 실제 모델 평가 실행기들이 같이 쓰는 것(환경 · 인물 카드 · 목록 고르기). 평가 전용 — 운영 함수는 읽지 않는다.

import process from "node:process";

import type { ChatSendEnv, PersonaCard } from "../functions/_shared/chat-send.contract.ts";
import { startTestDatabase } from "../migrations/postgres.test-support";

export const apiKey = process.env["ANTHROPIC_API_KEY"]?.trim() ?? "";

/** 쉼표로 나눈 환경 변수. 비어 있으면 기본값. */
export const envList = (name: string, fallback: readonly string[]): string[] => {
  const values = (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  return values.length === 0 ? [...fallback] : values;
};
export const envText = (name: string, fallback: string): string =>
  process.env[name]?.trim() || fallback;

/** 채점 · 답 모델을 만드는 데 쓰는 환경(주소 · 서버 키는 쓰지 않는다). */
export const evalEnv = (model: string): ChatSendEnv => ({
  supabaseUrl: "http://localhost",
  supabaseAnonKey: "unused",
  supabaseServiceRoleKey: "unused",
  llm: {
    kind: "anthropic",
    apiKey,
    model,
    moderationModel: model,
    feedbackModel: model,
    translationModel: model,
  },
  translation: "every",
});

/** 운영과 같은 캐릭터 카드 — 마이그레이션을 내장 Postgres에 올려 `companion_inspect_characters`로 읽는다. */
export async function loadPersonas(): Promise<Map<string, PersonaCard>> {
  const db = await startTestDatabase();
  try {
    const cards = (await db.admin.query("select public.companion_inspect_characters() as c"))
      .rows[0].c as { id: string; persona: PersonaCard }[];
    return new Map(cards.map((card) => [card.id, card.persona]));
  } finally {
    await db.close();
  }
}

export const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};
