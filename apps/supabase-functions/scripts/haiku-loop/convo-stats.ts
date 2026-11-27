// 대화 자동 지표 — 말풍선 수 분포 · 행동 줄 · 다시 만들기 비율 · 남은 규칙 위반 · 지연 · 비용.
// node --experimental-transform-types convo-stats.ts <run 폴더>
import { readdirSync, readFileSync, statSync } from "node:fs";
import { replyViolations } from "../../supabase/functions/_shared/companion-reply-check.ts";

const base = `${process.argv[2]}/convo`;
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};
for (const arm of readdirSync(base).filter(
  (d) => !["prompts", "judge"].includes(d) && statSync(`${base}/${d}`).isDirectory(),
)) {
  const bub = [0, 0, 0, 0, 0];
  let turns = 0,
    action = 0,
    actionRow = 0,
    retry = 0,
    cost = 0;
  const v: Record<string, number> = {};
  const ms: number[] = [];
  const first: number[] = [];
  for (const f of readdirSync(`${base}/${arm}`).filter((x) => x.endsWith(".json"))) {
    const conv = JSON.parse(readFileSync(`${base}/${arm}/${f}`, "utf8"));
    let prevAction = false;
    for (const t of conv.turns) {
      turns++;
      bub[Math.min(4, t.reply.length)]++;
      const hasAction = t.reply.some((s: { kind: string }) => s.kind !== "speech");
      if (hasAction) action++;
      if (hasAction && prevAction) actionRow++;
      prevAction = hasAction;
      if (t.retry) retry++;
      for (const x of replyViolations(t.reply, conv.speechLevel)) v[x] = (v[x] ?? 0) + 1;
      ms.push(t.ms);
      if (t.firstMs != null) first.push(t.firstMs);
      cost += t.cost ?? 0;
    }
  }
  const r = (x: number) => `${Math.round((100 * x) / Math.max(1, turns))}%`;
  console.log(
    `${arm}: 턴 ${turns} · 말풍선 1/2/3/4+ = ${r(bub[1])}/${r(bub[2])}/${r(bub[3])}/${r(bub[4])} · 행동 줄 ${r(action)} (연달아 ${actionRow}) · 다시 만들기 ${r(retry)} · 남은 위반 ${JSON.stringify(v)} · 답 전체 p50/p90 ${pct(ms, 0.5)}/${pct(ms, 0.9)}ms · 첫 말풍선 p50/p90 ${pct(first, 0.5)}/${pct(first, 0.9)}ms · $${cost.toFixed(3)}`,
  );
}
