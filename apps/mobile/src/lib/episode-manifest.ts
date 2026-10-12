import "background-only";

// 매니페스트 디코더 — 와이어(`manifest-1`)를 앱 모양으로 바꿉니다. 예외를 던지지 않습니다.
import { formatPath, isRecord } from "./episode-content.normalize";
import { episodeManifestSchema } from "./episode-manifest.schema";

export type ManifestEntry = {
  id: string;
  order: number;
  title: string;
  schema: string;
  version: string;
  sha256: string;
  bytes: number;
  url: string;
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
      url: entry.url,
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
