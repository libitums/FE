// 배포 에피소드 JSON에서 컴패니언 전역 학습 표현(`companion.expressions`)과 표현 ↔ 유닛 대응표(`companion.expression_units`)의
// 스냅숏을 만드는 순수 함수입니다. IO가 없어 같은 입력이면 같은 결과입니다.
//
// 표현의 출처는 `words[]` · `patterns[]`이고, 유닛과의 대응은 문항의 `ref`입니다 — `words[]`가 에피소드 단위라 유닛과 바로
// 이어지지 않기 때문입니다. 다른 에피소드의 id를 가리키는 `ref`도 전역 표라서 그대로 풀립니다.

const ID_PATTERN = /^(voca|expr|patt|gram|nume):[A-Za-z0-9_-]{1,64}$/;

const text = (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

/**
 * @param {readonly { id: string, order: number, episode: any }[]} episodes 배포 매니페스트의 항목과 그 본문
 * @returns {{ expressions: object[], units: object[], report: { invalidIds: object[], conflicts: object[], unresolvedRefs: object[] } }}
 */
export function buildExpressionSnapshot(episodes) {
  const ordered = [...episodes].sort(
    (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const byId = new Map();
  const report = { invalidIds: [], conflicts: [], unresolvedRefs: [] };

  for (const { id: episodeId, episode } of ordered) {
    const entries = [...(episode.words ?? []), ...(episode.patterns ?? [])];
    for (const entry of entries) {
      const id = typeof entry?.id === "string" ? entry.id : "";
      const surface = text(entry?.ko);
      if (!ID_PATTERN.test(id) || surface === null) {
        report.invalidIds.push({ episode: episodeId, id });
        continue;
      }
      const existing = byId.get(id);
      if (existing !== undefined) {
        // 같은 id가 여러 에피소드에 실리는 것은 정상입니다(복습). 글자가 다를 때만 보고하고 먼저 나온 쪽을 남깁니다.
        if (existing.surface !== surface) {
          report.conflicts.push({
            id,
            kept: existing.first_episode,
            other: episodeId,
            surfaces: [existing.surface, surface],
          });
        }
        continue;
      }
      byId.set(id, {
        id,
        kind: id.slice(0, 4),
        surface,
        roman: text(entry.roman),
        gloss_en: text(entry.gloss_en),
        grade: text(entry.grade),
        first_episode: episodeId,
      });
    }
  }

  const unitKeys = new Set();
  const units = [];
  for (const { id: episodeId, episode } of ordered) {
    for (const step of episode.steps ?? []) {
      for (const item of step.items ?? []) {
        const ref = text(item?.ref);
        if (ref === null) continue;
        if (!byId.has(ref)) {
          report.unresolvedRefs.push({ episode: episodeId, unit: step.id, item: item.id, ref });
          continue;
        }
        const key = `${ref}\u0000${episodeId}\u0000${step.id}`;
        if (unitKeys.has(key)) continue;
        unitKeys.add(key);
        units.push({ expression_id: ref, episode_id: episodeId, unit_key: step.id });
      }
    }
  }

  const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return {
    expressions: [...byId.values()].sort((a, b) => byKey(a.id, b.id)),
    units: units.sort(
      (a, b) =>
        byKey(a.expression_id, b.expression_id) ||
        byKey(a.episode_id, b.episode_id) ||
        byKey(a.unit_key, b.unit_key),
    ),
    report,
  };
}

/** 스냅숏을 SQL 편집기에 붙여 넣을 한 문장으로 씁니다. 달러 인용 태그가 본문에 나오지 않게 고릅니다. */
export function toSyncSql(snapshot) {
  const expressions = JSON.stringify(snapshot.expressions);
  const units = JSON.stringify(snapshot.units);
  let tag = "expr";
  while (expressions.includes(`$${tag}$`) || units.includes(`$${tag}$`)) tag += "x";
  const quote = (json) => `$${tag}$${json}$${tag}$::jsonb`;
  return `select companion.sync_expressions(\n  ${quote(expressions)},\n  ${quote(units)}\n);\n`;
}

/**
 * 매니페스트의 에피소드 제목 · 순서를 `companion.sync_episodes`(20261126) 한 문장으로 씁니다 — 설정의 「배운 표현 범위」가
 * 에피소드 id 대신 제목을 보입니다.
 * @param {readonly { id: string, order: number, title?: string }[]} episodes
 */
export function toEpisodesSql(episodes) {
  const rows = [...episodes]
    .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(({ id, order, title }) => ({ id, order, title: text(title) }));
  const json = JSON.stringify(rows);
  let tag = "ep";
  while (json.includes(`$${tag}$`)) tag += "x";
  return `select companion.sync_episodes($${tag}$${json}$${tag}$::jsonb);\n`;
}
