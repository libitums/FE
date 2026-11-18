// 예상 비용: 대상 발화 수 × 단가. 단가는 prices.json(고칠 수 있는 파일)에서 읽고, 모르는 값은
// 「미정」으로 남깁니다. 길이가 없는 발화는 길이를 아는 발화의 평균으로 채우고 그 수를 밝힙니다.

import { readFileSync } from "node:fs";

import { tasksFor } from "./runner.mjs";

export const loadPrices = (path) => JSON.parse(readFileSync(path, "utf8"));

/** 발화 목록 하나에 단가 하나를 적용합니다. */
export function estimateCost(entries, price) {
  const known = entries.map((e) => e.durationSec).filter((d) => Number.isFinite(d) && d > 0);
  const fill = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
  const durations = entries.map((e) =>
    Number.isFinite(e.durationSec) && e.durationSec > 0 ? e.durationSec : fill,
  );
  const missingDuration = entries.length - known.length;
  const totalSec = durations.every(Number.isFinite) ? durations.reduce((a, b) => a + b, 0) : null;

  let units = null;
  if (price?.unit === "request") units = entries.length;
  else if (totalSec !== null && price?.unit === "hour") units = totalSec / 3600;
  else if (totalSec !== null && price?.unit === "minute") units = totalSec / 60;
  else if (totalSec !== null && price?.unit === "per15s")
    units = durations.reduce((a, d) => a + Math.max(1, Math.ceil(d / 15)), 0);

  const cost = units !== null && Number.isFinite(price?.price) ? units * price.price : null;
  return {
    n: entries.length,
    totalSec,
    missingDuration,
    unit: price?.unit ?? null,
    units,
    cost,
    perUtterance: cost !== null && entries.length ? cost / entries.length : null,
  };
}

/** 고른 벤더마다 대상 발화를 세어 예상 비용을 냅니다. 우회 경로는 STT 결과 전이라 전체 발화로 셉니다. */
export function estimateAll(adapters, entries, prices, { via = false } = {}) {
  const rows = adapters.map((adapter) => ({
    id: adapter.id,
    ...estimateCost(
      tasksFor(adapter, entries).map((t) => t.entry),
      prices.vendors?.[adapter.id],
    ),
  }));
  if (via) {
    for (const adapter of adapters.filter((a) => a.task === "pron")) {
      rows.push({
        id: `${adapter.id}__via__(STT)`,
        ...estimateCost(entries, prices.vendors?.[adapter.id]),
      });
    }
  }
  return rows;
}

const fmtMoney = (v, currency) => (v === null ? "미정" : `${v.toFixed(2)} ${currency}`);

export function formatEstimate(rows, currency = "USD") {
  const lines = [
    "| 벤더 | 발화 수 | 총 길이(분) | 길이 없음 | 단위 | 예상 비용 |",
    "|---|---:|---:|---:|---|---:|",
  ];
  let sum = 0;
  let unknown = false;
  for (const r of rows) {
    if (r.cost === null) unknown = true;
    else sum += r.cost;
    lines.push(
      `| ${r.id} | ${r.n} | ${r.totalSec === null ? "?" : (r.totalSec / 60).toFixed(1)} | ${r.missingDuration} | ${r.unit ?? "?"} | ${fmtMoney(r.cost, currency)} |`,
    );
  }
  const known = rows.some((r) => r.cost !== null);
  const total = known ? fmtMoney(sum, currency) : "미정";
  lines.push(
    `\n합계: ${total}${unknown && known ? " + 미정 항목" : ""}${unknown ? " (단가가 null인 벤더 — prices.json을 채우세요)" : ""}`,
  );
  return lines.join("\n");
}
