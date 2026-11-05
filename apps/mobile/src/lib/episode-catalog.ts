import "background-only";

// 에피소드 카탈로그 — 내장 · 기기 캐시 · 원격 매니페스트를 합쳐 order순 목록을 냅니다(순수).
import { decodeEpisode } from "./episode-content";
import type { DecodeIssue, Episode } from "./episode-content";
import { decodeManifest } from "./episode-manifest";
import type { EpisodeManifest, ManifestEntry } from "./episode-manifest";
import { sha256Hex, utf8Bytes } from "./sha256";
import { translationTablesOf } from "./episode-catalog-translations";

/**
 * 이 앱이 이해하는 콘텐츠 수준. 매니페스트 `min_client_level`이 이보다 크면 원격 항목을 잠급니다. 2는 막간 이야기
 * 유닛을 그리는 수준(ADR-0087 · ADR-0088), 3은 이야기 파이널(S8 `story` · 따라 쓰기 · 최상위 막간)을 그리는
 * 수준(ADR-0058 적용 기록 ⟨2026-11-02⟩), 4는 언어별 번역 파일을 읽는 수준이고(ADR-0102), `manifests/level-4.json`부터
 * 읽습니다.
 */
export const CONTENT_CLIENT_LEVEL = 4;
export const SUPPORTED_EPISODE_SCHEMAS: readonly string[] = ["delivery-2"];

export type LockReason =
  | "unsupported-schema"
  | "client-too-old"
  | "integrity-mismatch"
  | "decode-failed";
export type EpisodeSourceKind = "bundled" | "cache";

export type CatalogEntry =
  | {
      status: "ready";
      id: string;
      order: number;
      title: string;
      version: string;
      source: EpisodeSourceKind;
      episode: Episode;
      warnings: DecodeIssue[];
      /** 표지 일러스트 경로 — 이긴 항목의 `cover`, 없으면 같은 id 내장 항목의 값. */
      cover?: string;
    }
  | { status: "pending"; id: string; order: number; title: string; version: string }
  | {
      status: "locked";
      id: string;
      order: number;
      title: string;
      version: string;
      reason: LockReason;
    };

/** 저장소에서 읽은 원문 텍스트입니다. */
export type CatalogSourceText = {
  manifest: string | null;
  episodes: Readonly<Record<string, string>>;
  /** 저장된 언어별 번역 파일 원문(ADR-0102) — 에피소드 id → 언어 → 원문. 없으면 본문 안 표만 씁니다. */
  translations?: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

export type CatalogInput = {
  bundled: { manifest: EpisodeManifest; episodes: Readonly<Record<string, unknown>> };
  cache: CatalogSourceText;
};

/**
 * version 비교 — 숫자 조각은 수로, 문자 조각은 코드 단위로 차례로 비교합니다. 양수면 `a`가 높습니다.
 * Lynx 백그라운드(PrimJS)는 로케일 비교 메서드의 숫자 옵션을 무시하고 국제화 API도 없어서, 기기에서
 * `.10 < .9`가 되므로 쓰지 않습니다.
 */
export function compareVersions(a: string, b: string): number {
  const left = a.match(/(\d+)|(\D+)/g) ?? [];
  const right = b.match(/(\d+)|(\D+)/g) ?? [];
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i += 1) {
    const x = left[i] ?? "";
    const y = right[i] ?? "";
    const bothNumeric = /^\d/.test(x) && /^\d/.test(y);
    if (bothNumeric) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) {
        return diff < 0 ? -1 : 1;
      }
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return left.length === right.length ? 0 : left.length > right.length ? 1 : -1;
}

export type EpisodeTextCheck =
  | { ok: true; episode: Episode; warnings: DecodeIssue[] }
  | { ok: false; reason: "integrity-mismatch" | "decode-failed" };

/** 받은 원문을 매니페스트 항목의 해시 · 바이트로 검증하고 디코드합니다. 예외를 던지지 않습니다. */
export function checkEpisodeText(entry: ManifestEntry, text: string): EpisodeTextCheck {
  const bytes = utf8Bytes(text);
  if (bytes.length !== entry.bytes || sha256Hex(bytes) !== entry.sha256) {
    return { ok: false, reason: "integrity-mismatch" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "decode-failed" };
  }
  const decoded = decodeEpisode(parsed);
  if (!decoded.ok) {
    return { ok: false, reason: "decode-failed" };
  }
  return { ok: true, episode: decoded.episode, warnings: decoded.warnings };
}

/** 저장소에 남은 원격 매니페스트 원문을 디코드합니다. 손상이면 `null`. */
export function parseCachedManifest(text: string | null): EpisodeManifest | null {
  if (text === null) {
    return null;
  }
  try {
    const decoded = decodeManifest(JSON.parse(text));
    return decoded.ok ? decoded.manifest : null;
  } catch {
    return null;
  }
}

type Winner = { entry: ManifestEntry; fromRemote: boolean };

/** 같은 id는 높은 version이 이기고 같으면 내장입니다. */
function pickWinners(bundled: EpisodeManifest, remote: EpisodeManifest | null): Winner[] {
  const winners = new Map<string, Winner>();
  for (const entry of bundled.episodes) {
    winners.set(entry.id, { entry, fromRemote: false });
  }
  for (const entry of remote?.episodes ?? []) {
    const current = winners.get(entry.id);
    if (current === undefined || compareVersions(entry.version, current.entry.version) > 0) {
      winners.set(entry.id, { entry, fromRemote: true });
    }
  }
  return [...winners.values()];
}

function lockedEntry(entry: ManifestEntry, reason: LockReason): CatalogEntry {
  return {
    status: "locked",
    id: entry.id,
    order: entry.order,
    title: entry.title,
    version: entry.version,
    reason,
  };
}

function readyEntry(
  entry: ManifestEntry,
  source: EpisodeSourceKind,
  episode: Episode,
  warnings: DecodeIssue[],
  cover?: string,
): CatalogEntry {
  return {
    status: "ready",
    id: entry.id,
    order: entry.order,
    title: entry.title,
    version: entry.version,
    source,
    episode,
    warnings,
    ...(cover === undefined ? {} : { cover }),
  };
}

function pendingEntry(entry: ManifestEntry): CatalogEntry {
  return {
    status: "pending",
    id: entry.id,
    order: entry.order,
    title: entry.title,
    version: entry.version,
  };
}

/** 원격이 이겼지만 쓸 수 없을 때 같은 id의 내장본이 있으면 그것으로 엽니다(이미 열리던 에피소드를 닫지 않음). */
function bundledFallback(
  input: CatalogInput,
  bundled: ManifestEntry | undefined,
): CatalogEntry | null {
  if (bundled === undefined || !SUPPORTED_EPISODE_SCHEMAS.includes(bundled.schema)) {
    return null;
  }
  const decoded = decodeEpisode(input.bundled.episodes[bundled.id]);
  return decoded.ok
    ? readyEntry(bundled, "bundled", decoded.episode, decoded.warnings, bundled.cover)
    : null;
}

export function buildEpisodeCatalog(input: CatalogInput): CatalogEntry[] {
  const remote = parseCachedManifest(input.cache.manifest);
  const clientTooOld = remote !== null && (remote.minClientLevel ?? 0) > CONTENT_CLIENT_LEVEL;
  const bundledById = new Map(input.bundled.manifest.episodes.map((entry) => [entry.id, entry]));

  const entries = pickWinners(input.bundled.manifest, remote).map(
    ({ entry, fromRemote }): CatalogEntry => {
      const bundledEntry = bundledById.get(entry.id);
      const resolved = resolveEntry(
        input,
        entry,
        fromRemote,
        clientTooOld,
        coverOf(entry, bundledEntry),
      );
      if (fromRemote && resolved.status !== "ready") {
        return bundledFallback(input, bundledById.get(entry.id)) ?? resolved;
      }
      return resolved;
    },
  );

  return entries.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** 이긴 항목의 `cover`, 없으면 같은 id 내장 항목의 값 — 원격 매니페스트가 키를 안 적어도 내장 일러스트가 남습니다. */
function coverOf(entry: ManifestEntry, bundled: ManifestEntry | undefined): string | undefined {
  return entry.cover ?? bundled?.cover;
}

function resolveEntry(
  input: CatalogInput,
  entry: ManifestEntry,
  fromRemote: boolean,
  clientTooOld: boolean,
  cover: string | undefined,
): CatalogEntry {
  if (fromRemote && clientTooOld) {
    return lockedEntry(entry, "client-too-old");
  }
  if (!SUPPORTED_EPISODE_SCHEMAS.includes(entry.schema)) {
    return lockedEntry(entry, "unsupported-schema");
  }
  if (!fromRemote) {
    const decoded = decodeEpisode(input.bundled.episodes[entry.id]);
    return decoded.ok
      ? readyEntry(entry, "bundled", decoded.episode, decoded.warnings, cover)
      : lockedEntry(entry, "decode-failed");
  }
  const text = input.cache.episodes[entry.id];
  if (text === undefined) {
    return pendingEntry(entry);
  }
  const checked = checkEpisodeText(entry, text);
  if (!checked.ok) return lockedEntry(entry, checked.reason);
  // 이긴 원격 항목이 적은 언어의 저장 번역 파일로 그 언어 표를 바꿉니다(ADR-0102 D3).
  const episode = translationTablesOf(entry, checked.episode, input.cache.translations?.[entry.id]);
  return readyEntry(entry, "cache", episode, checked.warnings, cover);
}
