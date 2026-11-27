// 운영 검사(moderate) 재현 — runs/mod/<입력>.json의 사례를 운영 검사 함수에 그대로 넣는다.
// node --experimental-transform-types mod-run.ts <입력 json> <모델 표기> <출력 json>
import { readFileSync, writeFileSync } from "node:fs";
import { replyLlm, costOf } from "./lib.ts";
import type { LlmUsage } from "../../supabase/functions/_shared/chat-send.contract.ts";

const [input, spec, out] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(input, "utf8")) as { event_id: string; text: string; context: string | null; age_band: string }[];
const usage: LlmUsage[] = [];
const llm = replyLlm(spec, (entry) => usage.push(entry));
const results: Record<string, unknown>[] = [];
const limit = 8;
for (let i = 0; i < rows.length; i += limit) {
  await Promise.all(rows.slice(i, i + limit).map(async (row) => {
    const ageBand = (["adult", "minor", "unknown"].includes(row.age_band) ? row.age_band : "unknown") as "adult";
    try {
      const verdict = await llm.moderate({ layer: "input", text: row.text, context: row.context, ageBand, signal: AbortSignal.timeout(60_000) });
      results.push({ event_id: row.event_id, ...verdict });
    } catch (error) {
      results.push({ event_id: row.event_id, error: String(error) });
    }
  }));
}
writeFileSync(out, JSON.stringify(results, null, 1));
console.log(`${results.length}건 · $${usage.reduce((sum, entry) => sum + costOf(entry), 0).toFixed(3)}`);
