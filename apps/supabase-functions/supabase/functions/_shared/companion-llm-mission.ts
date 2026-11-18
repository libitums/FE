// 미션 LLM 계층(ADR-0160) — 기존 `CompanionLlm`에 채점(`gradeMission`) · 힌트(`missionHint`)를 더하고, 가짜 계층에는 미션 답(상태 줄)을
// 더합니다. 기존 메서드는 그대로 넘깁니다 — 컴패니언 턴은 이 계층을 써도 같은 호출이 됩니다(가짜 답은 미션 시스템 프롬프트일 때만 갈린다).
// 모델: 채점은 `COMPANION_MISSION_GRADER_MODEL`(없으면 답 모델), 힌트는 추천 답변 칩 모델(`missionModelsFrom`).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import type {
  ChatSendEnv,
  CompanionLlm,
  LlmStep,
  LlmUsage,
  ReplyRequest,
} from "./chat-send.contract.ts";
import { companionLlmFor } from "./companion-llm.ts";
import { fakeCompanionLlm } from "./companion-llm-fake.ts";
import { graderSchema, graderSystem, type GraderDraft } from "./mission-grader.ts";
import { hintSchema, hintSystem, type HintDraft } from "./mission-hint.ts";
import { missionModelsFrom, missionGraderMaxTokens, type MissionModels } from "./mission-env.ts";
import type { MissionGraderDraft, MissionHintDraft } from "./mission-llm.contract.ts";

// 계약의 결과 모양과 코어 스키마가 같은지 컴파일로 확인한다.
const sameGrader = (draft: GraderDraft): MissionGraderDraft => draft;
const sameHint = (draft: HintDraft): MissionHintDraft => draft;

export class MissionLlmUnavailable extends Error {}

/** Anthropic 미션 호출 — 기존 계층(`base`)을 감싸 채점 · 힌트를 더한다. */
export function anthropicMissionLlm(
  base: CompanionLlm,
  config: Extract<ChatSendEnv["llm"], { kind: "anthropic" }>,
  models: MissionModels,
  onUsage: (usage: LlmUsage) => void = () => {},
  client: Anthropic = new Anthropic({ apiKey: config.apiKey, maxRetries: 0 }),
): CompanionLlm {
  async function parse<T>(
    step: LlmStep,
    model: string,
    schema: z.ZodType<T>,
    system: string,
    user: string,
    signal: AbortSignal,
  ): Promise<T> {
    const response = await client.messages.parse(
      {
        model,
        max_tokens: missionGraderMaxTokens,
        output_config: { effort: "low", format: zodOutputFormat(schema) },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
      },
      { signal },
    );
    const usage = response.usage;
    if (usage !== undefined)
      onUsage({
        step,
        model,
        inputTokens: usage.input_tokens,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
        outputTokens: usage.output_tokens,
      });
    if (response.stop_reason === "refusal" || response.parsed_output === null)
      throw new MissionLlmUnavailable(String(response.stop_reason));
    return response.parsed_output as T;
  }
  return {
    ...base,
    graderModel: models.graderModel,
    gradeMission: async (request) =>
      sameGrader(
        await parse(
          "mission_grade",
          models.graderModel,
          graderSchema,
          graderSystem,
          request.user,
          request.signal,
        ),
      ),
    missionHint: async (request) =>
      sameHint(
        await parse(
          "mission_hint",
          models.hintModel,
          hintSchema,
          hintSystem,
          request.user,
          request.signal,
        ),
      ),
    withUsage: (record) =>
      anthropicMissionLlm(base.withUsage?.(record) ?? base, config, models, record, client),
  };
}

// ------------------------------------------------------------------ 가짜(결정적)

/** 미션 턴의 시스템 프롬프트인가(`missionTurnStableTemplate`의 첫 줄). */
export const isMissionSystem = (system: string) => system.includes("short role-play mission");

const goalLine = /^- \[([ x])\] ([a-z][a-z0-9_]*) \((required|optional)\):/gm;

/**
 * 가짜 미션 답. 학습자 말의 낱말로 흐름을 일으킨다:
 *   「[goal:<id>]」 → 그 목표 달성   「[all-goals]」 → 모든 목표 달성   「[off-task]」 → off_task
 *   「[no-state]」 → 상태 줄 없음   「[bad-state]」 → 깨진 상태 줄   「[unsafe-reply]」 → 출력 검사에 걸리는 답(다시 만들기 지시면 통과)
 * 필수 목표가 모두 끝나면 마무리 대사와 `closing: true`.
 */
export async function* fakeMissionReply(request: ReplyRequest): AsyncIterable<string> {
  const goals = [...request.system.matchAll(goalLine)].map((match) => ({
    id: match[2] ?? "",
    done: match[1] === "x",
    required: match[3] === "required",
  }));
  const text = request.userText;
  const reported = new Set(goals.filter((goal) => goal.done).map((goal) => goal.id));
  for (const match of text.matchAll(/\[goal:([a-z][a-z0-9_]*)\]/g)) reported.add(match[1] ?? "");
  if (text.includes("[all-goals]")) for (const goal of goals) reported.add(goal.id);
  const closing = goals.every((goal) => !goal.required || reported.has(goal.id));
  const unsafe = text.includes("[unsafe-reply]") && !request.directive?.includes("withheld");
  const lines = [
    "@action 고개를 끄덕인다",
    unsafe ? "@speech [unsafe] 위험한 답" : "@speech 네, 알겠습니다.",
    closing ? "@speech 여기 있습니다. 좋은 하루 보내세요!" : "@speech 또 필요한 거 있으세요?",
  ];
  if (text.includes("[bad-state]")) lines.push('@state {"goals_done": [');
  else if (!text.includes("[no-state]"))
    lines.push(
      `@state ${JSON.stringify({ goals_done: [...reported].filter((id) => id !== ""), off_task: text.includes("[off-task]"), closing })}`,
    );
  for (const line of lines) {
    if (request.signal.aborted) throw new Error("aborted");
    yield line.slice(0, 6);
    yield `${line.slice(6)}\n`;
  }
}

const section = (user: string, title: string): string => {
  const start = user.indexOf(`# ${title}`);
  if (start === -1) return "";
  const body = user.slice(user.indexOf("\n", start) + 1);
  const end = body.indexOf("\n# ");
  return (end === -1 ? body : body.slice(0, end)).trim();
};
const jsonSection = (user: string, title: string): unknown => {
  try {
    return JSON.parse(section(user, title));
  } catch {
    return [];
  }
};

/**
 * 가짜 채점: 턴에서 쌓인 목표는 달성(근거 없음), 대화에 「[grader:<id>]」가 있으면 그 목표도 달성(근거 = 그 줄). 표현은 대화에
 * 「[expr:<id>]」가 있으면 사용. 정확도 80. 「[grade-fail]」 → 실패(던짐), 「[grade-empty]」 → 빈 결과(목표 · 표현 없음).
 */
export function fakeGrade(user: string): MissionGraderDraft {
  const transcript = section(user, "Conversation");
  if (transcript.includes("[grade-fail]")) throw new MissionLlmUnavailable("fake grade failure");
  const goals = jsonSection(user, "Goals (JSON)") as { id: string }[];
  const expressions = jsonSection(user, "Target expressions (JSON)") as { id: string }[];
  if (transcript.includes("[grade-empty]"))
    return { goals: [], accuracy: 80, expressions: [], retry: [], summary: "가짜 채점" };
  const turnDone = jsonSection(user, "Goals the app marked done during the conversation (JSON)");
  const marked = new Set(Array.isArray(turnDone) ? (turnDone as string[]) : []);
  const lines = transcript.split("\n");
  return {
    goals: goals.map(({ id }) => {
      const line = lines.find((entry) => entry.includes(`[grader:${id}]`));
      const learnerLine = line?.startsWith("Learner: ") ? line.slice("Learner: ".length) : null;
      return { id, done: marked.has(id) || learnerLine !== null, evidence: learnerLine };
    }),
    accuracy: 80,
    expressions: expressions.map(({ id }) => ({ id, used: transcript.includes(`[expr:${id}]`) })),
    retry: [{ ko: "아메리카노 얼마예요?", meaning: "How much is an americano?" }],
    summary: "가짜 채점 — 잘했어요.",
  };
}

/** 가짜 힌트: 목표 id로 만든 고정 문장. 대화에 「[hint-fail]」이면 던지고, 「[hint-empty]」면 빈 문장. */
export function fakeHint(user: string): MissionHintDraft {
  const transcript = section(user, "Conversation so far");
  if (transcript.includes("[hint-fail]")) throw new MissionLlmUnavailable("fake hint failure");
  const goal = section(user, "Goal to reach now").split(":")[0]?.trim() ?? "";
  if (transcript.includes("[hint-empty]")) return { ko: " ", roman: "", meaning: "" };
  return { ko: `${goal} 할게요.`, roman: `${goal} halgeyo.`, meaning: `(fake) do ${goal}` };
}

/** 가짜 계층(`fakeCompanionLlm`)에 미션 답 · 채점 · 힌트를 더한 것. 컴패니언 답은 그대로 넘긴다. */
export function fakeMissionLlm(base: CompanionLlm = fakeCompanionLlm()): CompanionLlm {
  return {
    ...base,
    reply: (request) =>
      isMissionSystem(request.system) ? fakeMissionReply(request) : base.reply(request),
    graderModel: "fake",
    gradeMission: async (request) => fakeGrade(request.user),
    missionHint: async (request) => fakeHint(request.user),
  };
}

/** 미션까지 아는 LLM 계층. `read`는 환경 값(채점 모델 이름). `chat-send` · 미션 함수의 진입 파일이 쓴다. */
export function missionLlmFor(
  env: ChatSendEnv,
  read: (name: string) => string | undefined,
): CompanionLlm {
  const base = companionLlmFor(env);
  if (env.llm.kind === "fake") return fakeMissionLlm(base);
  return anthropicMissionLlm(base, env.llm, missionModelsFrom(read));
}
