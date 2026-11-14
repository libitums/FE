// 학습 보상(엽전)을 받을 수 있는 유닛 표 `companion.content_units`(ADR-0146)에 넣을 행을 배포 에피소드 JSON에서 만드는 순수 함수입니다.
// IO가 없어 같은 입력이면 같은 결과입니다. 행은 추가만 합니다 — 콘텐츠에서 빠진 유닛도 이미 깬 사용자가 있어 지우지 않습니다.

// 표의 check와 같은 규칙입니다(20261130120000_coin_claim_valid_units.sql). 생성 SQL에 따옴표가 들어갈 수 없게 여기서 막습니다.
const EPISODE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UNIT_KEY = /^[A-Za-z0-9_-]{1,16}$/;
// 에피소드 표지(앱의 `CATALOG_INTRO_KEY`)와 막간은 보상이 없습니다 — 지급 함수의 제외 규칙과 같습니다.
const EXCLUDED = new Set(["intro", "INT"]);

/** 에피소드 본문의 보상 유닛 키입니다 — `steps[].id`에서 막간(`kind: "interlude"`) · 표지를 뺀 것, 첫 등장 순, 중복 없음. */
export function rewardUnitKeysOf(episode) {
  const keys = [];
  for (const step of episode?.steps ?? []) {
    const id = step?.id;
    if (typeof id !== "string" || step.kind === "interlude" || EXCLUDED.has(id)) continue;
    if (!keys.includes(id)) keys.push(id);
  }
  return keys;
}

/**
 * 여러 에피소드(같은 id의 여러 판 포함)의 보상 유닛 합집합입니다. (에피소드, 유닛) 순으로 정렬합니다.
 * id · 키가 표 규칙 밖이면 던집니다.
 * @param {readonly { id: string, episode: unknown }[]} entries
 * @returns {{ episode_id: string, unit_key: string }[]}
 */
export function contentUnitRows(entries) {
  const seen = new Set();
  const rows = [];
  for (const { id, episode } of entries) {
    if (typeof id !== "string" || !EPISODE_ID.test(id))
      throw new Error(`에피소드 id가 규칙 밖입니다: ${id}`);
    for (const key of rewardUnitKeysOf(episode)) {
      if (!UNIT_KEY.test(key)) throw new Error(`유닛 키가 규칙 밖입니다: ${id} ${key}`);
      const pair = `${id}\u0000${key}`;
      if (seen.has(pair)) continue;
      seen.add(pair);
      rows.push({ episode_id: id, unit_key: key });
    }
  }
  const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return rows.sort((a, b) => byKey(a.episode_id, b.episode_id) || byKey(a.unit_key, b.unit_key));
}

/** 행을 멱등 insert 한 문장으로 씁니다. 행이 없으면 주석 한 줄입니다. */
export function toContentUnitsSql(rows) {
  if (rows.length === 0) return "-- 넣을 보상 유닛이 없습니다.\n";
  const values = rows.map((row) => `  ('${row.episode_id}', '${row.unit_key}')`).join(",\n");
  return `insert into companion.content_units (episode_id, unit_key) values\n${values}\non conflict do nothing;\n`;
}
