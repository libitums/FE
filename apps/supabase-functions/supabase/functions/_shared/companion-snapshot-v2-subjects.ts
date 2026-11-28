// 스냅샷 v2m의 고정 대상(ADR-0179 D8 — 인물이 아닌 반려동물 · 장소 · 물건) — 묶음의 `subjects` 칸 검사 · 장면 설계 입력 줄 · 계획의
// 대상 칸 정리 · 이미지 프롬프트의 대상 문장. 모아 쓰는 곳은 `companion-snapshot-v2.ts`.
// 이 글은 아직 실험실(ops-dashboard `snapshot_v2.py`)에 없다 — 실험실에도 같은 글을 넣는다.

import type { Manifest } from "./companion-snapshot-v2-bundle.ts";

// ------------------------------------------------------------------ 묶음의 `subjects` 칸

/** 고정 대상(인물이 아닌 것 — 반려동물 · 장소 · 물건)의 기준 그림 한 장. 장소는 시점마다 한 장, 동물 · 물건은 여러 각도 시트 한 장. */
export type ManifestSubjectFile = {
  readonly file: string;
  readonly view: string;
  readonly caption: string;
};
export const SUBJECT_KINDS = ["pet", "place", "object"] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];
/** 고정 대상(ADR-0179 D8). 대시보드가 그려 사람이 채택한 것만 묶음에 들어간다(ops-dashboard `snapshot_subjects.py`). */
export type ManifestSubject = {
  readonly id: string;
  readonly name: string;
  readonly kind: SubjectKind;
  /** 영어 생김새 한 단락 — 장면 설계 입력과 이미지 프롬프트에 쓴다. */
  readonly description: string;
  /** 대화에서 그 대상을 부르는 한국어 말 — 장면 설계의 단서로만 쓴다(이것만으로 붙이지 않는다). */
  readonly aliases: readonly string[];
  readonly files: readonly ManifestSubjectFile[];
};

export type PlanSubject = { readonly id: string; readonly file: string };

/** 이미지 호출에 붙일 대상 그림 하나. */
export type RoutedSubject = {
  readonly id: string;
  readonly kind: SubjectKind;
  /** 버킷 경로(`v2/<slug>/<file>`). */
  readonly ref: string;
  readonly caption: string;
  readonly description: string;
};

// 대상 그림은 식을 따로 둔다 — 합치면 `subject_meokmul.png`이 인물 칸(`refs`)에 적힌 잘못된 묶음을 걸러 내지 못한다.
const SUBJECT_FILE = /^subject_[a-z][a-z_]*(--[a-z]+)?\.png$/;
const SUBJECT_ID = /^[a-z][a-z_]{0,30}$/;
const SUBJECT_VIEW = /^[a-z]{1,20}$/;

const plain = (value: unknown, limit: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";

/** 대상 하나의 칸 검사. 틀리면 null — 그 대상만 버린다(인물은 그대로 그린다). 맞는 파일이 하나도 없어도 버린다. */
function subjectFrom(input: unknown): ManifestSubject | null {
  if (typeof input !== "object" || input === null) return null;
  const value = input as Record<string, unknown>;
  const id = value["id"];
  const kind = value["kind"];
  const description = plain(value["description"], 600);
  if (typeof id !== "string" || !SUBJECT_ID.test(id)) return null;
  if (!SUBJECT_KINDS.includes(kind as SubjectKind) || description === "") return null;
  const aliases = Array.isArray(value["aliases"])
    ? value["aliases"]
        .map((a) => plain(a, 30))
        .filter((a) => a !== "")
        .slice(0, 12)
    : [];
  const files = (Array.isArray(value["files"]) ? value["files"] : [])
    .slice(0, 3)
    .flatMap((raw): ManifestSubjectFile[] => {
      if (typeof raw !== "object" || raw === null) return [];
      const f = raw as Record<string, unknown>;
      if (typeof f["file"] !== "string" || !SUBJECT_FILE.test(f["file"])) return [];
      if (typeof f["view"] !== "string" || !SUBJECT_VIEW.test(f["view"])) return [];
      return [{ file: f["file"], view: f["view"], caption: plain(f["caption"], 160) }];
    });
  if (files.length === 0) return null;
  return {
    id,
    name: plain(value["name"], 40),
    kind: kind as SubjectKind,
    description,
    aliases,
    files,
  };
}

/** `subjects` 칸 → 검사한 대상 목록. 칸이 없거나 틀리면 빈 목록, 같은 id는 첫째만. */
export function subjectsFrom(input: unknown): ManifestSubject[] {
  if (!Array.isArray(input)) return [];
  const out: ManifestSubject[] = [];
  for (const raw of input) {
    const subject = subjectFrom(raw);
    if (subject !== null && !out.some((s) => s.id === subject.id)) out.push(subject);
  }
  return out;
}

// ------------------------------------------------------------------ 장면 설계 · 조립

/** 장면 설계 입력의 대상 한 줄 — 부르는 말은 단서로, 장소는 시점 이름까지. */
export function subjectLine(subject: ManifestSubject): string {
  const called = subject.aliases.length ? `; called ${subject.aliases.join(", ")}` : "";
  const views =
    subject.kind === "place" ? `; views: ${subject.files.map((f) => f.view).join(", ")}` : "";
  return `- id ${subject.id} (${subject.kind}${called}${views}): ${subject.description}`;
}

/**
 * 계획이 대상을 비웠는데 그리는 메시지에 대상의 첫 부르는 말(「먹물」 「자취방」처럼 헷갈리지 않는 말)이 그대로 있으면 그 id들.
 * 로그(`meta.subjectsMentioned`)에만 남긴다 — 자동으로 붙이지 않는다(「치즈」는 음식이기도 하고, 말에만 나오고 화면에 없을 수 있다).
 */
export function mentionedSubjects(manifest: Manifest, message: string): string[] {
  return manifest.subjects
    .filter((s) => s.aliases[0] !== undefined && message.includes(s.aliases[0]))
    .map((s) => s.id);
}

/**
 * 계획의 대상 칸 → 붙일 대상(장소 하나 · 동물이나 물건 하나까지, 장소 먼저). 묶음에 없는 id는 버리고, 시점이 없거나 모르면 첫 파일.
 * 칸이 틀려도 계획 전체를 버리지 않는다 — 빈 목록.
 */
export function planSubjects(raw: unknown, manifest: Manifest): PlanSubject[] {
  if (!Array.isArray(raw)) return [];
  let place: PlanSubject | null = null;
  let thing: PlanSubject | null = null;
  for (const item of raw.slice(0, 6)) {
    if (typeof item !== "object" || item === null) continue;
    const value = item as Record<string, unknown>;
    const subject = manifest.subjects.find((s) => s.id === value["id"]);
    if (subject === undefined) continue;
    const file = (subject.files.find((f) => f.view === value["view"]) ?? subject.files[0]!).file;
    if (subject.kind === "place") place ??= { id: subject.id, file };
    else thing ??= { id: subject.id, file };
  }
  return [place, thing].filter((s): s is PlanSubject => s !== null);
}

/** 대상 설명의 앞 구절(「먹물 (Meokmul, "ink"), Seoyeon's cat」) — 첫 쌍점 앞, 없으면 첫 쉼표 앞. */
const subjectLead = (description: string) =>
  (description.includes(":") ? description.split(":")[0]! : description.split(",")[0]!)
    .slice(0, 120)
    .trim();

/**
 * 고정 대상 그림의 역할 문장(ADR-0179 D8). `index`는 이 그림의 번호(인물 그림 다음부터). 대상 그림에는 사람이 없어 「인물을 가져오지
 * 말 것」은 적지 않는다.
 */
export function subjectText(subject: RoutedSubject, index: number): string {
  if (subject.kind === "place")
    return (
      `Image ${index} shows the place of this scene (${subject.caption || "the place"}): keep the same furniture, ` +
      "materials, colours and layout, seen from the angle this shot needs; do not copy its framing."
    );
  const what = subject.kind === "pet" ? "animal" : "object";
  return (
    `Image ${index} is a reference sheet of ${subjectLead(subject.description)} from several angles: draw that ` +
    `same ${what} once in the scene with the same colours, markings and proportions; do not copy the sheet's ` +
    "layout or background."
  );
}
