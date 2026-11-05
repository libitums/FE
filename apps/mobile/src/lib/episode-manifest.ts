import "background-only";

// 매니페스트 디코더 — 와이어(`manifest-1`)를 앱 모양으로 바꿉니다. 예외를 던지지 않습니다.
import { formatPath, isRecord } from "@libitums/episode-core/episode";
import type { ContentLanguage } from "./episode-content";
import { episodeManifestSchema } from "./episode-manifest.schema";

/** 언어별 번역 파일 하나의 항목입니다(ADR-0102 D2). 본문 `version`과 따로 오릅니다. */
export type TranslationRef = {
  url: string;
  version: string;
  sha256: string;
  bytes: number;
};
export type TranslationRefs = { [L in ContentLanguage]?: TranslationRef };

export type ManifestEntry = {
  id: string;
  order: number;
  title: string;
  schema: string;
  version: string;
  sha256: string;
  bytes: number;
  /** 그림 · 음성 합계 바이트(ADR-0095 D3). 없거나 틀린 값이면 키가 없습니다. */
  assetsBytes?: number;
  url: string;
  /** 표지 일러스트의 기준 상대 경로(`images/covers/<id>.webp`)입니다. 선택 — 없으면 일러스트 없음. */
  cover?: string;
  /** 언어별 번역 파일(ADR-0102). 선택 — 수준 4 매니페스트만 적습니다. 틀린 언어 항목은 그 언어만 버립니다. */
  translations?: TranslationRefs;
};

export type EpisodeManifest = {
  generatedAt: string;
  minClientLevel?: number;
  /** `order` 오름차순. */
  episodes: ManifestEntry[];
};

export type ManifestIssue = {
  code: "schema-mismatch" | "invalid-shape" | "duplicate-episode-id";
  path: string;
  message: string;
};

export type ManifestDecodeResult =
  | { ok: true; manifest: EpisodeManifest }
  | { ok: false; errors: ManifestIssue[] };

function issue(code: ManifestIssue["code"], path: string, message: string): ManifestIssue {
  return { code, path, message };
}

function decode(input: unknown): ManifestDecodeResult {
  if (!isRecord(input) || input["schema"] !== "manifest-1") {
    return {
      ok: false,
      errors: [issue("schema-mismatch", "schema", 'schema is not "manifest-1"')],
    };
  }

  const parsed = episodeManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((found) =>
        issue("invalid-shape", formatPath(found.path), found.message),
      ),
    };
  }

  const seen = new Set<string>();
  const duplicates: ManifestIssue[] = [];
  parsed.data.episodes.forEach((entry, index) => {
    if (seen.has(entry.id)) {
      duplicates.push(
        issue("duplicate-episode-id", `episodes[${index}].id`, `duplicate episode id: ${entry.id}`),
      );
    }
    seen.add(entry.id);
  });
  if (duplicates.length > 0) {
    return { ok: false, errors: duplicates };
  }

  const episodes: ManifestEntry[] = parsed.data.episodes
    .map((entry) => ({
      id: entry.id,
      order: entry.order,
      title: entry.title,
      schema: entry.schema,
      version: entry.version,
      sha256: entry.sha256,
      bytes: entry.bytes,
      ...assetsBytesOf(entry.assets_bytes),
      url: entry.url,
      // 빈 값 · 공백만은 「없음」입니다 — 경로의 유효성(선두 / · .. · ://)은 주소를 만드는 쪽이 거릅니다.
      ...(entry.cover === undefined || entry.cover.trim() === "" ? {} : { cover: entry.cover }),
      ...translationRefsOf(entry.translations),
    }))
    .sort((a, b) => a.order - b.order);

  const level = parsed.data.min_client_level;
  const manifest: EpisodeManifest = {
    generatedAt: parsed.data.generated_at,
    ...(level === undefined ? {} : { minClientLevel: level }),
    episodes,
  };
  return { ok: true, manifest };
}

const TRANSLATION_LANGUAGES: readonly ContentLanguage[] = ["vi", "id", "es", "ja"];
const SHA256 = /^[0-9a-f]{64}$/;

/** 언어마다 모양이 맞는 항목만 남깁니다 — 틀린 언어 · 모르는 언어는 조용히 버리고, 남는 것이 없으면 키가 없습니다. */
function translationRefsOf(value: unknown): { translations?: TranslationRefs } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const refs: TranslationRefs = {};
  for (const language of TRANSLATION_LANGUAGES) {
    const ref = (value as Record<string, unknown>)[language];
    if (ref === null || typeof ref !== "object") continue;
    const { url, version, sha256, bytes } = ref as Record<string, unknown>;
    if (
      typeof url === "string" &&
      url.trim() !== "" &&
      typeof version === "string" &&
      typeof sha256 === "string" &&
      SHA256.test(sha256) &&
      typeof bytes === "number" &&
      Number.isInteger(bytes) &&
      bytes >= 0
    ) {
      refs[language] = { url, version, sha256, bytes };
    }
  }
  return Object.keys(refs).length > 0 ? { translations: refs } : {};
}

/** 0 이상 정수만 `assetsBytes`로 남깁니다 — 그 밖은 조용히 버립니다(매니페스트는 받습니다). */
function assetsBytesOf(value: unknown): { assetsBytes?: number } {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? { assetsBytes: value }
    : {};
}

export function decodeManifest(input: unknown): ManifestDecodeResult {
  try {
    return decode(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [issue("invalid-shape", "", `unexpected error while decoding: ${message}`)],
    };
  }
}

/** 앱 모양 매니페스트를 `manifest-1` 원문으로 씁니다. 순수 · 던지지 않음. */
export function encodeManifestText(manifest: EpisodeManifest): string {
  return JSON.stringify({
    schema: "manifest-1",
    generated_at: manifest.generatedAt,
    ...(manifest.minClientLevel === undefined ? {} : { min_client_level: manifest.minClientLevel }),
    episodes: manifest.episodes.map((entry) => ({
      id: entry.id,
      order: entry.order,
      title: entry.title,
      schema: entry.schema,
      version: entry.version,
      sha256: entry.sha256,
      bytes: entry.bytes,
      ...(entry.assetsBytes === undefined ? {} : { assets_bytes: entry.assetsBytes }),
      url: entry.url,
      ...(entry.cover === undefined ? {} : { cover: entry.cover }),
      ...(entry.translations === undefined ? {} : { translations: entry.translations }),
    })),
  });
}
