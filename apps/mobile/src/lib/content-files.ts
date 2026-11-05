import "background-only";

// 받아 둔 콘텐츠 파일(이미지 · 음성) 접점입니다. 호스트 앱의 `ContentFileModule`을 감쌉니다 — 접점은
// 모듈마다 파일 하나입니다(ADR-0017 D3). 파일은 호스트가 받아 앱 전용 폴더에 둡니다 — 바이트가 JS를 지나지
// 않습니다(ADR-0071). 모듈이 없는 환경(Explorer · 테스트 · 옛 호스트)에서는 아무것도 받지 않습니다.
import type { DownloadResult } from "./episode-asset-sync";
import { resolveContentUrlSafe } from "./episode-remote";

interface ContentFileModule {
  download(url: string, path: string, callback: (payload: unknown) => void): void;
  fileUrl(path: string): string | null;
  remove(prefix: string, callback: (payload: unknown) => void): void;
  /** 원문의 SHA-256과 UTF-8 바이트 수 `"<sha>:<bytes>"`(ADR-0105 D4). 옛 호스트에는 없습니다. */
  sha256?(text: string): unknown;
}

function nativeModule(): ContentFileModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["ContentFileModule"] as
    | ContentFileModule
    | undefined;
  return module ?? undefined;
}

export function contentFilesAvailable(): boolean {
  return nativeModule() !== undefined;
}

/** 콜백 페이로드를 결과로 바꿉니다. 값은 호스트가 문자열로 싣습니다. 모르는 모양은 `io`입니다. */
export function downloadResultOf(payload: unknown): DownloadResult {
  if (payload === null || typeof payload !== "object") return { status: "io" };
  const { status, code } = payload as { status?: unknown; code?: unknown };
  switch (status) {
    case "saved":
      return { status: "saved" };
    case "http": {
      const parsed = Number(code);
      return Number.isInteger(parsed) ? { status: "http", code: parsed } : { status: "io" };
    }
    case "network":
    case "invalid":
    case "io":
      return { status };
    default:
      return { status: "io" };
  }
}

/** 던지지 않습니다. 모듈이 없으면 `unavailable`입니다. */
export function downloadContentFile(url: string, path: string): Promise<DownloadResult> {
  const host = nativeModule();
  if (host === undefined) return Promise.resolve({ status: "unavailable" });
  return new Promise((resolve) => {
    try {
      host.download(url, path, (payload) => resolve(downloadResultOf(payload)));
    } catch {
      resolve({ status: "io" });
    }
  });
}

/** 받아 둔 파일의 `file://` 주소입니다. 없거나 모듈이 없으면 `null`입니다. */
export function contentFileUrl(path: string): string | null {
  try {
    const url = nativeModule()?.fileUrl(path);
    return typeof url === "string" && url !== "" ? url : null;
  } catch {
    return null;
  }
}

const noBundledUrl = (): null => null;

/**
 * 받아 둔 파일의 `file://` 주소 → 앱에 실은 그림 주소 → 원격 주소 순입니다. 경로는 화면이 쓰는 그대로 받습니다
 * (선두 `content/` 허용) — 받을 때와 같은 규칙(`resolveContentUrlSafe`)으로 버킷 상대 경로를 내고, 규칙 밖이면
 * 파일도 내장도 찾지 않고 원격 규칙에 맡깁니다. 셋째 인자를 주지 않으면 내장은 없는 것입니다.
 */
export function localOrRemoteUrl(
  path: string,
  remoteUrlOf: (path: string) => string | null,
  bundledUrlOf: (relative: string) => string | null = noBundledUrl,
): string | null {
  const relative = resolveContentUrlSafe("", path);
  if (relative === null) return remoteUrlOf(path);
  return contentFileUrl(relative) ?? bundledUrlOf(relative) ?? remoteUrlOf(path);
}

const DIGEST_REPLY = /^([0-9a-f]{64}):(\d+)$/;

/**
 * 받은 본문의 SHA-256 · UTF-8 바이트 수를 호스트로 계산합니다(ADR-0105 D4) — JS 순수 구현은 JIT 없는 기기 엔진에서 본문
 * 한 편에 수백 ms가 걸렸습니다. 모듈 · 메서드가 없거나(옛 호스트) 답이 틀리거나 던지면 `null`이고, 부르는 쪽이 JS로
 * 계산합니다.
 */
export function nativeContentDigest(text: string): { sha256: string; bytes: number } | null {
  try {
    const module = nativeModule();
    if (typeof module?.sha256 !== "function") return null;
    const reply = module.sha256(text);
    const match = typeof reply === "string" ? DIGEST_REPLY.exec(reply) : null;
    if (match === null) return null;
    return { sha256: match[1] ?? "", bytes: Number(match[2]) };
  } catch {
    return null;
  }
}
