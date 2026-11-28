// 정적 평가: 고정 답장 세트(`companion-eval-sets.ts`, 108케이스)를 운영과 같은 `evalReply`로 돌린다. 채점은 하지 않고, 채점자(Opus 서브에이전트)에게
// 줄 글(`replyJudgeContent`)을 묶음 파일로 남긴다.
//
//   node --experimental-strip-types --no-warnings scripts/haiku-loop/static.ts --model haiku@low --split train --out <폴더>
//
// --cases <json>(실데이터 세트 — `runs/real/cases.json`) · --split train | holdout | all · --sets 세트 id 쉼표(생략하면 전부) · --concurrency 6 · --batch 12(채점 묶음 크기)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type {
  CompanionLlm,
  LlmUsage,
  ReplyJudgeRequest,
} from "../../supabase/functions/_shared/chat-send.contract.ts";
import { replyJudgeContent } from "../../supabase/functions/_shared/companion-eval-judge.ts";
import {
  evalReply,
  type ReplyEvalCase,
} from "../../supabase/functions/_shared/companion-eval-reply.ts";
import { companionEvalSets } from "../../supabase/functions/_shared/companion-eval-sets.ts";

import { argValue, costOf, personas, replyLlm, splitOf } from "./lib.ts";

const spec = argValue("model");
const split = argValue("split", "train");
const out = argValue("out");
const only = argValue("sets", "");
const concurrency = Number(argValue("concurrency", "6"));
const batchSize = Number(argValue("batch", "12"));
mkdirSync(out, { recursive: true });

const casesFile = argValue("cases", "");
const fromFile =
  casesFile === ""
    ? null
    : (JSON.parse(readFileSync(casesFile, "utf8")) as (ReplyEvalCase & { id: string })[]).map(
        (item) => ({ set: "real", item }),
      );
const cases = (
  fromFile ??
  companionEvalSets
    .filter((set) => set.kind === "reply")
    .filter((set) => only === "" || only.split(",").includes(set.id))
    .flatMap((set) => set.cases.map((item) => ({ set: set.id, item })))
).filter(({ item }) => split === "all" || splitOf(item.id) === split);

const cards = personas();
type Row = {
  set: string;
  id: string;
  split: string;
  ok: boolean;
  error?: string;
  ms: number;
  reply?: { kind: string; text: string }[];
  learned?: boolean | null;
  done?: boolean | null;
  usage: LlmUsage[];
  cost: number;
  judgeContent?: string;
};

async function runOne(set: string, item: ReplyEvalCase & { id: string }): Promise<Row> {
  const usage: LlmUsage[] = [];
  const llm = replyLlm(spec, (entry) => usage.push(entry));
  let captured: ReplyJudgeRequest | null = null;
  const judge = {
    judgeReply: async (request: ReplyJudgeRequest) => {
      captured = request;
      return { axes: {}, summary: "" };
    },
  } as unknown as CompanionLlm;
  const started = Date.now();
  try {
    const output = await evalReply({
      llm,
      judge,
      item,
      personas: cards,
      signal: AbortSignal.timeout(60_000),
      judgeErrorCode: () => "judge_error",
    });
    return {
      set,
      id: item.id,
      split: splitOf(item.id),
      ok: true,
      ms: Date.now() - started,
      reply: output.segments,
      learned: output.learned,
      done: output.done,
      usage,
      cost: usage.reduce((sum, entry) => sum + costOf(entry), 0),
      judgeContent: captured === null ? undefined : replyJudgeContent(captured),
    };
  } catch (error) {
    return {
      set,
      id: item.id,
      split: splitOf(item.id),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - started,
      usage,
      cost: usage.reduce((sum, entry) => sum + costOf(entry), 0),
    };
  }
}

const rows: Row[] = new Array(cases.length);
let next = 0;
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next < cases.length) {
      const index = next++;
      const { set, item } = cases[index]!;
      rows[index] = await runOne(set, item as ReplyEvalCase & { id: string });
    }
  }),
);

writeFileSync(join(out, "results.json"), JSON.stringify({ model: spec, split, rows }, null, 1));
const judged = rows.filter((row) => row.ok && row.judgeContent);
for (let start = 0, n = 1; start < judged.length; start += batchSize, n++) {
  const chunk = judged.slice(start, start + batchSize);
  const text = chunk
    .map((row) => `=== CASE ${row.set}/${row.id} ===\n${row.judgeContent}`)
    .join("\n\n");
  writeFileSync(join(out, `judge-${String(n).padStart(2, "0")}.txt`), text);
}
const ms = rows.map((row) => row.ms).sort((a, b) => a - b);
const pct = (p: number) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] ?? 0;
const failed = rows.filter((row) => !row.ok);
const total = rows.reduce((sum, row) => sum + row.cost, 0);
const outTokens = rows.flatMap((row) => row.usage).reduce((sum, u) => sum + u.outputTokens, 0);
console.log(
  JSON.stringify({
    model: spec,
    split,
    cases: rows.length,
    failed: failed.map((row) => `${row.id}:${row.error}`),
    p50ms: pct(0.5),
    p90ms: pct(0.9),
    avgOutputTokens: Math.round(outTokens / Math.max(1, rows.length)),
    costUsd: Number(total.toFixed(4)),
    judgeFiles: Math.ceil(judged.length / batchSize),
  }),
);
