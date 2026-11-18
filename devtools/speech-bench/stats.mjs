// 상관계수 · 분위수 · 분포. 외부 라이브러리 없이 손으로 검산할 수 있는 정의만 씁니다.

const finitePairs = (xs, ys) => {
  const out = [];
  for (let i = 0; i < xs.length; i += 1) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) out.push([xs[i], ys[i]]);
  }
  return out;
};

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

/** 피어슨 r. 짝이 셋 미만이거나 한쪽 분산이 0이면 null. */
export function pearson(xs, ys) {
  const pairs = finitePairs(xs, ys);
  if (pairs.length < 3) return null;
  const mx = mean(pairs.map((p) => p[0]));
  const my = mean(pairs.map((p) => p[1]));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** 순위(1부터). 같은 값은 평균 순위를 나눠 가집니다. */
export function ranks(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) out[order[k][1]] = rank;
    i = j + 1;
  }
  return out;
}

/** 스피어만 ρ — 평균 순위의 피어슨입니다(같은 값이 있어도 맞습니다). */
export function spearman(xs, ys) {
  const pairs = finitePairs(xs, ys);
  if (pairs.length < 3) return null;
  return pearson(ranks(pairs.map((p) => p[0])), ranks(pairs.map((p) => p[1])));
}

/** 피어슨 r의 95% 신뢰구간(Fisher z). n이 4 미만이면 null. */
export function pearsonCi(r, n) {
  if (r === null || n < 4 || Math.abs(r) >= 1) return null;
  const z = Math.atanh(r);
  const se = 1 / Math.sqrt(n - 3);
  return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)];
}

/** 상관 묶음: { n, pearson, ci, spearman }. */
export function correlate(xs, ys) {
  const n = finitePairs(xs, ys).length;
  const r = pearson(xs, ys);
  return { n, pearson: r, ci: pearsonCi(r, n), spearman: spearman(xs, ys) };
}

/** 선형 보간 분위수(R type 7, 엑셀 PERCENTILE.INC와 같음). q는 0~1. */
export function quantile(values, q) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** 평균 · 표준편차(표본) · 최소 · 최대. */
export function describe(values) {
  const v = values.filter(Number.isFinite);
  if (v.length === 0) return { n: 0, mean: null, sd: null, min: null, max: null };
  const m = mean(v);
  const sd =
    v.length < 2 ? null : Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
  return { n: v.length, mean: m, sd, min: Math.min(...v), max: Math.max(...v) };
}

/** [lo, hi]를 bins칸으로 나눈 도수. 마지막 칸은 hi를 포함합니다. */
export function histogram(values, lo, hi, bins) {
  const counts = new Array(bins).fill(0);
  const width = (hi - lo) / bins;
  for (const v of values) {
    if (!Number.isFinite(v) || v < lo || v > hi) continue;
    counts[Math.min(bins - 1, Math.floor((v - lo) / width))] += 1;
  }
  return counts.map((count, i) => ({ from: lo + i * width, to: lo + (i + 1) * width, count }));
}
