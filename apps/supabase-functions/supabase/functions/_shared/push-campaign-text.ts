// 자동 푸시 캠페인 — 겹침 · 대조군 · 변형 해시 · 문구 채우기 · 발송 묶음(콘솔과 같은 함수)입니다.

import type { Arm, PlannedRow, SegmentId, Stage } from "./push-campaign-types.ts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 매일 10:00 UTC 「다시 돌아오기」(3 · 7일)가 앞뒤 24시간 안에 이 사람에게 갔거나 갈지 봅니다. */
export function reengagementOverlap(lastActiveMs: number, nowMs: number): boolean {
  const today = new Date(nowMs);
  const run = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 10);
  const runs = run <= nowMs ? [run, run + DAY_MS] : [run - DAY_MS, run];
  return runs.some((at) => {
    if (lastActiveMs > at) return false;
    const idleDays = (at - lastActiveMs) / DAY_MS;
    return (idleDays >= 3 && idleDays < 4) || (idleDays >= 7 && idleDays < 8);
  });
}

/** FNV-1a 32비트 — 콘솔과 같은 함수라 같은 묶음 · 사람은 늘 같은 칸입니다. */
export function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export const inHoldout = (seed: string, userId: string, percent: number): boolean =>
  hash32(`${seed}:${userId}`) % 10000 < Math.round(percent * 100);

export const variantIndexOf = (seed: string, userId: string, count: number): number =>
  count <= 1 ? 0 : hash32(`variant:${seed}:${userId}`) % count;

export function cleanName(name: string): string {
  const [first = ""] = name
    .replace(/[\p{C}{}]/gu, "")
    .trim()
    .split(/\s+/u);
  const text = first.charAt(0).toUpperCase() + first.slice(1);
  return [...text].slice(0, 20).join("");
}

/** `{name}` `{episode}` `{character}` `{steps}`을 채웁니다(콘솔 renderCopy와 같은 규칙). */
export function renderCopy(
  template: string,
  vars: { name: string; episode: string; character: string; steps: number },
): string {
  let text = template;
  const name = cleanName(vars.name);
  if (name === "") {
    text = text
      .replace(/\{name\}(さん)?\s*[,、，]\s*/gu, "")
      .replace(/\s*[,、，]?\s*\{name\}(さん)?/gu, "");
    text = text.charAt(0).toUpperCase() + text.slice(1);
  } else {
    text = text.replaceAll("{name}", name);
  }
  const character = vars.character.trim();
  text =
    character === ""
      ? text.replace(/\{character\}\s*[:：]\s*/gu, "").replaceAll("{character}", "")
      : text.replaceAll("{character}", character);
  return text
    .replaceAll("{episode}", vars.episode)
    .replaceAll("{steps}", String(vars.steps))
    .replaceAll("{streak}", "")
    .trim();
}

/** 앞선 실험(보냄 / 안 보냄 · 문구 A/B, ~2026-11-27)의 묶음 이름 — 콘솔 결과 탭이 옛 기록을 읽을 때 씁니다. */
export const seriesOf = (segment: SegmentId): string => `자동 · ${segment}`;

/** 빈도 실험(ADR-0208)의 묶음 이름 — 단계마다 하나. */
export const frequencySeriesOf = (stage: Stage): string => `빈도 · ${stage}`;

const ARMS: readonly Arm[] = ["control", "once", "twice"];

/** 빈도 실험의 칸 — 사람마다 고정(진도가 바뀌어도 같은 칸), 1/3씩. */
export const armOf = (userId: string): Arm => ARMS[hash32(`arm:빈도:${userId}`) % ARMS.length]!;

export function batchesOf(
  rows: readonly PlannedRow[],
  size = 1000,
): { title: string; body: string; userIds: string[] }[] {
  const groups = new Map<string, { title: string; body: string; userIds: string[] }>();
  for (const row of rows) {
    if (row.group !== "sent") continue;
    const key = `${row.title}\u0000${row.body}`;
    const group = groups.get(key) ?? { title: row.title, body: row.body, userIds: [] };
    group.userIds.push(row.userId);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((group) => {
    const out = [];
    for (let start = 0; start < group.userIds.length; start += size)
      out.push({ ...group, userIds: group.userIds.slice(start, start + size) });
    return out;
  });
}
