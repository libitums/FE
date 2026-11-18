// 결과 JSONL + 매니페스트 → 지표 → 요약 마크다운 한 장.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { estimateCost } from "./costs.mjs";
import { countBy, HUMAN_KEYS } from "./manifest.mjs";
import { readResults } from "./runner.mjs";
import { correlate, describe, histogram, pearson, quantile } from "./stats.mjs";
import { errorRates, towardReference } from "./text.mjs";
import { adapterById } from "./vendors.mjs";

const GROUPS = {
  모국어: (e) => e.speaker?.l1 ?? "(모름)",
  숙련도: (e) => e.speaker?.proficiency ?? "(모름)",
  유형: (e) => e.type,
};

/** 결과 폴더의 모든 실행(파일 이름 = 실행 id). */
export function loadRuns(outDir) {
  const dir = join(outDir, "results");
  if (!existsSync(dir)) return new Map();
  return new Map(
    readdirSync(dir)
      .filter((n) => n.endsWith(".jsonl"))
      .sort()
      .map((n) => [n.replace(/\.jsonl$/, ""), readResults(join(dir, n))]),
  );
}

const baseAdapterId = (runId) => runId.split("__via__")[0];

/** 공통 지표: 시도 · 성공 · 실패율(건너뜀 제외) · 지연 p50/p95 · 발화당 비용. */
export function runSummary(runId, results, entriesById, prices) {
  const records = [...results.values()];
  const attempted = records.filter((r) => !r.skipped);
  const ok = attempted.filter((r) => r.ok);
  const latencies = ok.map((r) => r.latencyMs);
  const cost = estimateCost(
    attempted.map((r) => entriesById.get(r.id)).filter(Boolean),
    prices?.vendors?.[baseAdapterId(runId)],
  );
  return {
    runId,
    attempted: attempted.length,
    ok: ok.length,
    skipped: records.length - attempted.length,
    failureRate: attempted.length ? (attempted.length - ok.length) / attempted.length : null,
    p50: quantile(latencies, 0.5),
    p95: quantile(latencies, 0.95),
    perUtterance: cost.perUtterance,
  };
}

/** 발음 평가: 벤더 점수 칸 × 사람 점수 칸의 상관. 묶음별(모국어 · 숙련도 · 유형)은 overall × 발음. */
export function pronMetrics(results, entries) {
  const rows = entries
    .map((e) => ({ e, r: results.get(e.id) }))
    .filter(({ r }) => r?.ok && r.scores);
  const scoreKeys = [
    ...new Set(
      rows.flatMap(({ r }) => Object.keys(r.scores).filter((k) => Number.isFinite(r.scores[k]))),
    ),
  ];
  const overall = {};
  for (const sk of scoreKeys) {
    for (const hk of HUMAN_KEYS) {
      overall[`${sk}~${hk}`] = correlate(
        rows.map(({ r }) => r.scores[sk]),
        rows.map(({ e }) => e.human?.[hk]),
      );
    }
  }
  const groups = {};
  for (const [name, keyOf] of Object.entries(GROUPS)) {
    const byKey = new Map();
    for (const row of rows) {
      const k = keyOf(row.e);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(row);
    }
    groups[name] = [...byKey.entries()].sort().map(([k, list]) => ({
      key: k,
      ...correlate(
        list.map(({ r }) => r.scores.overall),
        list.map(({ e }) => e.human?.pronunciation),
      ),
    }));
  }
  const overallScores = rows.map(({ r }) => r.scores.overall);
  return {
    n: rows.length,
    scoreKeys,
    overall,
    groups,
    distribution: describe(overallScores),
    histogram: histogram(overallScores, 0, 100, 10),
  };
}

/** 정답 전사: 사람 전사, 없으면 낭독형의 기준 문장(대체한 수를 셉니다). */
const truthOf = (e) => e.transcript ?? (e.type === "read" ? e.referenceText : null);

export function sttMetrics(results, entries) {
  const rows = entries
    .map((e) => ({ e, r: results.get(e.id) }))
    .filter(({ e, r }) => r?.ok && truthOf(e));
  const pairs = rows.map(({ e, r }) => ({ ref: truthOf(e), hyp: r.transcript ?? "" }));
  const groups = {};
  for (const [name, keyOf] of Object.entries(GROUPS)) {
    const byKey = new Map();
    for (const row of rows) {
      const k = keyOf(row.e);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push({ ref: truthOf(row.e), hyp: row.r.transcript ?? "" });
    }
    groups[name] = [...byKey.entries()].sort().map(([key, list]) => ({ key, ...errorRates(list) }));
  }
  const toward = towardReference(
    rows
      .filter(({ e }) => e.type === "read" && e.transcript && e.referenceText)
      .map(({ e, r }) => ({
        reference: e.referenceText,
        human: e.transcript,
        hyp: r.transcript ?? "",
      })),
  );
  return {
    ...errorRates(pairs),
    referenceFallback: rows.filter(({ e }) => !e.transcript).length,
    toward,
    groups,
  };
}

/** 낭독형에서 우회(STT 글을 기준 삼은) 점수와 정식 점수의 차이. */
export function viaVsFormal(viaResults, formalResults, entries) {
  const both = entries
    .filter((e) => e.type === "read")
    .map((e) => [formalResults.get(e.id), viaResults.get(e.id)])
    .filter(
      ([f, v]) =>
        f?.ok && v?.ok && Number.isFinite(f.scores?.overall) && Number.isFinite(v.scores?.overall),
    );
  const diffs = both.map(([f, v]) => v.scores.overall - f.scores.overall);
  return {
    n: both.length,
    meanDiff: diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null,
    meanAbsDiff: diffs.length ? diffs.reduce((a, b) => a + Math.abs(b), 0) / diffs.length : null,
    pearson: pearson(
      both.map(([f]) => f.scores.overall),
      both.map(([, v]) => v.scores.overall),
    ),
  };
}

const f = (v, d = 3) =>
  v === null || v === undefined ? "—" : typeof v === "number" ? v.toFixed(d) : String(v);
const pct = (v) => (v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`);
const ci = (c) => (c ? ` [${f(c[0], 2)}, ${f(c[1], 2)}]` : "");

/** 마크다운 한 장. */
export function buildReport({ entries, runs, prices, generatedAt }) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out = [
    `# 음성 벤더 비교 보고서`,
    ``,
    `만든 때: ${generatedAt} · 발화 ${entries.length}개`,
    ``,
  ];
  out.push(`## 1. 시험 세트`, ``);
  for (const [name, key] of [
    ["유형", "type"],
    ["모국어", "l1"],
    ["숙련도", "proficiency"],
  ]) {
    out.push(
      `- ${name}: ${Object.entries(countBy(entries, key))
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ")}`,
    );
  }
  for (const hk of HUMAN_KEYS) {
    const d = describe(entries.map((e) => e.human?.[hk]));
    out.push(`- 사람 점수 ${hk}: n=${d.n}, 평균 ${f(d.mean, 2)}, 표준편차 ${f(d.sd, 2)}`);
  }

  out.push(
    ``,
    `## 2. 공통 — 실패율 · 지연 · 비용`,
    ``,
    `| 실행 | 시도 | 성공 | 건너뜀 | 실패율 | 지연 p50(ms) | 지연 p95(ms) | 발화당 비용 |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|`,
  );
  for (const [runId, results] of runs) {
    const s = runSummary(runId, results, byId, prices);
    out.push(
      `| ${runId} | ${s.attempted} | ${s.ok} | ${s.skipped} | ${pct(s.failureRate)} | ${f(s.p50, 0)} | ${f(s.p95, 0)} | ${s.perUtterance === null ? "미정" : `${s.perUtterance.toFixed(4)} ${prices?.currency ?? ""}`} |`,
    );
  }
  out.push(
    ``,
    `건너뜀은 형식 · 길이 제한 때문에 보내지 않은 발화이며 실패율에 넣지 않습니다. 이유는 결과 JSONL의 \`reason\`에 있습니다.`,
  );

  const pronRuns = [...runs].filter(([id]) => adapterById(baseAdapterId(id))?.task === "pron");
  out.push(``, `## 3. 발음 평가 — 사람 점수와의 상관`, ``);
  if (pronRuns.length === 0) out.push(`(발음 평가 결과 없음)`);
  for (const [runId, results] of pronRuns) {
    const m = pronMetrics(results, entries);
    out.push(
      `### ${runId} (점수가 있는 발화 ${m.n}개)`,
      ``,
      `| 벤더 점수 ~ 사람 점수 | n | 피어슨 r [95% CI] | 스피어만 ρ |`,
      `|---|---:|---|---:|`,
    );
    for (const [pair, c] of Object.entries(m.overall))
      out.push(`| ${pair} | ${c.n} | ${f(c.pearson)}${ci(c.ci)} | ${f(c.spearman)} |`);
    for (const [name, list] of Object.entries(m.groups)) {
      out.push(
        ``,
        `${name}별 (overall ~ 사람 발음):`,
        ``,
        `| ${name} | n | 피어슨 r | 스피어만 ρ |`,
        `|---|---:|---:|---:|`,
      );
      for (const g of list) out.push(`| ${g.key} | ${g.n} | ${f(g.pearson)} | ${f(g.spearman)} |`);
    }
    const d = m.distribution;
    out.push(
      ``,
      `overall 분포: 평균 ${f(d.mean, 1)}, 표준편차 ${f(d.sd, 1)}, 최소 ${f(d.min, 1)}, 최대 ${f(d.max, 1)}`,
      ``,
      `| 구간 | 수 |`,
      `|---|---:|`,
    );
    for (const h of m.histogram) out.push(`| ${h.from}–${h.to} | ${h.count} |`);
    out.push(``);
  }

  const viaRuns = pronRuns.filter(([id]) => id.includes("__via__"));
  out.push(`## 4. 자유 발화 우회 평가 — 우회 점수와 정식 점수의 차이(낭독형)`, ``);
  if (viaRuns.length === 0) out.push(`(우회 실행 없음 — \`run --via-stt <STT 실행 id>\`)`);
  else
    out.push(
      `| 우회 실행 | n | 평균 차이(우회−정식) | 평균 절대 차이 | 피어슨 r |`,
      `|---|---:|---:|---:|---:|`,
    );
  for (const [runId, results] of viaRuns) {
    const v = viaVsFormal(results, runs.get(baseAdapterId(runId)) ?? new Map(), entries);
    out.push(
      `| ${runId} | ${v.n} | ${f(v.meanDiff, 2)} | ${f(v.meanAbsDiff, 2)} | ${f(v.pearson)} |`,
    );
  }

  const sttRuns = [...runs].filter(([id]) => adapterById(id)?.task === "stt");
  out.push(``, `## 5. 받아쓰기(STT)`, ``);
  if (sttRuns.length === 0) out.push(`(STT 결과 없음)`);
  else {
    out.push(
      `| 실행 | n | CER(띄어쓰기 뺌) | CER(띄어쓰기 포함) | WER(어절) | 기준 문장 쪽으로 받아 적음: 똑같이 / 더 가까이 (대상 n) | 정답을 기준 문장으로 대체 |`,
      `|---|---:|---:|---:|---:|---|---:|`,
    );
    const metrics = sttRuns.map(([id, results]) => [id, sttMetrics(results, entries)]);
    for (const [id, m] of metrics) {
      out.push(
        `| ${id} | ${m.n} | ${pct(m.cerNoSpace)} | ${pct(m.cerWithSpace)} | ${pct(m.wer)} | ${pct(m.toward.strict)} / ${pct(m.toward.loose)} (${m.toward.eligible}) | ${m.referenceFallback} |`,
      );
    }
    for (const name of Object.keys(GROUPS)) {
      out.push(
        ``,
        `${name}별 CER(띄어쓰기 뺌):`,
        ``,
        `| 실행 | ${name} | n | CER |`,
        `|---|---|---:|---:|`,
      );
      for (const [id, m] of metrics)
        for (const g of m.groups[name])
          out.push(`| ${id} | ${g.key} | ${g.n} | ${pct(g.cerNoSpace)} |`);
    }
  }

  out.push(
    ``,
    `## 6. 읽는 법`,
    ``,
    `README의 「보고서 읽는 법」을 보세요. 「기준 문장 쪽으로 받아 적음」은 사람 전사와 기준 문장이 다른 낭독 발화에서 벤더가 기준 문장과 똑같이(엄격) 또는 사람 전사보다 기준 문장에 더 가깝게(느슨) 받아 적은 비율입니다 — 높을수록 틀린 발음을 맞는 낱말로 고쳐 적는 경향이 큽니다.`,
    ``,
  );
  return out.join("\n");
}
