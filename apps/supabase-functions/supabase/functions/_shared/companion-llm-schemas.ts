// 구조화 호출(검사 · 피드백 · 번역 · 추천 답변 · 기억)의 출력 스키마. Anthropic 구현(`companion-llm.ts`)이 `zodOutputFormat`으로 싣습니다.

import { z } from "zod";

import { moderationCategories } from "./companion-safety.ts";

export const verdictSchema = z.object({
  category: z.enum(moderationCategories),
  action: z.enum(["allow", "block", "crisis"]),
});

// 피드백 카드(학습자 메시지 `original`은 서버가 채운다). 구조화 출력은 선택 칸 대신 nullable로 둡니다.
export const feedbackSchema = z.object({
  status: z.enum(["ok", "none"]),
  kind: z.enum(["correction", "better", "l1_to_ko"]).nullable(),
  corrected: z.string().nullable(),
  items: z.array(z.object({ original: z.string(), corrected: z.string(), reason: z.string() })),
  better: z.object({ text: z.string(), meaning: z.string(), explanation: z.string() }).nullable(),
  meaning: z.string().nullable(),
});

export const translationSchema = z.object({ lines: z.array(z.string()) });

// 추천 답변 칩 후보. 의도(intent)는 열거로 묶고, 검증 · 고르기는 받은 뒤 `checkCandidates` · `pickShown`이 한다.
export const suggestionSchema = z.object({
  items: z.array(
    z.object({
      text: z.string(),
      meaning: z.string().nullable(),
      intent: z.enum(["elaborate", "ask", "reflect", "redirect", "boundary", "progress"]),
    }),
  ),
});

export const memorySchema = z.object({
  items: z.array(
    z.object({ kind: z.enum(["fact", "event"]), content: z.string(), shared: z.boolean() }),
  ),
});
