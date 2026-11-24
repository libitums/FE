// 내 스토리 반응의 **실제 모델** 평가(ADR-0191 D5) — 답 모델을 고르려고 같은 세트를 모델만 바꿔 돌린다. 돈이 든다(아래 추정).
// `test:unit` · `test:integration`에는 걸리지 않는다(이름이 다르다). 키가 없으면 건너뛴다.
//
//   cd apps/supabase-functions
//   ANTHROPIC_API_KEY=… npx vitest run supabase/evals/story-reactions.eval
//
// 고르기(환경 변수, 모두 선택):
//   EVAL_MODELS  쉼표로 — 기본 `claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5`
//   EVAL_SETS    쉼표로 — 기본 `story-reaction-words,story-reaction-photos`
//   EVAL_CASES   쉼표로 케이스 id — 기본 전부
//   EVAL_JUDGE   채점 모델 — 기본 `claude-opus-5-5`(실행끼리 견주려면 바꾸지 않는다)
//   EVAL_OUT     결과 파일 — 기본 `supabase/evals/out/story-reactions-<시각>.json`(+ 같은 이름의 `.md`)
// 추정 비용(캐시 없이): 케이스 하나 = 답(입력 약 2.8k · 출력 약 300) + 채점(Opus, 입력 약 2k · 출력 약 400 ≈ $0.016).
// 26케이스 × 3모델 ≈ 답 $0.7 + 채점 $1.3 ≈ $2.
// 페르소나는 운영과 같은 캐릭터 카드다 — 마이그레이션을 내장 Postgres에 올려 `companion_inspect_characters`로 읽는다.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

import type {
  ChatSendEnv,
  PersonaCard,
  ReplyJudgement,
} from "../functions/_shared/chat-send.contract.ts";
import { defaultJudgeModel } from "../functions/_shared/companion-eval-judge.ts";
import { evalReply } from "../functions/_shared/companion-eval-reply.ts";
import { storyReactionSets } from "../functions/_shared/companion-eval-sets-reactions.ts";
import { companionLlmWithModel } from "../functions/_shared/companion-llm.ts";
import { mapLimited } from "../functions/_shared/map-limited.ts";
import { startTestDatabase } from "../migrations/postgres.test-support";

const apiKey = process.env["ANTHROPIC_API_KEY"]?.trim() ?? "";
const list = (name: string, fallback: string[]) => {
  const values = (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  return values.length === 0 ? fallback : values;
};
const models = list("EVAL_MODELS", ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]);
const setIds = list(
  "EVAL_SETS",
  storyReactionSets.map((set) => set.id),
);
const caseIds = list("EVAL_CASES", []);
const judgeModel = process.env["EVAL_JUDGE"]?.trim() || defaultJudgeModel;
const here = dirname(fileURLToPath(import.meta.url));

type Row = {
  set: string;
  id: string;
  characterId: string;
  model: string;
  angle: string;
  reply: string;
  ms: number;
  axes: ReplyJudgement["axes"] | null;
  summary: string | null;
  error: string | null;
};
const failedAxes = (row: Row) =>
  Object.entries(row.axes ?? {})
    .filter(([, axis]) => axis !== null && !axis.pass)
    .map(([name]) => name);

function report(rows: Row[]): string {
  const out: string[] = ["# 내 스토리 반응 평가", "", `채점: ${judgeModel}`, ""];
  out.push(
    "| 모델 | 케이스 | 모든 축 통과 | 오류 | 축별 실패 |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const model of models) {
    const mine = rows.filter((row) => row.model === model);
    const counts = new Map<string, number>();
    for (const row of mine)
      for (const axis of failedAxes(row)) counts.set(axis, (counts.get(axis) ?? 0) + 1);
    const clean = mine.filter((row) => row.error === null && failedAxes(row).length === 0).length;
    const axes = [...counts].map(([axis, count]) => `${axis} ${count}`).join(" · ") || "—";
    out.push(
      `| ${model} | ${mine.length} | ${clean} | ${mine.filter((row) => row.error !== null).length} | ${axes} |`,
    );
  }
  for (const id of [...new Set(rows.map((row) => `${row.set} / ${row.id}`))]) {
    const group = rows.filter((row) => `${row.set} / ${row.id}` === id);
    out.push("", `## ${id} — ${group[0]!.characterId} · ${group[0]!.angle}`);
    for (const row of group) {
      const failed = failedAxes(row);
      const verdict =
        row.error !== null
          ? `오류 ${row.error}`
          : failed.length === 0
            ? "통과"
            : `실패: ${failed.join(", ")}`;
      out.push(`- **${row.model}** (${row.ms} ms) — ${verdict}`, `  - ${row.reply || "(답 없음)"}`);
      for (const axis of failed)
        out.push(`  - ${axis}: ${row.axes?.[axis as keyof ReplyJudgement["axes"]]?.reason ?? ""}`);
    }
  }
  return `${out.join("\n")}\n`;
}

test.skipIf(apiKey === "")(
  "내 스토리 반응 — 실제 모델로 세트를 돌리고 채점 결과를 파일로 남긴다",
  async () => {
    const env: ChatSendEnv = {
      supabaseUrl: "http://localhost",
      supabaseAnonKey: "unused",
      supabaseServiceRoleKey: "unused",
      llm: {
        kind: "anthropic",
        apiKey,
        model: judgeModel,
        moderationModel: judgeModel,
        feedbackModel: judgeModel,
        translationModel: judgeModel,
      },
      translation: "every",
    };
    const db = await startTestDatabase();
    let personas: Map<string, PersonaCard>;
    try {
      const cards = (await db.admin.query("select public.companion_inspect_characters() as c"))
        .rows[0].c as { id: string; persona: PersonaCard }[];
      personas = new Map(cards.map((card) => [card.id, card.persona]));
    } finally {
      await db.close();
    }
    const judge = companionLlmWithModel(env, judgeModel);
    const jobs = storyReactionSets
      .filter((set) => setIds.includes(set.id))
      .flatMap((set) =>
        set.cases
          .filter((item) => caseIds.length === 0 || caseIds.includes(item.id))
          .flatMap((item) => models.map((model) => ({ set: set.id, item, model }))),
      );
    expect(jobs.length).toBeGreaterThan(0);
    let finished = 0;
    // 진행을 한 줄씩 찍는다 — 끝나기 전에는 결과 파일이 없다.
    const progress = (row: Row): Row => {
      finished += 1;
      const failed = failedAxes(row);
      const verdict = row.error ?? (failed.length === 0 ? "통과" : `실패 ${failed.join(",")}`);
      console.log(`[${finished}/${jobs.length}] ${row.id} ${row.model} — ${verdict}`);
      return row;
    };
    const rows = await mapLimited(jobs, 4, async ({ set, item, model }): Promise<Row> => {
      const started = Date.now();
      const base = {
        set,
        id: item.id,
        characterId: item.characterId ?? "",
        model,
        angle: item.storyReaction?.angle ?? "",
      };
      try {
        const output = await evalReply({
          llm: companionLlmWithModel(env, model),
          judge,
          item,
          personas,
          signal: AbortSignal.timeout(90_000),
          judgeErrorCode: (error) =>
            error instanceof Error ? error.message.slice(0, 80) : "judge_failed",
        });
        return progress({
          ...base,
          reply: output.segments
            .map((segment) => (segment.kind === "speech" ? segment.text : `*${segment.text}*`))
            .join(" / "),
          ms: Date.now() - started,
          axes: output.judge?.axes ?? null,
          summary: output.judge?.summary ?? null,
          error: output.judgeError,
        });
      } catch (error) {
        return progress({
          ...base,
          reply: "",
          ms: Date.now() - started,
          axes: null,
          summary: null,
          error: error instanceof Error ? error.message.slice(0, 120) : "failed",
        });
      }
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file =
      process.env["EVAL_OUT"]?.trim() || join(here, "out", `story-reactions-${stamp}.json`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify({ judgeModel, models, rows }, null, 2)}\n`);
    await writeFile(file.replace(/\.json$/, ".md"), report(rows));
    console.log(`\n${report(rows).split("\n## ")[0]}\n결과: ${file}`);
    // 평가는 견주려고 돌린다 — 채점 실패로 테스트를 깨지 않는다. 답을 하나도 못 만들었을 때만 실패.
    expect(rows.some((row) => row.reply !== "")).toBe(true);
  },
  30 * 60_000,
);
