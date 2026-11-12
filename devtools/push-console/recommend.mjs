// Claude 추천 — 콘솔이 모은 집계(이름 · id 없음)로 Claude Code(`claude -p`)에게 다음 캠페인을 묻습니다.
// 여기는 순수 함수만 둡니다: 맥락 · 프롬프트 · 응답 스키마 · 응답 검사. 실행은 server.mjs가 합니다.
// 추천은 「새 캠페인」 양식을 채울 뿐이고, 보내기는 사람이 확인창에서 합니다.

import { copyProblems } from "./audience.mjs";
import { LANGUAGES, SEGMENTS, SEGMENT_IDS } from "./segments.mjs";

export const HOLDOUT_CHOICES = [10, 20, 30, 50];

const copyEntry = {
  type: "object",
  properties: { title: { type: "string" }, body: { type: "string" } },
  required: ["title", "body"],
  additionalProperties: false,
};

const copyByLanguage = {
  type: "object",
  properties: Object.fromEntries(LANGUAGES.map((lang) => [lang, copyEntry])),
  required: ["en"],
  additionalProperties: false,
};

/** `claude -p --json-schema`에 넘기는 응답 모양입니다. 문구는 A(기본 톤) · B(캐릭터 톤) 둘입니다. */
export const RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          segment: { type: "string", enum: SEGMENTS.map((segment) => segment.id) },
          name: { type: "string" },
          priority: { type: "integer", minimum: 1, maximum: 5 },
          rationale: { type: "string" },
          expectedEffect: { type: "string" },
          sendAtComputerHour: { type: "integer", minimum: 0, maximum: 23 },
          minIdleHours: { type: "integer", minimum: 0 },
          maxIdleHours: { type: ["integer", "null"], minimum: 0 },
          localHours: {
            type: ["array", "null"],
            items: { type: "integer", minimum: 0, maximum: 24 },
            minItems: 2,
            maxItems: 2,
          },
          holdoutPercent: { type: "integer", enum: HOLDOUT_CHOICES },
          copy: copyByLanguage,
          copyB: copyByLanguage,
        },
        required: [
          "segment",
          "name",
          "priority",
          "rationale",
          "expectedEffect",
          "sendAtComputerHour",
          "minIdleHours",
          "maxIdleHours",
          "localHours",
          "holdoutPercent",
          "copy",
          "copyB",
        ],
        additionalProperties: false,
      },
    },
    notes: { type: "string" },
  },
  required: ["recommendations", "notes"],
  additionalProperties: false,
};

/** 제품 맥락 — 위키 버전별 퍼널 기록(2026-11-11 집계)과 ADR에서 옮긴 사실입니다. */
export const PRODUCT_FACTS = [
  "DURU는 이야기(에피소드)로 한국어를 배우는 앱이다. 튜토리얼(u00) = 표지 → 프롤로그 컷 → 레슨 1 · 2 · 3 → 파이널, 그 뒤 에피소드마다 레슨 8 · 막간 · 문화 · 롤플레이 파이널.",
  "1.3.0 Android: 여정을 시작한 사람의 26%가 첫 레슨을 열지 않는다(컷을 보다 나감 · 컷 뒤 지도에서 멈춤).",
  "튜토리얼 레슨 2는 시작한 사람의 33%가 통과하지 못한다. 두 문항 중 S2-02 「듣고 문장 만들기」 정답률이 20 ~ 23%라 하나만 틀려도 실패한다. 다시 하면 통과하는 사람도 많다.",
  "학습자 나라는 필리핀 · 인도가 대부분이고 그다음 베트남 · 말레이시아 · 멕시코 · 일본. 문구 언어는 나라로 고른다(VN vi · ID id · MY ms · 스페인어권 es · JP ja · 나머지 en).",
  "자동 발송이 이미 있다: 3일 · 7일 쉰 사람에게 매일 10:00 UTC 「다시 돌아오기」(콘솔이 겹치는 사람을 뺀다). 콘솔은 한 사람에게 하루 한 통이 기본이다.",
  "스트릭(연속 학습)은 레슨 · 문화 · 막간 · 파이널을 끝낸 날만 센다. 표지만 본 날은 세지 않는다.",
  "알림을 누르면 여정 지도로 간다(특정 레슨으로 바로 가지 않는다).",
];

const segmentLabel = Object.fromEntries(SEGMENTS.map((segment) => [segment.id, segment.label]));

/**
 * Claude에게 보낼 맥락입니다 — 집계 숫자만, 사람 이름 · id · 나라별 한 명 단위 값은 없습니다.
 * @param {{
 *   nowMs: number, computerTimeZone: string,
 *   segments: ReturnType<typeof import("./audience.mjs").summarize>,
 *   forecasts: Record<string, { atMs: number, count: number }[]>,
 *   campaigns: { name: string, segment: string, sentAtMs: number, holdoutPercent: number,
 *     copyEn: { title: string, body: string } | null, counts: { sent: number, control: number },
 *     metrics: { metric: string, hours: number | null, complete: boolean, sentRate: number | null,
 *       controlRate: number | null, diff: number | null, low: number | null, high: number | null }[] }[],
 *   defaultCopy: Record<string, Record<string, { title: string, body: string }>>,
 * }} input
 */
export function recommendationContext({
  nowMs,
  computerTimeZone,
  segments,
  forecasts,
  campaigns,
  defaultCopy,
}) {
  const hourIn = (ms) =>
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: computerTimeZone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(ms),
    );
  return {
    now: new Date(nowMs).toISOString(),
    computerTimeZone,
    computerHourNow: hourIn(nowMs),
    segments: segments.map((segment) => ({
      id: segment.id,
      label: segment.label,
      rule: segment.hint,
      people: segment.total,
      idleSinceLastOpen: segment.byIdle,
      copyLanguages: segment.byLang,
      reachableByComputerHour: (forecasts[segment.id] ?? [])
        .filter((slot) => slot.count > 0)
        .map((slot) => ({ hour: hourIn(slot.atMs), people: slot.count })),
    })),
    pastCampaigns: campaigns.map((campaign) => ({
      ...campaign,
      segmentLabel: segmentLabel[campaign.segment] ?? campaign.segment,
      sentAt: new Date(campaign.sentAtMs).toISOString(),
    })),
    defaultCopy,
  };
}

/** 프롬프트 본문입니다. 맥락 JSON은 끝에 붙입니다. */
export function recommendationPrompt(context) {
  return [
    "너는 한국어 학습 앱 DURU의 리텐션 담당자다. 아래 데이터로 **지금부터 24시간 안에 보낼 푸시 캠페인 2 ~ 4개**를 추천해라.",
    "",
    "## 제품 사실",
    ...PRODUCT_FACTS.map((fact) => `- ${fact}`),
    "",
    "## 규칙",
    "- segment는 주어진 id 중 하나. 사람이 적은(30명 미만) 세그먼트는 대조군 비교가 어려우니 우선순위를 낮추거나 이유를 적어라.",
    "- 같은 사람이 두 캠페인에 겹치지 않게 하라(진행 단계 세그먼트는 서로 겹치지 않고, streak-at-risk만 다른 것과 겹친다).",
    "- localHours는 학습자 현지 시각 [시작, 끝) — 저녁(18 ~ 22시)을 기본으로 하되 근거가 있으면 바꿔라. sendAtComputerHour는 이 컴퓨터 시각(computerTimeZone)으로 콘솔을 돌릴 시각이며, reachableByComputerHour에서 사람이 많은 때를 골라라.",
    "- holdoutPercent는 10 · 20 · 30 · 50 중 하나. 한 번에 150 ~ 400명이라 20%로는 신뢰구간이 ±15%p쯤이다 — 처음 재는 세그먼트는 50, 이미 효과를 본 세그먼트도 30 이상. 같은 실험은 며칠 반복해 묶음으로 합쳐 본다.",
    "- 문구: en은 필수, 학습자가 있는 언어(copyLanguages)만 추가. 자리표시는 {name} {episode} {character} {streak} {steps}만 쓴다({episode}는 영어 에피소드 제목, {character}는 그 사람이 하던 에피소드의 상대 인물 한국어 이름 — 튜토리얼은 「승무원」). 제목 60자 · 본문 200자 이내.",
    "- copy(문구 A)는 차분한 기본 톤, copyB(문구 B)는 **캐릭터 톤**이다: 제목은 「{character}: 짧은 한국어 한 마디 + 이모지 하나」, 본문은 {name}으로 시작해 그 한국어의 뜻과 다음 행동을 학습자 언어로 짧게. 귀엽고 다정하게 — 죄책감 · 압박 · 슬퍼하는 척은 금지, 다른 앱 마스코트의 말투 · 문구를 흉내 내지 마라. 두 문구는 같은 사람들에게 무작위로 나눠 보내 어느 톤이 더 돌아오게 하는지 비교한다.",
    "- 문구 톤: 친근하고 짧게, 죄책감 · 압박 없이, 느낌표는 꼭 필요할 때만, 수는 아라비아 숫자. 레슨 2 막힘에는 「어려운 게 정상이다 · 다시 하면 된다」처럼 안심시키는 말. 사실이 아닌 기능(다시 듣기 횟수 · 힌트 등)을 약속하지 마라.",
    "- pastCampaigns 결과가 있으면 반드시 참고해 무엇을 바꾸는지 rationale에 적어라. 차이의 95% 구간이 0을 포함하면 효과가 불분명한 것이다.",
    "- rationale · expectedEffect · notes는 한국어로 2 ~ 3문장. expectedEffect에는 무엇을 재면 성공인지(예: 72시간 학습한 날 +5%p) 적어라.",
    "- name은 한국어 캠페인 이름(예: 「레슨 2 재도전 저녁 1차」).",
    "",
    "## 데이터 (JSON)",
    JSON.stringify(context),
  ].join("\n");
}

/**
 * Claude 응답(structured_output)을 콘솔이 쓸 수 있게 다듬고 검사합니다. 고칠 수 없는 항목은 버리고 이유를 남깁니다.
 * @returns {{ items: object[], notes: string, problems: string[] }}
 */
export function validateRecommendations(output) {
  const problems = [];
  const items = [];
  const list = Array.isArray(output?.recommendations) ? output.recommendations : [];
  if (list.length === 0) problems.push("추천이 비어 있어요.");
  for (const [index, raw] of list.entries()) {
    const where = `추천 ${index + 1}`;
    if (!SEGMENT_IDS.has(raw?.segment)) {
      problems.push(`${where}: 모르는 세그먼트라 뺐어요.`);
      continue;
    }
    const variantCopies = [];
    let rejected = false;
    for (const [field, label] of [
      ["copy", "문구 A"],
      ["copyB", "문구 B"],
    ]) {
      const copy = {};
      for (const lang of LANGUAGES) {
        const entry = raw[field]?.[lang];
        if (entry?.title?.trim() && entry?.body?.trim())
          copy[lang] = { title: entry.title.trim(), body: entry.body.trim() };
      }
      if (field === "copyB" && Object.keys(copy).length === 0) continue; // B가 없으면 A 하나로
      const copyIssues = copyProblems(copy);
      const unknownPlaceholders = Object.values(copy)
        .flatMap((entry) => [entry.title, entry.body])
        .flatMap(
          (text) => text.match(/\{(?!(?:name|episode|character|streak|steps)\})[^{}]*\}/g) ?? [],
        );
      if (copyIssues.length > 0 || unknownPlaceholders.length > 0) {
        const unknown =
          unknownPlaceholders.length > 0
            ? ` 모르는 자리표시 ${[...new Set(unknownPlaceholders)].join(" ")}.`
            : "";
        problems.push(`${where} ${label}: ${copyIssues.join(" ")}${unknown} 그래서 뺐어요.`);
        rejected = true;
        break;
      }
      variantCopies.push(copy);
    }
    if (rejected) continue;
    const copy = variantCopies[0];
    const hours =
      Array.isArray(raw.localHours) && raw.localHours.length === 2
        ? raw.localHours.map(Number)
        : null;
    items.push({
      segment: raw.segment,
      name: String(raw.name ?? "").slice(0, 80) || raw.segment,
      priority: Math.min(5, Math.max(1, Math.round(Number(raw.priority) || 3))),
      rationale: String(raw.rationale ?? ""),
      expectedEffect: String(raw.expectedEffect ?? ""),
      sendAtComputerHour: Math.min(
        23,
        Math.max(0, Math.round(Number(raw.sendAtComputerHour) || 0)),
      ),
      minIdleHours: Math.max(0, Math.round(Number(raw.minIdleHours) || 0)),
      maxIdleHours:
        raw.maxIdleHours === null || raw.maxIdleHours === undefined
          ? null
          : Number.isFinite(Number(raw.maxIdleHours))
            ? Math.max(0, Math.round(Number(raw.maxIdleHours)))
            : null, // 숫자가 아니면 「제한 없음」 — 0으로 두면 아무도 받지 않는다
      localHours: hours && hours.every((hour) => hour >= 0 && hour <= 24) ? hours : null,
      holdoutPercent: HOLDOUT_CHOICES.includes(raw.holdoutPercent) ? raw.holdoutPercent : 20,
      copy,
      variants: variantCopies.map((variantCopy, variantIndex) => ({
        id: variantIndex === 0 ? "a" : "b",
        label: variantIndex === 0 ? "기본 톤" : "캐릭터 톤",
        copy: variantCopy,
      })),
    });
  }
  items.sort((a, b) => a.priority - b.priority);
  return { items, notes: String(output?.notes ?? ""), problems };
}

/** `claude -p` 실행 인자입니다 — 도구 · MCP · 세션 기록을 모두 끕니다. */
export function claudeArgs(schema) {
  return [
    "-p",
    "--output-format",
    "json",
    "--tools",
    "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--json-schema",
    JSON.stringify(schema),
    "--system-prompt",
    "You are a careful growth analyst for a Korean-learning app. Answer only through the structured output.",
  ];
}
