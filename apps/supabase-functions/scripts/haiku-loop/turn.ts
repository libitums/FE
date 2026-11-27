// 대화 평가: 학습자 역할(서브에이전트)이 한 턴씩 부르는 실행기. 운영 턴(`chat-send-turn.ts`)의 답 부분을 그대로 따른다 — 화제 상태 · 분기 지시
// (`chooseBranch`) · 스토리 카드(`pickStory`) · 학습 표현 결과(`resolveLearning`) · 다음 화제 상태(`nextTopicState`). 검사 · 피드백 · 번역 · 칩 ·
// 기억 · 요약은 부르지 않는다(답 품질만 본다).
//
//   새 대화: turn.ts new --conv <파일> --character duksu --model haiku@low [--learning ep2] [--age adult] [--l1 en] [--speech polite] [--tier standard]
//   한 턴:   turn.ts say --conv <파일> --text "학습자 말"
//   보기:    turn.ts show --conv <파일>

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import type {
  HistoryEntry,
  LlmUsage,
  PersonaCard,
  TopicState,
} from "../../supabase/functions/_shared/chat-send.contract.ts";
import {
  learningDay,
  learningSettingsFrom,
  resolveLearning,
} from "../../supabase/functions/_shared/chat-send-learning.ts";
import { withStoryDirective } from "../../supabase/functions/_shared/chat-send-story.ts";
import {
  chooseBranch,
  nextTopicState,
  topicStateFrom,
} from "../../supabase/functions/_shared/companion-branching.ts";
import type { LearningContext } from "../../supabase/functions/_shared/companion-learning.contract.ts";
import { systemSplit } from "../../supabase/functions/_shared/companion-llm.ts";
import {
  companionSystemPrompt,
  joinDirectives,
  personaAnchor,
} from "../../supabase/functions/_shared/companion-prompt.ts";
import {
  collectSegments,
  createSegmentSplitter,
  type SegmentDelta,
} from "../../supabase/functions/_shared/companion-segments.ts";
import { eligibleBeats, pickStory } from "../../supabase/functions/_shared/companion-story.ts";

import { argValue, costOf, learningContext, personas, replyLlm } from "./lib.ts";
import { collect, historyText, pick } from "./bestof.ts";
import { dropRepeatedAction, replyViolations, retryDirective } from "../../supabase/functions/_shared/companion-reply-check.ts";

type Segment = { kind: string; text: string };
type Conversation = {
  model: string;
  characterId: string;
  persona: PersonaCard;
  speechLevel: "polite" | "casual" | "slang";
  ageBand: "adult" | "minor" | "unknown";
  romanceTier: "open" | "standard";
  l1: string | null;
  learningKey: string;
  learning: LearningContext;
  topicState: Partial<TopicState> | null;
  intimacy: number;
  history: HistoryEntry[];
  turns: {
    user: string;
    reply: Segment[];
    branch: string | null;
    directive: string | null;
    learned: boolean;
    ms: number;
    firstMs: number | null;
    usage: LlmUsage[];
    cost: number;
  }[];
};

// 운영의 첫 인사(origin greeting)는 인물마다 정해진 글이다(운영 DB 표본).
const greetings: Record<string, string[]> = {
  duksu: ["안녕하세요! 덕수쌤이에요.", "한국어나 한국 문화에 대해 궁금한 게 있으면 언제든지 물어봐요."],
  daeun: ["안녕하세요! 송다은이에요.", "어느 나라에서 왔어요? 저 외국인 친구 처음이에요!"],
  geonwoo: ["안녕하세요! 임건우예요.", "한국 음식 뭐 좋아해요? 맛집 알려 줄게요."],
};

const command = process.argv[2];
const path = argValue("conv");

const load = (): Conversation => JSON.parse(readFileSync(path, "utf8")) as Conversation;
const save = (conv: Conversation) => writeFileSync(path, JSON.stringify(conv, null, 1));
const speak = (segments: readonly Segment[]) =>
  segments.map((s) => (s.kind === "action" ? `(${s.text})` : s.text)).join("\n");

if (command === "new") {
  if (existsSync(path) && !process.argv.includes("--force")) throw new Error(`${path} exists`);
  const characterId = argValue("character");
  const persona = personas().get(characterId);
  if (!persona) throw new Error(`unknown character ${characterId}`);
  const learningKey = argValue("learning", "ep2");
  const greeting = greetings[characterId] ?? [`안녕하세요! ${persona.name}이에요.`];
  const conv: Conversation = {
    model: argValue("model"),
    characterId,
    persona,
    speechLevel: argValue("speech", "polite") as Conversation["speechLevel"],
    ageBand: argValue("age", "adult") as Conversation["ageBand"],
    romanceTier: argValue("tier", "standard") as Conversation["romanceTier"],
    l1: argValue("l1", "en"),
    learningKey,
    learning: learningContext(learningKey) as unknown as LearningContext,
    topicState: null,
    intimacy: 0,
    history: [
      { role: "assistant", segments: greeting.map((text) => ({ kind: "speech" as const, text })) },
    ],
    turns: [],
  };
  save(conv);
  console.log(`${persona.name}:\n${greeting.join("\n")}`);
} else if (command === "say") {
  const conv = load();
  const text = argValue("text").trim();
  if (text === "") throw new Error("empty --text");
  const now = Date.now();
  const topicState = topicStateFrom(conv.topicState);
  const learning = conv.learning;
  const settings = learningSettingsFrom(learning);
  // 끝의 `+lt`: 운영의 턴 뒤 작업을 흉내 낸다(i16) — 요약(최근 20개를 남기고 그 밖에 30개가 모이면, companion_summary_source와 같은 값)과
  // 기억(유저 메시지 5개마다, settings.memory_every 기본값). 답 모델과 같은 계층의 summarize · extractMemories를 그대로 부른다.
  const longTerm = /\+lt/.test(conv.model);
  const today = learningDay(now);
  const story = pickStory(conv.characterId, learning.episodes, topicState, now);
  const branch = chooseBranch(topicState, {
    userText: text,
    persona: conv.persona,
    learning: {
      pool: learning.expressions,
      episodes: learning.episodes,
      settings,
      manualEmpty: false,
      chipsOn: true,
      today,
    },
    random: Math.random,
    beats: eligibleBeats(conv.characterId, learning.episodes, topicState.beatsUsed),
  });
  const prompt = companionSystemPrompt({
    persona: conv.persona,
    characterId: conv.characterId,
    speechLevel: conv.speechLevel,
    intimacy: conv.intimacy,
    ageBand: conv.ageBand,
    l1: conv.l1,
    expressions: learning.expressions,
    summary: longTerm ? (conv.summary ?? null) : null,
    feedbackMode: "separate",
    memories: longTerm ? ((conv.memories ?? []) as string[]) : [],
    directive: null,
    story: story.text,
    romanceTier: conv.romanceTier,
  });
  const directive = joinDirectives(withStoryDirective(null, branch.directive), personaAnchor(conv.persona, conv.speechLevel));
  const usage: LlmUsage[] = [];
  // 모델 표기 끝의 `+bo2`: 답 2개를 만들고 Haiku 선택자가 고른다(best-of-2 실험, 하니스 전용).
  // 끝의 `+rc`: 답을 규칙 검사(companion-reply-check)하고 어기면 그 턴만 한 번 다시 만든다(i10).
  const recheck = /\+rc/.test(conv.model);
  const modelSpec = conv.model.replace(/\+rc/, "").replace(/\+lt/, "");
  const bestOf = /\+bo(\d)$/.exec(modelSpec);
  const llm = replyLlm(modelSpec.replace(/\+bo\d$/, ""), (entry) => usage.push(entry));
  let splitter = createSegmentSplitter();
  const deltas: SegmentDelta[] = [];
  let firstMs: number | null = null;
  let pickCost = 0;
  const request = {
    system: `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    history: longTerm ? conv.history.slice(conv.summarizedUntil ?? 0) : conv.history,
    userText: text,
    directive,
    signal: AbortSignal.timeout(60_000),
  };
  if (bestOf) {
    const n = Number(bestOf[1]);
    const candidates = await Promise.all(Array.from({ length: n }, () => collect(llm, request)));
    const chosen = await pick(conv.persona, conv.speechLevel, historyText(conv.persona.name, conv.history as never), text, candidates, (usd) => (pickCost += usd));
    deltas.push(...splitter.push(candidates[chosen] ?? ""));
    firstMs = Date.now() - now;
  } else {
    for await (const chunk of llm.reply(request)) {
      const items = splitter.push(chunk);
      if (firstMs === null && items.length > 0) firstMs = Date.now() - now;
      deltas.push(...items);
    }
  }
  deltas.push(...splitter.end());
  let state = splitter.state();
  let segments = collectSegments(deltas).map(({ kind, text: t }) => ({ kind, text: t }));
  let retry: { first: string[]; second: string[]; firstReply: typeof segments; firstMs: number } | null = null;
  const previousReplies = (conv.history as { role: string; segments?: { kind: string; text: string }[] }[])
    .filter((entry) => entry.role === "assistant" && entry.segments !== undefined)
    .map((entry) => entry.segments as { kind: string; text: string }[]);
  const found = recheck ? replyViolations(segments, conv.speechLevel, previousReplies) : [];
  if (found.length > 0) {
    const firstDoneMs = Date.now() - now;
    const again = createSegmentSplitter();
    const raw = await collect(llm, { ...request, directive: joinDirectives(directive, retryDirective(found)) });
    const redo = collectSegments([...again.push(raw), ...again.end()]).map(({ kind, text: t }) => ({ kind, text: t }));
    const second = replyViolations(redo, conv.speechLevel, previousReplies);
    retry = { first: found, second, firstReply: segments, firstMs: firstDoneMs };
    if (redo.length > 0 && second.length <= found.length) {
      segments = redo;
      state = again.state() ?? state;
      splitter = again;
    }
  }
  if (recheck) {
    const last = [...conv.history].reverse().find((entry) => entry.role === "assistant") as { segments?: { kind: string; text: string }[] } | undefined;
    segments = dropRepeatedAction(segments, last?.segments ?? null);
  }
  const result = resolveLearning(branch.learning, state, segments, false);
  conv.topicState = nextTopicState(topicState, {
    userText: text,
    turnState: state,
    action: branch.action,
    learning: result,
    today,
    maxSkipStreak: settings.maxSkipStreak,
    story,
    nowMs: now,
  });
  conv.intimacy = Math.max(0, conv.intimacy + (state?.intimacyDelta ?? 0));
  conv.history.push({ role: "user", text });
  if (segments.length > 0) conv.history.push({ role: "assistant", segments: segments as never });
  conv.turns.push({
    user: text,
    reply: segments,
    branch: branch.action?.kind ?? null,
    directive,
    learned: result.done,
    ...(retry ? { retry } : {}),
    ms: Date.now() - now,
    firstMs,
    usage,
    cost: usage.reduce((sum, entry) => sum + costOf(entry), 0) + pickCost,
  });
  if (longTerm) await afterTurn(conv, llm, usage);
  save(conv);
  console.log(`${conv.persona.name}:\n${segments.length > 0 ? speak(segments) : "(빈 답 — 오류)"}`);
} else if (command === "show") {
  const conv = load();
  for (const entry of conv.history)
    console.log(
      entry.role === "user" ? `학습자: ${entry.text}` : `${conv.persona.name}: ${speak(entry.segments)}`,
    );
} else {
  throw new Error("usage: turn.ts new|say|show --conv <file> ...");
}

/** 운영 `companion-after-turn.ts`의 하니스 판 — 기억 묶음(유저 메시지 5개) · 요약(남길 20개 밖에 30개). 실패해도 턴은 그대로. */
async function afterTurn(conv: any, llm: any, usage: LlmUsage[]): Promise<void> {
  const keep = 20, summaryAfter = 30, memoryEvery = 5;
  conv.memories ??= [];
  conv.memoryUntil ??= 0;
  conv.summarizedUntil ??= 0;
  conv.longTermLog ??= [];
  try {
    const pending = conv.history.slice(conv.memoryUntil);
    if (pending.filter((entry: { role: string }) => entry.role === "user").length >= memoryEvery) {
      const refs = (conv.memories as string[]).map((content, index) => ({ ref: `m${index + 1}`, content, shared: false, locked: false }));
      const ops = await llm.extractMemories({ messages: pending, existing: refs, minor: conv.ageBand !== "adult", signal: AbortSignal.timeout(60_000) });
      const next = [...conv.memories] as (string | null)[];
      for (const op of ops) {
        const index = op.op === "add" ? -1 : Number(String(op.ref).slice(1)) - 1;
        if (op.op === "add") next.push(op.content);
        else if (op.op === "update" && next[index] !== undefined) next[index] = op.content;
        else if (op.op === "forget" && next[index] !== undefined) next[index] = null;
      }
      conv.memories = next.filter((content): content is string => typeof content === "string");
      conv.memoryUntil = conv.history.length;
      conv.longTermLog.push({ at: conv.turns.length, kind: "memory", ops: ops.length, total: conv.memories.length });
    }
    const unsummarized = conv.history.slice(conv.summarizedUntil);
    const candidates = unsummarized.length - keep;
    if (candidates >= summaryAfter) {
      conv.summary = await llm.summarize({ previous: conv.summary ?? null, messages: unsummarized.slice(0, candidates), signal: AbortSignal.timeout(60_000) });
      conv.summarizedUntil += candidates;
      conv.longTermLog.push({ at: conv.turns.length, kind: "summary", summarized: candidates, chars: String(conv.summary).length });
    }
  } catch (error) {
    conv.longTermLog.push({ at: conv.turns.length, kind: "error", message: String(error) });
  }
  void usage;
}
