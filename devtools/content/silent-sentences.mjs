// 「소리가 안 나는 문장」 점검의 순수 함수입니다(ADR-0189) — 에피소드 원문(수준 5 배달 JSON)과 음성 정보 파일(`audio/manifest.json`)을
// 대조해, 다시 듣기 단추가 회색으로 서는 문장을 자리 · 까닭과 함께 냅니다. 네트워크 · 파일을 건드리지 않습니다(CLI는 silent-sentences-report.mjs).
//
// 규칙은 앱의 것을 옮겨 적었습니다 — 녹음 색인(`app/catalog-recorded-audio.ts`, ADR-0172 D2) · 자리표시자 무음(`hasContentPlaceholder`) ·
// 칩 소리를 싣는 유형(`catalog-chip-audio.ts`의 호출 자리). 앱 TS는 확장자 없는 import라 Node가 바로 읽지 못해 두 벌이 됐습니다.
// 앱 규칙이 바뀌면 여기와 `silent-sentences.unit.test.mjs`를 같이 고칩니다.

/** 까닭 — 콘텐츠 누락(no-audio-id · no-recording) · 파일 미업로드(not-in-manifest) · 앱 규칙(placeholder). */
export const SILENT_REASONS = ["no-audio-id", "not-in-manifest", "no-recording", "placeholder"];

/** 다시 듣기가 서는 레슨 유형 — 판정 뒤 기다리는 화면(문장 조립 · 음절 조립). */
const ANSWER_REPLAY_TYPES = new Set(["WORD_ORDER", "SYLLABLE_BUILD"]);
/** 칩 소리를 싣는 유형 — 단어 고르기 보기 · 문장/대화 조립 조각. 음절 조립 · 듣고 조립은 싣지 않습니다. */
const CHIP_SOUND_TYPES = new Set([
  "ROLE_LINE",
  "TRANSLATE_TO_EN",
  "CLOZE",
  "CLOZE_CHOICE",
  "REPLY_SELECT",
  "PARTICLE_FILL",
  "PARTICLE_SWAP",
  "CULTURE_CHECK",
  "IMG_MATCH",
  "WORD_ORDER",
  "TURN_ORDER",
]);

const PLACEHOLDER = /\{[^}]*\}/;
const isBareWord = (ko) => !/[\s.,!?…~]/.test(ko.trim());
const nonEmpty = (value) => (typeof value === "string" && value.trim() !== "" ? value : undefined);
const cutKo = (cut) => (cut.line ?? cut.narration ?? cut.text ?? {}).ko ?? "";
const itemsOf = (episode) => (episode.steps ?? []).flatMap((step) => step.items ?? []);
const chipsOf = (item) =>
  [...(item.options ?? []), ...(item.tiles ?? [])].map((chip) => chip?.ko ?? "");

/** 앱의 녹음 색인과 같은 짝(글 → 음성 id들)을 모읍니다. */
function recordedIndexOf(episode) {
  const index = new Map();
  const add = (ko, id) => {
    const key = (ko ?? "").trim();
    if (key === "" || nonEmpty(id) === undefined) return;
    const ids = index.get(key) ?? [];
    if (!ids.includes(id)) ids.push(id);
    index.set(key, ids);
  };
  for (const line of episode.dialogue ?? []) add(line.text?.ko, line.audio_url);
  const cuts = [
    ...(episode.pre_cuts ?? []),
    ...(episode.post_cuts ?? []),
    ...(episode.interlude?.cuts ?? []),
  ];
  for (const cut of cuts) add(cutKo(cut), cut.audio_url);
  for (const item of itemsOf(episode)) {
    for (const lead of item.story?.lead ?? []) add(lead.line?.ko, lead.audio_url);
    if (item.type === "VOCAB_CARD") {
      add(item.context?.ko, item.audio_url);
      add(item.example?.ko, item.example_audio_url);
      continue;
    }
    const stimulus = item.stimulus ?? {};
    add((stimulus.audio ?? stimulus.text)?.ko, stimulus.audio_url);
    add(item.answers?.[0]?.ko, nonEmpty(stimulus.audio_url) ?? item.feedback?.audio_url);
  }
  return index;
}

/** 음성 id 하나의 판정 — 소리가 나면 `null`, 아니면 까닭. */
function idVerdict(id, ko, manifestIds) {
  if (nonEmpty(id) === undefined) return "no-audio-id";
  if (PLACEHOLDER.test(ko)) return "placeholder";
  return manifestIds.has(id) ? null : "not-in-manifest";
}

/**
 * 한 에피소드에서 소리가 없는 문장 목록입니다.
 * @returns {{ episodeId: string, place: string, ref: string, ko: string, reason: string }[]}
 */
export function silentSentencesOf(episode, manifestIds) {
  const episodeId = episode.unit_id ?? episode.id ?? "";
  const rows = [];
  const push = (place, ref, ko, reason) => {
    if (reason !== null) rows.push({ episodeId, place, ref: String(ref), ko, reason });
  };
  const cutPlaces = [
    ["pre_cut", episode.pre_cuts ?? []],
    ["post_cut", episode.post_cuts ?? []],
    ["interlude_cut", episode.interlude?.cuts ?? []],
  ];
  for (const [place, cuts] of cutPlaces) {
    for (const cut of cuts)
      push(place, cut.index, cutKo(cut), idVerdict(cut.audio_url, cutKo(cut), manifestIds));
  }
  for (const line of episode.dialogue ?? []) {
    const ko = line.text?.ko ?? "";
    push("dialogue", line.line_id ?? line.seq, ko, idVerdict(line.audio_url, ko, manifestIds));
  }
  const index = recordedIndexOf(episode);
  for (const item of itemsOf(episode)) {
    if (!ANSWER_REPLAY_TYPES.has(item.type)) continue;
    const ko = item.answers?.[0]?.ko ?? "";
    const own = nonEmpty(item.stimulus?.audio_url) ?? nonEmpty(item.feedback?.audio_url);
    if (own !== undefined) {
      const verdict = idVerdict(own, ko, manifestIds);
      // 자기 음성이 없으면 앱은 녹음 색인으로 내려갑니다 — 낱말 하나짜리는 찾지 않습니다(ADR-0172 D2).
      if (verdict === null) continue;
      if (verdict === "placeholder" || isBareWord(ko)) {
        push("lesson_answer", item.id, ko, verdict);
        continue;
      }
    }
    if (PLACEHOLDER.test(ko)) {
      push("lesson_answer", item.id, ko, "placeholder");
      continue;
    }
    const ids = isBareWord(ko) ? [] : (index.get(ko.trim()) ?? []);
    if (ids.some((id) => manifestIds.has(id))) continue;
    push("lesson_answer", item.id, ko, ids.length > 0 ? "not-in-manifest" : "no-recording");
  }
  return rows;
}

/**
 * 보기 · 조각 가운데 낱말 소리가 있는 수(유형별)입니다 — 앱이 칩 소리를 싣는 유형만.
 * @returns {Record<string, { withSound: number, total: number }>}
 */
export function chipSoundCoverageOf(episode, manifestIds) {
  const index = recordedIndexOf(episode);
  const coverage = {};
  for (const item of itemsOf(episode)) {
    if (!CHIP_SOUND_TYPES.has(item.type)) continue;
    let chips = chipsOf(item);
    // 대화 조립의 첫 턴은 고정된 줄이라 창고에 없습니다 — 배달 원문은 정답 차례를 「 | 」로 이은 글 하나로 싣습니다.
    if (item.type === "TURN_ORDER") {
      const opening = (item.answers?.[0]?.ko ?? "").split(" | ")[0];
      const at = chips.indexOf(opening);
      chips = chips.filter((_, tile) => tile !== at);
    }
    for (const ko of chips) {
      if (ko === "") continue;
      const entry = (coverage[item.type] ??= { withSound: 0, total: 0 });
      entry.total += 1;
      const ids = PLACEHOLDER.test(ko) ? [] : (index.get(ko.trim()) ?? []);
      if (ids.some((id) => manifestIds.has(id))) entry.withSound += 1;
    }
  }
  return coverage;
}

/** 여러 에피소드의 결과를 마크다운 보고로 씁니다. */
export function silentSentencesReport(rows, coverage, meta) {
  const counts = SILENT_REASONS.map((reason) => [
    reason,
    rows.filter((row) => row.reason === reason).length,
  ]);
  const places = [...new Set(rows.map((row) => row.place))];
  const lines = [
    `음성 정보 파일 \`generated_at\` ${meta.manifestGeneratedAt} · 에피소드 ${meta.episodeCount}편 · 소리 없는 문장 ${rows.length}개`,
    "",
    "| 까닭 | 문장 수 |",
    "|---|--:|",
    ...counts.map(([reason, count]) => `| ${reason} | ${count} |`),
    "",
    "| 자리 | 문장 수 |",
    "|---|--:|",
    ...places.map((place) => `| ${place} | ${rows.filter((row) => row.place === place).length} |`),
    "",
    "칩 소리 범위(앱이 싣는 유형):",
    "",
    "| 유형 | 소리 있음 | 전체 |",
    "|---|--:|--:|",
    ...Object.entries(coverage)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, entry]) => `| ${type} | ${entry.withSound} | ${entry.total} |`),
    "",
    "| 에피소드 | 자리 | 참조 | 문장 | 까닭 |",
    "|---|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.episodeId} | ${row.place} | ${row.ref} | ${row.ko.split("|").join("\\|")} | ${row.reason} |`,
    ),
    "",
  ];
  return lines.join("\n");
}
