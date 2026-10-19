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

/**
 * 받아 둔 파일이 있으면 그 `file://` 주소, 없으면 원격 주소입니다. 경로는 화면이 쓰는 그대로 받습니다(선두
 * `content/` 허용) — 받을 때와 같은 규칙(`resolveContentUrlSafe`)으로 버킷 상대 경로를 내고, 규칙 밖이면 파일을
 * 찾지 않고 원격 규칙에 맡깁니다.
 */
export function localOrRemoteUrl(
  path: string,
  remoteUrlOf: (path: string) => string | null,
): string | null {
  const relative = resolveContentUrlSafe("", path);
  if (relative === null) return remoteUrlOf(path);
  return contentFileUrl(relative) ?? remoteUrlOf(path);
}
